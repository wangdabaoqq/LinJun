import fs from "node:fs";
import fsp from "node:fs/promises";
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

export interface RequestLogFetchOptions {
  directoryOverride?: {
    primaryLogDir: string;
    scannedDirs?: string[];
    compatibilityLogDirs?: string[];
    writablePath?: string;
    resolution?: RequestLogDiagnostics["resolution"];
  };
}

const SUCCESS_PREFIXES = ["v1-responses", "v1-messages", "v1-chat-completions"];
const ERROR_PREFIX = "error-v1";
const DIAGNOSTIC_FILE_LIMIT = 8;
const MAX_RECENT_REQUEST_LOGS = 100;
const REQUEST_LOG_DIRECTORY_OVERRIDE_KEY =
  "__LINJUN_REQUEST_LOG_DIRECTORY_OVERRIDE__" as const;
// File name substrings that indicate non-conversation log files (token counting, etc.)
const IGNORED_LOG_SUBSTRINGS = ["count_tokens", "token_count"];
const INTERNAL_USER_INPUT_PATTERNS = [
  /^warmup\b/i,
  /^please write a \d+\s*(?:-|to)\s*\d+\s+word title for the following\b/i,
  /^\[suggestion mode:\s*/i,
  /^<system-reminder>/i,
  /<system-reminder>/i,
  /^<environment_context>/i,
  /^<permissions\b/i,
  /^<collaboration_mode>/i,
  /^# AGENTS\.md/i,
  /^# .+\.md\b/i,
];

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
  if (IGNORED_LOG_SUBSTRINGS.some((sub) => name.includes(sub))) return false;
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
  options?: RequestLogFetchOptions,
): Promise<RequestLogFetchResult> {
  const safeLimit = normalizeLogFetchLimit(limit);
  const directories = buildRequestLogDirectories(
    options?.directoryOverride || getRequestLogDirectoryOverrideFromGlobal(),
  );
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
    const files = candidates
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, safeLimit);

    const parsedEntries: RequestLogEntry[] = [];

    for (const file of files) {
      const entry = await parseLogFile(file.filePath, file.status);
      if (entry) {
        parsedEntries.push(entry);
      }
    }

    const entries = dedupeRequestLogEntries(parsedEntries);

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

function normalizeLogFetchLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 50;
  }

  return Math.max(0, Math.min(Math.floor(limit), MAX_RECENT_REQUEST_LOGS));
}

function getRequestLogDirectoryOverrideFromGlobal():
  | RequestLogFetchOptions["directoryOverride"]
  | undefined {
  const globalRecord = globalThis as Record<string, unknown>;
  const rawValue = globalRecord[REQUEST_LOG_DIRECTORY_OVERRIDE_KEY];
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return undefined;
  }

  const override = rawValue as RequestLogFetchOptions["directoryOverride"];
  if (!override?.primaryLogDir || typeof override.primaryLogDir !== "string") {
    return undefined;
  }

  return override;
}

function buildRequestLogDirectories(
  directoryOverride?: RequestLogFetchOptions["directoryOverride"],
): RequestLogDirectorySet {
  if (!directoryOverride) {
    return getRequestLogDirectories();
  }

  const primaryLogDir = path.resolve(directoryOverride.primaryLogDir);
  const scannedDirs = Array.from(
    new Set(
      (directoryOverride.scannedDirs || [primaryLogDir]).map((dir) =>
        path.resolve(dir),
      ),
    ),
  );

  if (!scannedDirs.includes(primaryLogDir)) {
    scannedDirs.unshift(primaryLogDir);
  }

  const compatibilityLogDirs = directoryOverride.compatibilityLogDirs
    ? Array.from(
        new Set(
          directoryOverride.compatibilityLogDirs
            .map((dir) => path.resolve(dir))
            .filter((dir) => dir !== primaryLogDir),
        ),
      )
    : scannedDirs.filter((dir) => dir !== primaryLogDir);

  return {
    primary: {
      logDir: primaryLogDir,
      writablePath: directoryOverride.writablePath,
      resolution: directoryOverride.resolution || "writable_path",
    },
    scannedDirs,
    compatibilityLogDirs,
  };
}

