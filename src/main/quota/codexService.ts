import axios from "axios";

import { managementAPI } from "../proxy/api";
import log from "../utils/logger";
import { TokenReadResult, updateTokenFile } from "./tokenReader";

const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const OPENAI_TOKEN_URL = "https://auth.openai.com/oauth/token";
const CHATGPT_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";

export interface CodexRateLimitWindow {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds: number;
  reset_at: number;
}

export interface CodexRateLimit {
  allowed: boolean;
  limit_reached: boolean;
  primary_window: CodexRateLimitWindow;
  secondary_window: CodexRateLimitWindow | null;
}

export interface CodexUsageResponse {
  plan_type?: string;
  rate_limit: CodexRateLimit;
  code_review_rate_limit: CodexRateLimit;
  credits: {
    has_credits: boolean;
    unlimited: boolean;
    balance: string;
    approx_local_messages: number[];
    approx_cloud_messages: number[];
  };
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

function getAxios404Debug(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "";
  }

  const url = error.config?.url || "unknown-url";
  const status = error.response?.status;
  const data = error.response?.data;
  let body = "";
  if (typeof data === "string") {
    body = data;
  } else if (data && typeof data === "object") {
    try {
      body = JSON.stringify(data);
    } catch {
      body = "[unserializable-response-data]";
    }
  }

  const bodyShort = body ? body.slice(0, 240) : "";
  return `url=${url} status=${status}${bodyShort ? ` body=${bodyShort}` : ""}`;
}

function isCodexUnauthorizedError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return true;
    }
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("codex usage request failed (401)") ||
    message.includes("token_invalidated") ||
    message.includes("authentication token has been invalidated") ||
    message.includes("unauthorized")
  );
}

async function markCodexTokenExpired(token: TokenReadResult): Promise<void> {
  const expiredAt = new Date(Date.now() - 1000).toISOString();
  const marked = await updateTokenFile(token.filePath, { expired: expiredAt });
  if (marked) {
    log.warn(
      `[CodexService] Marked token as expired due to auth failure: ${token.email}`,
    );
  }
}

async function refreshCodexToken(
  refreshToken: string,
): Promise<RefreshTokenResponse> {
  const response = await axios.post<RefreshTokenResponse>(
    OPENAI_TOKEN_URL,
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CODEX_CLIENT_ID,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    },
  );

  return response.data;
}

async function fetchUsageWithToken(
  accessToken: string,
  accountId: string,
): Promise<CodexUsageResponse> {
  const response = await axios.get<CodexUsageResponse>(CHATGPT_USAGE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "ChatGPT-Account-Id": accountId,
    },
    timeout: 30000,
  });

  return response.data;
}

function extractCodexUsageFromManagementPayload(
  payload: unknown,
): CodexUsageResponse {
  let parsedPayload: unknown = payload;
  if (typeof parsedPayload === "string") {
    try {
      parsedPayload = JSON.parse(parsedPayload);
    } catch {
      throw new Error("Invalid management api-call payload for Codex usage");
    }
  }

  if (!parsedPayload || typeof parsedPayload !== "object") {
    throw new Error("Invalid management api-call payload for Codex usage");
  }

  const objectPayload = parsedPayload as Record<string, unknown>;

  const statusCode =
    typeof objectPayload.status_code === "number"
      ? objectPayload.status_code
      : undefined;
  if (statusCode && statusCode >= 400) {
    const bodyText =
      typeof objectPayload.body === "string" ? objectPayload.body : "";
    let detail = bodyText;
    if (bodyText) {
      try {
        const parsedBody = JSON.parse(bodyText) as { detail?: unknown };
        if (typeof parsedBody.detail === "string") {
          detail = parsedBody.detail;
        }
      } catch {
        detail = bodyText;
      }
    }

    throw new Error(
      detail
        ? `Codex usage request failed (${statusCode}): ${detail}`
        : `Codex usage request failed (${statusCode})`,
    );
  }

  if (objectPayload.success === false) {
    throw new Error(
      typeof objectPayload.error === "string"
        ? objectPayload.error
        : "Codex management api-call failed",
    );
  }

  if (typeof objectPayload.body === "string") {
    try {
      const parsedBody = JSON.parse(objectPayload.body) as unknown;
      if (
        parsedBody &&
        typeof parsedBody === "object" &&
        "rate_limit" in parsedBody
      ) {
        return parsedBody as CodexUsageResponse;
      }
    } catch {
      throw new Error("Invalid management api-call payload for Codex usage");
    }
  }

  const candidate =
    objectPayload.data && typeof objectPayload.data === "object"
      ? objectPayload.data
      : objectPayload;

  if (candidate && typeof candidate === "object" && "rate_limit" in candidate) {
    return candidate as CodexUsageResponse;
  }

  throw new Error("Unexpected Codex usage payload from management api-call");
}

