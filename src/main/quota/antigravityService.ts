import axios from "axios";

import log from "../utils/logger";
import { TokenReadResult, updateTokenFile } from "./tokenReader";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "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";
const CLOUDCODE_LOAD_URL =
  "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
const CLOUDCODE_MODELS_URL =
  "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels";

const USER_AGENT = "antigravity/1.11.3 Darwin/arm64";

export interface AntigravityProjectInfo {
  cloudaicompanionProject?: string;
  currentTier?: {
    id?: string;
    name?: string;
  };
  paidTier?: {
    id?: string;
    name?: string;
  };
}

export interface AntigravityModelQuota {
  modelId: string;
  displayName: string;
  remainingQuota?: number;
  totalQuota?: number;
  usedPercent?: number;
  resetTime?: string;
}

export interface AntigravityUsageResponse {
  project: string;
  models: AntigravityModelQuota[];
  hasQuota: boolean;
  tier?: {
    id?: string;
    name?: string;
  };
  paidTier?: {
    id?: string;
    name?: string;
  };
}

async function refreshAntigravityToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const response = await axios.post(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 30000,
    },
  );

  return {
    access_token: response.data.access_token,
    expires_in: response.data.expires_in,
  };
}

async function loadCodeAssist(
  accessToken: string,
): Promise<AntigravityProjectInfo> {
  const response = await axios.post(
    CLOUDCODE_LOAD_URL,
    {
      metadata: {
        ideType: "ANTIGRAVITY",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    },
  );

  return {
    cloudaicompanionProject: response.data?.cloudaicompanionProject,
    currentTier: response.data?.currentTier
      ? {
          id: response.data.currentTier.id,
          name: response.data.currentTier.name,
        }
      : undefined,
    paidTier: response.data?.paidTier
      ? {
          id: response.data.paidTier.id,
          name: response.data.paidTier.name,
        }
      : undefined,
  };
}

async function fetchAvailableModels(
  accessToken: string,
  project: string,
): Promise<AntigravityUsageResponse> {
  const response = await axios.post(
    CLOUDCODE_MODELS_URL,
    {
      project,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    },
  );

  const models: AntigravityModelQuota[] = [];
  let hasQuota = false;

  const ALLOWED_MODELS = [
    "gemini-3-pro-image",
    "claude-opus-4-5-thinking",
    "gemini-3-flash",
    "gemini-3-pro-high",
    "gemini-3-pro-low",
    "gemini-2.5-flash",
    "gemini-2.5-flash-thinking",
    "gemini-2.5-pro",
    "claude-sonnet-4-5",
    "claude-sonnet-4-5-thinking",
  ];

  if (response.data?.models && typeof response.data.models === "object") {
    for (const [modelId, modelData] of Object.entries(response.data.models)) {
      const model = modelData as {
        isInternal?: boolean;
        displayName?: string;
        quotaInfo?: { remainingFraction?: number; resetTime?: string };
      };

      if (model.isInternal || !ALLOWED_MODELS.includes(modelId)) {
        continue;
      }

      const quotaInfo = model.quotaInfo || {};
      const remainingFraction = quotaInfo.remainingFraction;
      const resetTime = quotaInfo.resetTime;

      if (remainingFraction !== undefined || resetTime) {
        if (!hasQuota) {
          hasQuota = true;
        }
        const usedPercent =
          remainingFraction !== undefined ? (1 - remainingFraction) * 100 : 100;

        models.push({
          modelId,
          displayName: model.displayName || modelId,
          remainingQuota: remainingFraction,
          totalQuota: remainingFraction !== undefined ? 1 : undefined,
          usedPercent,
          resetTime,
        });
      }
    }
  }

  return {
    project,
    models,
    hasQuota,
  };
}

export async function fetchAntigravityUsage(
  token: TokenReadResult,
): Promise<AntigravityUsageResponse> {
  let accessToken = token.accessToken;
  let projectId = token.raw.project_id;
  let tier: { id?: string; name?: string } | undefined = token.raw.tier_id
    ? { id: token.raw.tier_id, name: token.raw.tier_name }
    : undefined;
  let paidTier: { id?: string; name?: string } | undefined = token.raw
    .paid_tier_id
    ? { id: token.raw.paid_tier_id, name: token.raw.paid_tier_name }
    : undefined;

  const tryFetch = async (): Promise<AntigravityUsageResponse> => {
    if (!projectId || !tier) {
      const projectInfo = await loadCodeAssist(accessToken);
      projectId = projectInfo.cloudaicompanionProject || projectId;
      if (projectInfo.currentTier?.id || projectInfo.currentTier?.name) {
        tier = {
          id: projectInfo.currentTier?.id,
          name: projectInfo.currentTier?.name,
        };
      }
      if (projectInfo.paidTier?.id || projectInfo.paidTier?.name) {
        paidTier = {
          id: projectInfo.paidTier?.id,
          name: projectInfo.paidTier?.name,
        };
      }

      if (!projectId) {
        throw new Error("Failed to get project ID from loadCodeAssist");
      }

      await updateTokenFile(token.filePath, {
        project_id: projectId,
        tier_id: tier?.id,
        tier_name: tier?.name,
        paid_tier_id: paidTier?.id,
        paid_tier_name: paidTier?.name,
      });
    }

    const usage = await fetchAvailableModels(accessToken, projectId);
    return {
      ...usage,
      tier,
      paidTier,
    };
  };

  try {
    return await tryFetch();
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      log.info(
        `[AntigravityService] Token expired for ${token.email}, refreshing...`,
      );

      const newTokens = await refreshAntigravityToken(token.refreshToken);
      accessToken = newTokens.access_token;

      await updateTokenFile(token.filePath, {
        access_token: newTokens.access_token,
        expires_in: newTokens.expires_in,
        timestamp: Date.now(),
      });

      return await tryFetch();
    }

    throw error;
  }
}
