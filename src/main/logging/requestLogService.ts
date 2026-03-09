import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";

import log from "../utils/logger";
import { proxyManager } from "../proxy/manager";

export type RequestLogStatus = "success" | "error";

export interface RequestLogEntry {
  id: string;
  status: RequestLogStatus;
  statusCode: number;
  filePath: string;
  timestamp: string;
  time: string;
  method?: string;
  url?: string;
  provider?: string;
  model?: string;
  account?: string;
  userInput?: string;
  requestBody?: string;
  duration?: number;
}

export type RequestLogDiagnosticsStatus =
  | "ok"
  | "directory_empty"
  | "unrecognized_files"
  | "read_error";

export interface RequestLogDiagnostics {
  logDir: string;
  scannedDirs: string[];
  compatibilityLogDirs: string[];
  writablePath?: string;
  resolution: "writable_path" | "config_dir" | "auth_dir_fallback";
  status: RequestLogDiagnosticsStatus;
  error?: string;
  totalFiles: number;
  matchedFiles: number;
  parsedFiles: number;
  ignoredFiles: string[];
}

export interface RequestLogFetchResult {
  entries: RequestLogEntry[];
  diagnostics: RequestLogDiagnostics;
}

const SUCCESS_PREFIXES = ["v1-responses", "v1-messages", "v1-chat-completions"];
const ERROR_PREFIX = "error-v1";
const DIAGNOSTIC_FILE_LIMIT = 8;

interface ResolvedRequestLogDirectory {
  logDir: string;
  writablePath?: string;
  resolution: RequestLogDiagnostics["resolution"];
}

interface RequestLogDirectorySet {
  primary: ResolvedRequestLogDirectory;
  scannedDirs: string[];
  compatibilityLogDirs: string[];
}

interface RequestLogFileCandidate {
  filePath: string;
  mtime: number;
  status: RequestLogStatus;
}

function isSuccessLog(name: string): boolean {
  return SUCCESS_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export async function readRecentRequestLogs(
  limit = 50,
): Promise<RequestLogEntry[]> {
  const result = await fetchRecentRequestLogs(limit);
  return result.entries;
}

export async function fetchRecentRequestLogs(
  limit = 50,
): Promise<RequestLogFetchResult> {
  const directories = getRequestLogDirectories();
  const diagnostics: RequestLogDiagnostics = {
    logDir: directories.primary.logDir,
    scannedDirs: directories.scannedDirs,
    compatibilityLogDirs: directories.compatibilityLogDirs,
    writablePath: directories.primary.writablePath,
    resolution: directories.primary.resolution,
    status: "directory_empty",
    totalFiles: 0,
    matchedFiles: 0,
    parsedFiles: 0,
    ignoredFiles: [],
  };

  const readErrors: string[] = [];
  const candidates: RequestLogFileCandidate[] = [];

  for (const logDir of directories.scannedDirs) {
    const inspection = await inspectRequestLogDirectory(logDir);
    diagnostics.totalFiles += inspection.totalFiles;
    diagnostics.matchedFiles += inspection.matchedFiles;
    diagnostics.ignoredFiles.push(...inspection.ignoredFiles);
    candidates.push(...inspection.candidates);
    if (inspection.error) {
      readErrors.push(`${logDir}: ${inspection.error}`);
    }
  }

  diagnostics.ignoredFiles = diagnostics.ignoredFiles.slice(
    0,
    DIAGNOSTIC_FILE_LIMIT,
  );

  if (candidates.length === 0) {
    if (diagnostics.matchedFiles > 0 && readErrors.length > 0) {
      diagnostics.status = "read_error";
      diagnostics.error = readErrors.join(" | ");
    } else if (diagnostics.totalFiles > 0) {
      diagnostics.status = "unrecognized_files";
    } else if (readErrors.length > 0) {
      diagnostics.status = "read_error";
      diagnostics.error = readErrors.join(" | ");
    }

    return { entries: [], diagnostics };
  }

  try {
    const files = candidates.sort((a, b) => b.mtime - a.mtime).slice(0, limit);

    const entries: RequestLogEntry[] = [];

    for (const file of files) {
      const entry = await parseLogFile(file.filePath, file.status);
      if (entry) {
        entries.push(entry);
      }
    }

    diagnostics.parsedFiles = entries.length;
    diagnostics.status = entries.length > 0 ? "ok" : "unrecognized_files";
    if (entries.length === 0 && readErrors.length > 0) {
      diagnostics.status = "read_error";
      diagnostics.error = readErrors.join(" | ");
    }

    return { entries, diagnostics };
  } catch (error) {
    diagnostics.status = "read_error";
    diagnostics.error = String(error);
    log.error("[Logs] Failed to inspect request log directory:", error);
    return { entries: [], diagnostics };
  }
}

export async function deleteAllLogs(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { scannedDirs } = getRequestLogDirectories();
    let deletedCount = 0;

    for (const logDir of scannedDirs) {
      if (!fs.existsSync(logDir)) {
        continue;
      }

      const dirEntries = await fsp.readdir(logDir);
      const files = dirEntries.filter(
        (name) => isSuccessLog(name) || name.startsWith(ERROR_PREFIX),
      );

      await Promise.all(
        files.map((file) => fsp.unlink(path.join(logDir, file))),
      );
      deletedCount += files.length;
    }

    log.info(`[Logs] Deleted ${deletedCount} log files`);
    return { success: true };
  } catch (error) {
    log.error("[Logs] Failed to delete logs:", error);
    return { success: false, error: String(error) };
  }
}

