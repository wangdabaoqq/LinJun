import axios from "axios";
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

export async function fetchCodexUsage(
  token: TokenReadResult,
): Promise<CodexUsageResponse> {
  if (!token.accountId) {
    throw new Error("Codex token missing account_id");
  }

  try {
    return await fetchUsageWithToken(token.accessToken, token.accountId);
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      console.log(
        `[CodexService] Token expired for ${token.email}, refreshing...`,
      );

      const newTokens = await refreshCodexToken(token.refreshToken);

      updateTokenFile(token.filePath, {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
      });

      return await fetchUsageWithToken(newTokens.access_token, token.accountId);
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
