import axios from "axios";

import log from "../utils/logger";
import { TokenReadResult, updateTokenFile } from "./tokenReader";

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

function getAssumedKiroExpiresAt(): string {
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

function recordKiroRefreshAttempt(filePath: string, success: boolean): void {
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

async function refreshKiroToken(refreshToken: string): Promise<string> {
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

export async function getKiroUsage(
  token: TokenReadResult,
): Promise<KiroUsageResponse> {
  try {
    return await fetchKiroUsage(token.accessToken);
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      if (!canAttemptKiroRefresh(token.filePath)) {
        log.warn(
          `[Kiro] Refresh retry limit reached for ${token.filePath}. Skipping refresh.`,
        );
        throw new Error("Kiro refresh retry limit reached");
      }
      try {
        const newAccessToken = await refreshKiroToken(token.refreshToken);
        if (!newAccessToken) {
          recordKiroRefreshAttempt(token.filePath, false);
          throw new Error("Failed to refresh Kiro access token");
        }

        const usage = await fetchKiroUsage(newAccessToken);
        const expiresAt = getAssumedKiroExpiresAt();

        await updateTokenFile(token.filePath, {
          // Keep both schemas in sync (cliproxy uses snake_case;
          // older imports and our UI may still produce camelCase).
          access_token: newAccessToken,
          accessToken: newAccessToken,
          expires_at: expiresAt,
          expiresAt: expiresAt,
        });
        recordKiroRefreshAttempt(token.filePath, true);
        return usage;
      } catch (refreshError) {
        recordKiroRefreshAttempt(token.filePath, false);
        throw refreshError;
      }
    }

    throw error;
  }
}

export async function isKiroTokenValid(
  token: TokenReadResult,
): Promise<boolean> {
  try {
    await fetchKiroUsage(token.accessToken);
    return true;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      if (!canAttemptKiroRefresh(token.filePath)) {
        log.warn(
          `[Kiro] Refresh retry limit reached for ${token.filePath}. Skipping validation refresh.`,
        );
        return false;
      }
      try {
        const newAccessToken = await refreshKiroToken(token.refreshToken);
        if (!newAccessToken) {
          recordKiroRefreshAttempt(token.filePath, false);
          return false;
        }

        await fetchKiroUsage(newAccessToken);
        const expiresAt = getAssumedKiroExpiresAt();
        await updateTokenFile(token.filePath, {
          access_token: newAccessToken,
          accessToken: newAccessToken,
          expires_at: expiresAt,
          expiresAt: expiresAt,
        });
        recordKiroRefreshAttempt(token.filePath, true);
        return true;
      } catch (refreshError) {
        recordKiroRefreshAttempt(token.filePath, false);
        log.warn(
          `[Kiro] Validation refresh failed for ${token.filePath}: ${formatKiroErrorForLog(refreshError)}`,
        );
        return false;
      }
    }
    return false;
  }
}

export async function refreshKiroTokenManually(
  token: TokenReadResult,
): Promise<KiroRefreshResult> {
  try {
    const newAccessToken = await refreshKiroToken(token.refreshToken);
    if (!newAccessToken) {
      return { success: false, error: "Failed to get new access token" };
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await updateTokenFile(token.filePath, {
      access_token: newAccessToken,
      accessToken: newAccessToken,
      expires_at: expiresAt,
      expiresAt: expiresAt,
    });

    log.info(`[Kiro] Token refreshed successfully: ${token.filePath}`);
    return { success: true, accessToken: newAccessToken, expiresAt };
  } catch (error) {
    log.error("[Kiro] Failed to refresh token:", formatKiroErrorForLog(error));
    return {
      success: false,
      error: formatKiroErrorForLog(error),
    };
  }
}