function getRequestLogDirectories(): RequestLogDirectorySet {
  const primary = resolveRequestLogDirectory();
  const configLogDir = path.join(proxyManager.getConfigDir(), "logs");
  const config = proxyManager.loadConfigFromYaml();
  const authDir = expandHomeDir(
    config?.["auth-dir"] || proxyManager.getAuthDir(),
  );
  const authLogDir = path.join(authDir, "logs");

  const scannedDirs = Array.from(
    new Set([primary.logDir, configLogDir, authLogDir]),
  );

  return {
    primary,
    scannedDirs,
    compatibilityLogDirs: scannedDirs.filter((dir) => dir !== primary.logDir),
  };
}

function resolveRequestLogDirectory(): ResolvedRequestLogDirectory {
  const writablePath = getWritablePath();
  if (writablePath) {
    return {
      logDir: path.join(writablePath, "logs"),
      writablePath,
      resolution: "writable_path",
    };
  }

  const configDir = proxyManager.getConfigDir();
  if (isDirWritable(path.resolve("logs"))) {
    return {
      logDir: path.join(configDir, "logs"),
      resolution: "config_dir",
    };
  }

  const config = proxyManager.loadConfigFromYaml();
  const authDir = expandHomeDir(
    config?.["auth-dir"] || proxyManager.getAuthDir(),
  );
  return {
    logDir: path.join(authDir, "logs"),
    resolution: "auth_dir_fallback",
  };
}

async function inspectRequestLogDirectory(logDir: string): Promise<{
  totalFiles: number;
  matchedFiles: number;
  ignoredFiles: string[];
  candidates: RequestLogFileCandidate[];
  error?: string;
}> {
  if (!fs.existsSync(logDir)) {
    return {
      totalFiles: 0,
      matchedFiles: 0,
      ignoredFiles: [],
      candidates: [],
    };
  }

  try {
    const dirEntries = await fsp.readdir(logDir, { withFileTypes: true });
    const fileNames = dirEntries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
    const matchedNames = fileNames.filter(
      (name) => isSuccessLog(name) || name.startsWith(ERROR_PREFIX),
    );
    const ignoredFiles = fileNames
      .filter((name) => !matchedNames.includes(name))
      .map((name) => path.join(logDir, name));

    const fileStats = await Promise.allSettled(
      matchedNames.map(async (name) => {
        const filePath = path.join(logDir, name);
        const stat = await fsp.stat(filePath);
        const status: RequestLogStatus = isSuccessLog(name)
          ? "success"
          : "error";
        return { filePath, mtime: stat.mtimeMs, status };
      }),
    );

    const rejected = fileStats.find((result) => result.status === "rejected");

    return {
      totalFiles: fileNames.length,
      matchedFiles: matchedNames.length,
      ignoredFiles,
      candidates: fileStats.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      ),
      error:
        rejected?.status === "rejected" ? String(rejected.reason) : undefined,
    };
  } catch (error) {
    return {
      totalFiles: 0,
      matchedFiles: 0,
      ignoredFiles: [],
      candidates: [],
      error: String(error),
    };
  }
}

function getWritablePath(): string | undefined {
  for (const key of ["WRITABLE_PATH", "writable_path"]) {
    const value = process.env[key]?.trim();
    if (value) {
      return path.resolve(value);
    }
  }

  return undefined;
}

