import axios from "axios";

import { managementAPI } from "../proxy/api";
import log from "../utils/logger";
import { TokenReadResult } from "./tokenReader";

const KIRO_USAGE_URL =
  "https://codewhisperer.us-east-1.amazonaws.com/getUsageLimits?isEmailRequired=true&origin=AI_EDITOR";
const KIRO_REFRESH_URL =
  "https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken";
const KIRO_USER_AGENT =
  "aws-sdk-js/3.0.0 KiroIDE-0.1.0 os/macos lang/js md/nodejs/18.0.0";
const KIRO_AMZ_USER_AGENT = "aws-sdk-js/3.0.0";
const KIRO_REFRESH_MAX_ATTEMPTS = 3;
const KIRO_REFRESH_WINDOW_MS = 10 * 60 * 1000;
const KIRO_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

function formatKiroErrorForLog(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const parts: string[] = [];
    if (status) parts.push(`HTTP ${status}`);
    parts.push(error.message);

    const data = error.response?.data;
    const serverMessage =
      typeof data === "string"
        ? data
        : typeof data === "object" && data && "message" in data
          ? (data as { message?: unknown }).message
          : undefined;

    if (typeof serverMessage === "string" && serverMessage.trim()) {
      parts.push(serverMessage.trim());
    }

    return parts.join(": ");
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseNestedManagementPayload(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error("Invalid management api-call payload for Kiro usage");
  }
}

function extractKiroErrorDetail(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
      return extractKiroErrorDetail(JSON.parse(trimmed) as unknown) || trimmed;
    } catch {
      return trimmed;
    }
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (typeof value.message === "string" && value.message.trim()) {
    return value.message.trim();
  }

  if (typeof value.error === "string" && value.error.trim()) {
    return value.error.trim();
  }

  if (typeof value.detail === "string" && value.detail.trim()) {
    return value.detail.trim();
  }

  if (isRecord(value.error)) {
    if (typeof value.error.message === "string" && value.error.message.trim()) {
      return value.error.message.trim();
    }

    if (typeof value.error.detail === "string" && value.error.detail.trim()) {
      return value.error.detail.trim();
    }
  }

  return undefined;
}

function isKiroUsageResponse(value: unknown): value is KiroUsageResponse {
  return (
    isRecord(value) &&
    ("usageBreakdownList" in value ||
      "subscriptionInfo" in value ||
      "userInfo" in value ||
      "nextDateReset" in value)
  );
}

function _getAssumedKiroExpiresAt(): string {
  return new Date(Date.now() + KIRO_ACCESS_TOKEN_TTL_MS).toISOString();
}

const kiroRefreshAttempts = new Map<
  string,
  { count: number; firstAttemptAt: number }
>();

function canAttemptKiroRefresh(filePath: string): boolean {
  const now = Date.now();
  const record = kiroRefreshAttempts.get(filePath);
  if (!record) return true;
  if (now - record.firstAttemptAt > KIRO_REFRESH_WINDOW_MS) {
    kiroRefreshAttempts.delete(filePath);
    return true;
  }
  return record.count < KIRO_REFRESH_MAX_ATTEMPTS;
}

export function isKiroRefreshBlocked(filePath: string): boolean {
  return !canAttemptKiroRefresh(filePath);
}

function _recordKiroRefreshAttempt(filePath: string, success: boolean): void {
  if (success) {
    kiroRefreshAttempts.delete(filePath);
    return;
  }
  const now = Date.now();
  const record = kiroRefreshAttempts.get(filePath);
  if (!record || now - record.firstAttemptAt > KIRO_REFRESH_WINDOW_MS) {
    kiroRefreshAttempts.set(filePath, { count: 1, firstAttemptAt: now });
    return;
  }
  kiroRefreshAttempts.set(filePath, {
    count: record.count + 1,
    firstAttemptAt: record.firstAttemptAt,
  });
}

export interface KiroUsageEntry {
  displayName: string;
  displayNamePlural?: string;
  resourceType: string;
  unit?: string;
  currentUsageWithPrecision?: number;
  usageLimitWithPrecision?: number;
  nextDateReset?: number;
  freeTrialInfo?: {
    currentUsageWithPrecision?: number;
    usageLimitWithPrecision?: number;
    freeTrialExpiry?: number;
  };
}

