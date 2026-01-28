import axios from "axios";

import { TokenReadResult, updateTokenFile } from "./tokenReader";

const KIRO_USAGE_URL =
  "https://codewhisperer.us-east-1.amazonaws.com/getUsageLimits?isEmailRequired=true&origin=AI_EDITOR";
const KIRO_REFRESH_URL =
  "https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken";
const KIRO_USER_AGENT =
  "aws-sdk-js/3.0.0 KiroIDE-0.1.0 os/macos lang/js md/nodejs/18.0.0";
const KIRO_AMZ_USER_AGENT = "aws-sdk-js/3.0.0";

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
      const newAccessToken = await refreshKiroToken(token.refreshToken);
      if (!newAccessToken) {
        throw new Error("Failed to refresh Kiro access token");
      }

      updateTokenFile(token.filePath, {
        accessToken: newAccessToken,
      });

      return await fetchKiroUsage(newAccessToken);
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
      try {
        const newAccessToken = await refreshKiroToken(token.refreshToken);
        if (newAccessToken) {
          updateTokenFile(token.filePath, { accessToken: newAccessToken });
          return true;
        }
      } catch {
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

    updateTokenFile(token.filePath, {
      accessToken: newAccessToken,
      expiresAt: expiresAt,
    });

    console.log(`[Kiro] Token refreshed successfully: ${token.filePath}`);
    return { success: true, accessToken: newAccessToken, expiresAt };
  } catch (error) {
    console.error("[Kiro] Failed to refresh token:", error);
    return {
      success: false,
      error: axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : String(error),
    };
  }
}