function expandHomeDir(dirPath: string): string {
  if (!dirPath.startsWith("~")) {
    return path.resolve(dirPath);
  }

  const remainder = dirPath.slice(1).replace(/^[/\\]+/, "");
  return path.join(os.homedir(), remainder);
}

function isDirWritable(dirPath: string): boolean {
  try {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return false;
    }

    const testFile = path.join(dirPath, `.linjun-perm-test-${process.pid}`);
    fs.writeFileSync(testFile, "", "utf-8");
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

async function parseLogFile(
  filePath: string,
  status: RequestLogStatus,
): Promise<RequestLogEntry | null> {
  try {
    const content = await fsp.readFile(filePath, "utf-8");
    const requestInfo = extractSection(content, "=== REQUEST INFO ===");
    const requestBodySection = extractSection(content, "=== REQUEST BODY ===");
    const apiRequestSection = findFirstApiRequestSection(content);
    const apiResponseSection = findFirstApiResponseSection(content);
    const responseSection = extractSection(content, "=== RESPONSE ===");

    if (!requestInfo && !requestBodySection) {
      return null;
    }

    const infoMap = parseKeyValueBlock(requestInfo);
    const apiRequestMap = parseApiRequestSection(apiRequestSection);
    const statusCode = extractStatusCode(responseSection, status);
    const timestamp = infoMap["Timestamp"] || "";
    const time = formatTime(timestamp);
    const rawProvider =
      apiRequestMap.provider || inferProviderFromUrl(apiRequestMap.upstreamUrl);
    const account = apiRequestMap.account;
    const duration = calculateDuration(apiRequestSection, apiResponseSection);
    const userInput = extractUserInput(requestBodySection);

    let model: string | undefined;
    if (requestBodySection) {
      try {
        const parsed = JSON.parse(requestBodySection);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.model === "string"
        ) {
          model = parsed.model;
        }
      } catch {
        // ignore json parsing error
      }
    }

    if (!model) {
      model = inferModelFromText(requestBodySection);
    }

    const provider = normalizeProvider(rawProvider, model);

    return {
      id: path.basename(filePath),
      status,
      statusCode,
      filePath,
      timestamp,
      time,
      method: infoMap["Method"],
      url: infoMap["URL"],
      provider,
      model,
      account,
      userInput,
      requestBody: requestBodySection || undefined,
      duration,
    };
  } catch (error) {
    log.error("[Logs] Failed to parse log file", filePath, error);
    return null;
  }
}

function extractSection(content: string, title: string): string {
  const startIndex = content.indexOf(title);
  if (startIndex === -1) return "";

  const contentStart = startIndex + title.length + 1;
  const nextSection = content.indexOf("\n===", contentStart);

  if (nextSection === -1) {
    return content.slice(contentStart).trim();
  }
  return content.slice(contentStart, nextSection).trim();
}

function findFirstApiRequestSection(content: string): string {
  const match = content.match(/=== API REQUEST \d+ ===/);
  if (!match) return "";
  return extractSection(content, match[0]);
}

function findFirstApiResponseSection(content: string): string {
  const match = content.match(/=== API RESPONSE \d+ ===/);
  if (!match) return "";
  return extractSection(content, match[0]);
}

function extractTimestampFromSection(section: string): string | undefined {
  if (!section) return undefined;
  const match = section.match(/Timestamp:\s*(.+)/);
  return match ? match[1].trim() : undefined;
}

function calculateDuration(
  requestSection: string,
  responseSection: string,
): number | undefined {
  const reqTime = extractTimestampFromSection(requestSection);
  const resTime = extractTimestampFromSection(responseSection);

  if (!reqTime || !resTime) return undefined;

  try {
    const reqDate = new Date(reqTime);
    const resDate = new Date(resTime);

    if (isNaN(reqDate.getTime()) || isNaN(resDate.getTime())) {
      return undefined;
    }

    const durationMs = resDate.getTime() - reqDate.getTime();
    return durationMs > 0 ? durationMs / 1000 : undefined;
  } catch {
    return undefined;
  }
}

function parseKeyValueBlock(block: string): Record<string, string> {
  const map: Record<string, string> = {};
  block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const idx = line.indexOf(":");
      if (idx > -1) {
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        map[key] = value;
      }
    });
  return map;
}

interface ApiRequestInfo {
  provider?: string;
  account?: string;
  upstreamUrl?: string;
}