async function fetchCodexUsageViaManagement(
  token: TokenReadResult,
): Promise<CodexUsageResponse> {
  if (!token.authIndex) {
    throw new Error("Codex account missing authIndex");
  }
  if (!token.accountId) {
    throw new Error("Codex token missing account_id");
  }

  const payload = await managementAPI.callManagementApi({
    method: "GET",
    url: CHATGPT_USAGE_URL,
    authIndex: token.authIndex,
    header: {
      Authorization: "Bearer $TOKEN$",
      Accept: "application/json",
      "ChatGPT-Account-Id": token.accountId,
    },
  });

  return extractCodexUsageFromManagementPayload(payload);
}

async function fetchCodexUsageWithRefresh(
  token: TokenReadResult,
): Promise<CodexUsageResponse> {
  try {
    return await fetchUsageWithToken(token.accessToken, token.accountId!);
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      log.info(
        `[CodexService] Token expired for ${token.email}, refreshing...`,
      );

      const newTokens = await refreshCodexToken(token.refreshToken);

      await updateTokenFile(token.filePath, {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
      });

      return await fetchUsageWithToken(
        newTokens.access_token,
        token.accountId!,
      );
    }

    throw error;
  }
}

export async function fetchCodexUsage(
  token: TokenReadResult,
): Promise<CodexUsageResponse> {
  if (!token.accountId) {
    throw new Error(
      "Codex account metadata missing account_id. Re-import this auth file from management auth-files.",
    );
  }

  if (token.authIndex) {
    try {
      return await fetchCodexUsageViaManagement(token);
    } catch (error) {
      if (isCodexUnauthorizedError(error)) {
        await markCodexTokenExpired(token);
        throw error;
      }

      const isAxios404 =
        axios.isAxiosError(error) && error.response?.status === 404;
      const isWrappedUpstream404 =
        error instanceof Error &&
        error.message.includes("Codex usage request failed (404)");
      const isParsed404 =
        error instanceof Error && error.message.includes("(404)");

      if (isAxios404 || isParsed404) {
        if (isAxios404) {
          try {
            return await fetchCodexUsageViaManagement(token);
          } catch (retryError) {
            const retryIsAxios404 =
              axios.isAxiosError(retryError) &&
              retryError.response?.status === 404;
            const retryIsParsed404 =
              retryError instanceof Error &&
              retryError.message.includes("(404)");
            if (!retryIsAxios404 && !retryIsParsed404) {
              throw retryError;
            }
            const debug = getAxios404Debug(retryError);
            log.warn(
              `[CodexService] Management api-call endpoint returned 404 for ${token.email}, fallback to direct usage request${debug ? ` (${debug})` : ""}`,
            );
            return await fetchCodexUsageWithRefresh(token);
          }
        }

        if (isWrappedUpstream404) {
          log.info(
            `[CodexService] Upstream Codex usage endpoint returned 404 for ${token.email} via management proxy, fallback to direct usage request`,
          );
        } else {
          log.info(
            `[CodexService] Received 404 while fetching Codex usage for ${token.email} via management proxy, fallback to direct usage request`,
          );
        }

        return await fetchCodexUsageWithRefresh(token);
      }

      throw error;
    }
  }

  try {
    return await fetchCodexUsageWithRefresh(token);
  } catch (error) {
    if (isCodexUnauthorizedError(error)) {
      await markCodexTokenExpired(token);
    }
    throw error;
  }
}

import { store } from "../utils/store";

export function formatResetTime(seconds: number): string {
  if (seconds <= 0) return "0m";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const language = store.get("language");

  if (days > 0) {
    return language === "zh" ? `${days}天 ${hours}小时` : `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return language === "zh"
      ? `${hours}小时 ${minutes}分钟`
      : `${hours}h ${minutes}m`;
  }
  return language === "zh" ? `${minutes}分钟` : `${minutes}m`;
}