function dedupeRequestLogEntries(
  entries: RequestLogEntry[],
): RequestLogEntry[] {
  // Group entries that share the same userInput (or both empty) within a
  // 60-second window.  These are almost always CLIProxyAPI retries /
  // failover attempts for the same original request.
  // From each group, keep only the "best" entry (prefer 2xx, then lowest code).

  const WINDOW_MS = 60_000;

  interface Group {
    best: RequestLogEntry;
    latestTs: number;
  }

  const groups: Group[] = [];

  for (const entry of entries) {
    const ts = parseTimestampMs(entry.timestamp);
    const key = entry.userInput ?? "";

    // Try to find an existing group this entry belongs to
    let matched = false;
    for (const group of groups) {
      const groupKey = group.best.userInput ?? "";
      if (groupKey !== key) continue;
      if (Math.abs(ts - group.latestTs) > WINDOW_MS) continue;

      // Same userInput within window → pick the better entry
      group.latestTs = Math.max(group.latestTs, ts);
      if (isBetterEntry(entry, group.best)) {
        group.best = entry;
      }
      matched = true;
      break;
    }

    if (!matched) {
      groups.push({ best: entry, latestTs: ts });
    }
  }

  return groups.map((g) => g.best);
}

function parseTimestampMs(timestamp: string): number {
  if (!timestamp) return 0;
  try {
    const ms = new Date(timestamp).getTime();
    return isNaN(ms) ? 0 : ms;
  } catch {
    return 0;
  }
}

/** Return true if `a` is a better representative entry than `b`. */
function isBetterEntry(a: RequestLogEntry, b: RequestLogEntry): boolean {
  const aOk = a.statusCode >= 200 && a.statusCode < 300;
  const bOk = b.statusCode >= 200 && b.statusCode < 300;
  // Prefer success over failure
  if (aOk && !bOk) return true;
  if (!aOk && bOk) return false;
  // Both same success/fail category → prefer the one with a lower status code
  return a.statusCode < b.statusCode;
}

export async function deleteAllLogs(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { scannedDirs } = getRequestLogDirectories();
    let deletedCount = 0;

    for (const logDir of scannedDirs) {
      let dirEntries: string[];
      try {
        dirEntries = await fsp.readdir(logDir);
      } catch (error) {
        if (isDirectoryMissingError(error)) {
          continue;
        }
        throw error;
      }

      if (dirEntries.length === 0) {
        continue;
      }

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
    new Set([
      primary.logDir,
      ...(primary.writablePath ? [primary.writablePath] : []),
      configLogDir,
      authLogDir,
    ]),
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
    if (isDirectoryMissingError(error)) {
      return {
        totalFiles: 0,
        matchedFiles: 0,
        ignoredFiles: [],
        candidates: [],
      };
    }

    return {
      totalFiles: 0,
      matchedFiles: 0,
      ignoredFiles: [],
      candidates: [],
      error: String(error),
    };
  }
}

function isDirectoryMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error && typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code || ""
      : "";

  return code === "ENOENT" || code === "ENOTDIR";
}