function parseApiRequestSection(section: string): ApiRequestInfo {
  const result: ApiRequestInfo = {};
  if (!section) return result;

  const lines = section.split(/\r?\n/).map((line) => line.trim());

  for (const line of lines) {
    if (line.startsWith("Auth:")) {
      const providerMatch = line.match(/provider=([^,\s]+)/);
      if (providerMatch) result.provider = providerMatch[1];

      const labelMatch = line.match(/label=([^,\s]+)/);
      if (labelMatch) result.account = labelMatch[1];
    }

    if (line.startsWith("Upstream URL:")) {
      result.upstreamUrl = line.replace("Upstream URL:", "").trim();
    }
  }

  return result;
}

function inferProviderFromUrl(url?: string): string | undefined {
  if (!url) return undefined;

  const urlLower = url.toLowerCase();

  if (urlLower.includes("chatgpt.com") || urlLower.includes("openai.com")) {
    return "OpenAI";
  }
  if (urlLower.includes("anthropic.com") || urlLower.includes("claude.ai")) {
    return "Claude";
  }
  if (
    urlLower.includes("googleapis.com") ||
    urlLower.includes("generativelanguage")
  ) {
    return "Gemini";
  }
  if (urlLower.includes("github.com") || urlLower.includes("copilot")) {
    return "Copilot";
  }
  if (urlLower.includes("qwen") || urlLower.includes("dashscope")) {
    return "Qwen";
  }

  return undefined;
}

function normalizeProvider(
  provider?: string,
  model?: string,
): string | undefined {
  if (!provider && !model) return undefined;

  const p = provider?.toLowerCase() || "";
  const m = model?.toLowerCase() || "";

  if (
    p === "codex" ||
    m.includes("gpt") ||
    m.includes("o1") ||
    m.includes("o3")
  ) {
    return "OpenAI";
  }

  if (p === "claude" || m.includes("claude")) {
    return "Claude";
  }

  if (p === "gemini" || m.includes("gemini")) {
    return "Gemini";
  }

  return provider;
}

function inferModelFromText(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/"model"\s*:\s*"([^"]+)"/);
  return match ? match[1] : undefined;
}

function extractUserInput(requestBody: string): string | undefined {
  if (!requestBody) return undefined;

  try {
    const parsed = JSON.parse(requestBody) as Record<string, unknown>;
    const candidates: string[] = [];

    collectUserInputFromMessages(parsed.input, candidates);
    collectUserInputFromMessages(parsed.messages, candidates);

    if (typeof parsed.prompt === "string") {
      const normalizedPrompt = normalizeInputText(parsed.prompt);
      if (normalizedPrompt) {
        candidates.push(normalizedPrompt);
      }
    }

    if (candidates.length === 0) {
      return undefined;
    }

    const latestInput = candidates[candidates.length - 1];
    return truncateUserInput(latestInput, 200);
  } catch {
    return undefined;
  }
}

function collectUserInputFromMessages(
  messages: unknown,
  candidates: string[],
): void {
  if (!Array.isArray(messages)) return;

  for (const message of messages) {
    if (!message || typeof message !== "object") continue;

    const messageRecord = message as Record<string, unknown>;
    if (messageRecord.role !== "user") continue;

    collectUserInputFromContent(messageRecord.content, candidates);
  }
}

function collectUserInputFromContent(
  content: unknown,
  candidates: string[],
): void {
  if (typeof content === "string") {
    const normalized = normalizeInputText(content);
    if (normalized) {
      candidates.push(normalized);
    }
    return;
  }

  if (!Array.isArray(content)) return;

  for (const item of content) {
    if (typeof item === "string") {
      const normalized = normalizeInputText(item);
      if (normalized) {
        candidates.push(normalized);
      }
      continue;
    }

    if (!item || typeof item !== "object") continue;

    const contentRecord = item as Record<string, unknown>;
    const contentType =
      typeof contentRecord.type === "string" ? contentRecord.type : "";

    if (contentType !== "input_text" && contentType !== "text") continue;

    if (typeof contentRecord.text === "string") {
      const normalized = normalizeInputText(contentRecord.text);
      if (normalized) {
        candidates.push(normalized);
      }
    }
  }
}

function normalizeInputText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateUserInput(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function extractStatusCode(
  responseSection: string,
  status: RequestLogStatus,
): number {
  if (!responseSection) {
    return status === "success" ? 200 : 500;
  }
  const statusLine = responseSection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("Status:"));

  if (statusLine) {
    const match = statusLine.match(/Status:\s*(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return status === "success" ? 200 : 500;
}

function formatTime(timestamp: string): string {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}
