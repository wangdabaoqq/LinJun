import fs from "fs";
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

const SUCCESS_PREFIXES = ["v1-responses", "v1-messages", "v1-chat-completions"];
const ERROR_PREFIX = "error-v1";

function isSuccessLog(name: string): boolean {
  return SUCCESS_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function readRecentRequestLogs(limit = 50): RequestLogEntry[] {
  const configDir = proxyManager.getConfigDir();
  const logDir = path.join(configDir, "logs");

  if (!fs.existsSync(logDir)) {
    return [];
  }

  const files = fs
    .readdirSync(logDir)
    .filter((name) => isSuccessLog(name) || name.startsWith(ERROR_PREFIX))
    .map((name) => {
      const filePath = path.join(logDir, name);
      const stat = fs.statSync(filePath);
      const status: RequestLogStatus = isSuccessLog(name) ? "success" : "error";
      return { filePath, mtime: stat.mtimeMs, status };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit);

  const entries: RequestLogEntry[] = [];

  for (const file of files) {
    const entry = parseLogFile(file.filePath, file.status);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

export function deleteAllLogs(): { success: boolean; error?: string } {
  try {
    const configDir = proxyManager.getConfigDir();
    const logDir = path.join(configDir, "logs");

    if (!fs.existsSync(logDir)) {
      return { success: true };
    }

    const files = fs
      .readdirSync(logDir)
      .filter((name) => isSuccessLog(name) || name.startsWith(ERROR_PREFIX));

    for (const file of files) {
      fs.unlinkSync(path.join(logDir, file));
    }

    log.info(`[Logs] Deleted ${files.length} log files`);
    return { success: true };
  } catch (error) {
    log.error("[Logs] Failed to delete logs:", error);
    return { success: false, error: String(error) };
  }
}

function parseLogFile(
  filePath: string,
  status: RequestLogStatus,
): RequestLogEntry | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
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