function getWritablePath(): string | undefined {
  for (const key of ["WRITABLE_PATH", "writable_path"]) {
    const value = process.env[key]?.trim();
    if (value) {
      return expandHomeDir(value);
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

    // Skip non-conversation requests early (before doing expensive parsing)
    if (requestBodySection && isNonConversationRequest(requestBodySection)) {
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
  if (urlLower.includes("github.com")) {
    return "GitHub";
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

/**
 * Detect non-conversation requests that should be excluded from the log list
 * entirely (MCP tool probes, warmup, title generation, suggestion mode, etc.)
 */
function isNonConversationRequest(requestBody: string): boolean {
  try {
    const parsed = JSON.parse(requestBody) as Record<string, unknown>;

    // MCP tool probe: max_tokens=1 with tools array
    if (parsed.max_tokens === 1) return true;

    // Check prompt field for internal patterns
    if (typeof parsed.prompt === "string") {
      const normalized = normalizeInputText(parsed.prompt);
      if (/^warmup\b/i.test(normalized)) return true;
    }

    // Check the last user message for internal patterns
    const messages =
      (parsed.messages as unknown[]) || (parsed.input as unknown[]);
    if (!Array.isArray(messages)) return false;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i] as Record<string, unknown> | null;
      if (!msg || msg.role !== "user") continue;

      const text = getFirstUserText(msg.content);
      if (!text) continue;

      const normalized = normalizeInputText(text);

      // Warmup probe
      if (/^warmup\b/i.test(normalized)) return true;
      // Title generation
      if (
        /^please write a \d+\s*(?:-|to)\s*\d+\s+word title for the following\b/i.test(
          normalized,
        )
      )
        return true;
      // Suggestion mode
      if (/^\[suggestion mode:\s*/i.test(normalized)) return true;

      // This is the last user message and it's not internal → real conversation
      break;
    }

    return false;
  } catch {
    return false;
  }
}

function getFirstUserText(content: unknown): string | undefined {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return undefined;
  for (const item of content) {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const block = item as Record<string, unknown>;
      if (
        (block.type === "text" || block.type === "input_text") &&
        typeof block.text === "string"
      ) {
        return block.text;
      }
    }
  }
  return undefined;
}

function extractUserInput(requestBody: string): string | undefined {
  if (!requestBody) return undefined;

  try {
    const parsed = JSON.parse(requestBody) as Record<string, unknown>;

    // Skip MCP tool probe requests (e.g. Claude Code sending "count" with max_tokens:1
    // to verify each MCP tool definition — these are not real user conversations)
    if (parsed.max_tokens === 1) return undefined;

    // Try v1-responses format (OpenAI): parsed.input array with input_text blocks
    const fromInput = extractFromLastUserMessage(parsed.input, "input_text");
    if (fromInput) return truncateUserInput(fromInput, 200);

    // Try v1-messages format (Anthropic): parsed.messages array with text blocks
    const fromMessages = extractFromLastUserMessage(parsed.messages, "text");
    if (fromMessages) return truncateUserInput(fromMessages, 200);

    // Fallback: prompt field
    if (typeof parsed.prompt === "string") {
      const normalizedPrompt = normalizeInputText(parsed.prompt);
      if (normalizedPrompt && !isInternalUserInput(normalizedPrompt)) {
        return truncateUserInput(normalizedPrompt, 200);
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Find the last role:"user" message in the array, then extract real user input
 * from its content blocks. Searches from the end of the array backwards.
 */
function extractFromLastUserMessage(
  messages: unknown,
  preferredContentType: "input_text" | "text",
): string | undefined {
  if (!Array.isArray(messages)) return undefined;

  // Iterate from last to first to find the last user message with real input
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message || typeof message !== "object") continue;

    const messageRecord = message as Record<string, unknown>;
    if (messageRecord.role !== "user") continue;

    const result = extractRealInputFromContent(
      messageRecord.content,
      preferredContentType,
    );
    if (result) return result;
  }

  return undefined;
}

/**
 * Extract real user input from a single message's content.
 *
 * Strategy:
 * 1. If content is a plain string and not internal → return it directly
 * 2. If content is an array of blocks:
 *    a. Prefer blocks that have cache_control (marks real user input in v1-messages)
 *    b. Otherwise pick the last non-internal block of the preferred type
 *    c. Fall back to any last non-internal text block
 */
function extractRealInputFromContent(
  content: unknown,
  preferredContentType: "input_text" | "text",
): string | undefined {
  // Plain string content (e.g. messages:[{role:"user",content:"hi"}])
  if (typeof content === "string") {
    const normalized = normalizeInputText(content);
    if (normalized && !isInternalUserInput(normalized)) {
      return normalized;
    }
    return undefined;
  }

  if (!Array.isArray(content)) return undefined;

  let cacheControlCandidate: string | undefined;
  let preferredCandidate: string | undefined;
  let fallbackCandidate: string | undefined;

  for (const item of content) {
    if (typeof item === "string") {
      const normalized = normalizeInputText(item);
      if (normalized && !isInternalUserInput(normalized)) {
        fallbackCandidate = normalized;
      }
      continue;
    }

    if (!item || typeof item !== "object") continue;

    const block = item as Record<string, unknown>;
    const blockType = typeof block.type === "string" ? block.type : "";

    if (blockType !== "input_text" && blockType !== "text") continue;
    if (typeof block.text !== "string") continue;

    const normalized = normalizeInputText(block.text);
    if (!normalized || isInternalUserInput(normalized)) continue;

    // cache_control is a strong signal that this block is real user input
    // (Claude Code / v1-messages attaches cache_control to the actual user text)
    if (block.cache_control && typeof block.cache_control === "object") {
      cacheControlCandidate = normalized;
    }

    if (blockType === preferredContentType) {
      preferredCandidate = normalized;
    } else {
      fallbackCandidate = normalized;
    }
  }

  // Priority: cache_control marked block > preferred type > any text block
  return cacheControlCandidate || preferredCandidate || fallbackCandidate;
}

function isInternalUserInput(value: string): boolean {
  return INTERNAL_USER_INPUT_PATTERNS.some((pattern) => pattern.test(value));
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