export interface KiroUsageResponse {
  daysUntilReset?: number;
  nextDateReset?: number;
  usageBreakdownList?: KiroUsageEntry[];
  subscriptionInfo?: {
    subscriptionTitle?: string;
    type?: string;
  };
  userInfo?: {
    email?: string;
  };
}

export interface KiroRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: string;
  error?: string;
}

async function _refreshKiroToken(refreshToken: string): Promise<string> {
  const response = await axios.post(
    KIRO_REFRESH_URL,
    { refreshToken },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    },
  );

  return response.data?.accessToken;
}

async function fetchKiroUsage(accessToken: string): Promise<KiroUsageResponse> {
  const response = await axios.get<KiroUsageResponse>(KIRO_USAGE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": KIRO_USER_AGENT,
      "x-amz-user-agent": KIRO_AMZ_USER_AGENT,
    },
    timeout: 30000,
  });

  return response.data;
}

function extractKiroUsageFromManagementPayload(
  payload: unknown,
): KiroUsageResponse {
  const parsedPayload = parseNestedManagementPayload(payload);

  if (!isRecord(parsedPayload)) {
    throw new Error("Invalid management api-call payload for Kiro usage");
  }

  const objectPayload = parsedPayload;

  const statusCode =
    typeof objectPayload.status_code === "number"
      ? objectPayload.status_code
      : typeof objectPayload.statusCode === "number"
        ? objectPayload.statusCode
        : undefined;
  if (statusCode && statusCode >= 400) {
    const detail = extractKiroErrorDetail(objectPayload.body);
    throw new Error(
      detail
        ? `Kiro usage request failed (${statusCode}): ${detail}`
        : `Kiro usage request failed (${statusCode})`,
    );
  }

  if (objectPayload.success === false) {
    throw new Error(
      typeof objectPayload.error === "string"
        ? objectPayload.error
        : "Kiro management api-call failed",
    );
  }

  const bodyPayload =
    objectPayload.body !== undefined
      ? parseNestedManagementPayload(objectPayload.body)
      : undefined;
  if (isKiroUsageResponse(bodyPayload)) {
    return bodyPayload;
  }

  const dataPayload =
    objectPayload.data !== undefined
      ? parseNestedManagementPayload(objectPayload.data)
      : undefined;
  if (isKiroUsageResponse(dataPayload)) {
    return dataPayload;
  }

  if (isKiroUsageResponse(objectPayload)) {
    return objectPayload;
  }

  throw new Error("Unexpected Kiro usage payload from management api-call");
}

async function fetchKiroUsageViaManagement(
  authIndex: string,
): Promise<KiroUsageResponse> {
  const payload = await managementAPI.callManagementApi({
    method: "GET",
    url: KIRO_USAGE_URL,
    authIndex,
    header: {
      Authorization: "Bearer $TOKEN$",
      "User-Agent": KIRO_USER_AGENT,
      "x-amz-user-agent": KIRO_AMZ_USER_AGENT,
    },
  });

  return extractKiroUsageFromManagementPayload(payload);
}

export async function getKiroUsage(
  token: TokenReadResult,
): Promise<KiroUsageResponse> {
  if (token.authIndex) {
    return await fetchKiroUsageViaManagement(token.authIndex);
  }

  return await fetchKiroUsage(token.accessToken);
}

export async function isKiroTokenValid(
  token: TokenReadResult,
): Promise<boolean> {
  try {
    await getKiroUsage(token);
    return true;
  } catch (error) {
    log.warn(
      `[Kiro] Token validation failed for ${token.filePath}: ${formatKiroErrorForLog(error)}`,
    );
    return false;
  }
}

export async function refreshKiroTokenManually(
  token: TokenReadResult,
): Promise<KiroRefreshResult> {
  if (token.authIndex) {
    try {
      await fetchKiroUsageViaManagement(token.authIndex);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: formatKiroErrorForLog(error),
      };
    }
  }

  try {
    await fetchKiroUsage(token.accessToken);
    return {
      success: false,
      error:
        "Kiro refresh is managed by CLIProxyAPIPlus. Re-import token via management auth-files if needed.",
    };
  } catch (error) {
    log.error(
      "[Kiro] Manual refresh is disabled:",
      formatKiroErrorForLog(error),
    );
    return {
      success: false,
      error:
        "Kiro refresh is managed by CLIProxyAPIPlus. Re-import token via management auth-files if needed.",
    };
  }
}
