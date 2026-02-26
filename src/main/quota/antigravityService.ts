import axios from "axios";

import { managementAPI } from "../proxy/api";
import log from "../utils/logger";
import { TokenReadResult, updateTokenFile } from "./tokenReader";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CLOUDCODE_LOAD_URL =
  "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
const CLOUDCODE_MODELS_URL =
  "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels";

const USER_AGENT = "antigravity/1.11.3 Darwin/arm64";

function getGoogleOAuthConfig(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET for Antigravity token refresh",
    );
  }

  return { clientId, clientSecret };
}

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
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const response = await axios.post(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
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

function unwrapManagementPayload(payload: unknown, context: string): unknown {
  let parsedPayload: unknown = payload;
  if (typeof parsedPayload === "string") {
    try {
      parsedPayload = JSON.parse(parsedPayload);
    } catch {
      throw new Error(`Invalid management api-call payload for ${context}`);
    }
  }

  if (!parsedPayload || typeof parsedPayload !== "object") {
    throw new Error(`Invalid management api-call payload for ${context}`);
  }

  const objectPayload = parsedPayload as Record<string, unknown>;

  const statusCode =
    typeof objectPayload.status_code === "number"
      ? objectPayload.status_code
      : undefined;
  if (statusCode && statusCode >= 400) {
    const bodyText =
      typeof objectPayload.body === "string" ? objectPayload.body : "";
    throw new Error(
      bodyText
        ? `${context} request failed (${statusCode}): ${bodyText}`
        : `${context} request failed (${statusCode})`,
    );
  }

  if (objectPayload.success === false) {
    throw new Error(
      typeof objectPayload.error === "string"
        ? objectPayload.error
        : `${context} management api-call failed`,
    );
  }

  if (typeof objectPayload.body === "string") {
    try {
      const parsedBody = JSON.parse(objectPayload.body) as unknown;
      if (parsedBody && typeof parsedBody === "object") {
        return parsedBody;
      }
    } catch {
      throw new Error(`Invalid management api-call payload for ${context}`);
    }
  }

  return objectPayload.data !== undefined ? objectPayload.data : objectPayload;
}

async function loadCodeAssistViaManagement(
  authIndex: string,
): Promise<AntigravityProjectInfo> {
  const payload = await managementAPI.callManagementApi({
    method: "POST",
    url: CLOUDCODE_LOAD_URL,
    authIndex,
    header: {
      Authorization: "Bearer $TOKEN$",
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
    },
    body: {
      metadata: {
        ideType: "ANTIGRAVITY",
      },
    },
  });

  const data = unwrapManagementPayload(payload, "Antigravity loadCodeAssist");
  if (!data || typeof data !== "object") {
    throw new Error("Unexpected Antigravity loadCodeAssist payload");
  }

  const objectData = data as Record<string, unknown>;
  const currentTier =
    objectData.currentTier && typeof objectData.currentTier === "object"
      ? (objectData.currentTier as Record<string, unknown>)
      : undefined;
  const paidTier =
    objectData.paidTier && typeof objectData.paidTier === "object"
      ? (objectData.paidTier as Record<string, unknown>)
      : undefined;

  return {
    cloudaicompanionProject:
      typeof objectData.cloudaicompanionProject === "string"
        ? objectData.cloudaicompanionProject
        : undefined,
    currentTier: currentTier
      ? {
          id: typeof currentTier.id === "string" ? currentTier.id : undefined,
          name:
            typeof currentTier.name === "string" ? currentTier.name : undefined,
        }
      : undefined,
    paidTier: paidTier
      ? {
          id: typeof paidTier.id === "string" ? paidTier.id : undefined,
          name: typeof paidTier.name === "string" ? paidTier.name : undefined,
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

  if (response.data?.models && typeof response.data.models === "object") {
    for (const [modelId, modelData] of Object.entries(response.data.models)) {
      const model = modelData as {
        isInternal?: boolean;
        displayName?: string;
        quotaInfo?: { remainingFraction?: number; resetTime?: string };
      };

      if (model.isInternal || typeof model.displayName !== "string") {
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

async function fetchAvailableModelsViaManagement(
  authIndex: string,
  project: string,
): Promise<AntigravityUsageResponse> {
  const payload = await managementAPI.callManagementApi({
    method: "POST",
    url: CLOUDCODE_MODELS_URL,
    authIndex,
    header: {
      Authorization: "Bearer $TOKEN$",
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
    },
    body: {
      project,
    },
  });

  const data = unwrapManagementPayload(
    payload,
    "Antigravity fetchAvailableModels",
  );
  if (!data || typeof data !== "object") {
    throw new Error("Unexpected Antigravity fetchAvailableModels payload");
  }

  const objectData = data as Record<string, unknown>;
  const modelsObject =
    objectData.models && typeof objectData.models === "object"
      ? (objectData.models as Record<string, unknown>)
      : {};

  const models: AntigravityModelQuota[] = [];
  let hasQuota = false;

  for (const [modelId, modelData] of Object.entries(modelsObject)) {
    if (!modelData || typeof modelData !== "object") {
      continue;
    }

    const model = modelData as Record<string, unknown>;
    if (model.isInternal === true || typeof model.displayName !== "string") {
      continue;
    }

    const quotaInfo =
      model.quotaInfo && typeof model.quotaInfo === "object"
        ? (model.quotaInfo as Record<string, unknown>)
        : {};

    const remainingFraction =
      typeof quotaInfo.remainingFraction === "number"
        ? quotaInfo.remainingFraction
        : undefined;
    const resetTime =
      typeof quotaInfo.resetTime === "string" ? quotaInfo.resetTime : undefined;

    if (remainingFraction !== undefined || resetTime) {
      hasQuota = true;
      const usedPercent =
        remainingFraction !== undefined ? (1 - remainingFraction) * 100 : 100;
      models.push({
        modelId,
        displayName:
          typeof model.displayName === "string" ? model.displayName : modelId,
        remainingQuota: remainingFraction,
        totalQuota: remainingFraction !== undefined ? 1 : undefined,
        usedPercent,
        resetTime,
      });
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
  if (token.authIndex) {
    let projectId = token.raw.project_id;
    let tier: { id?: string; name?: string } | undefined = token.raw.tier_id
      ? { id: token.raw.tier_id, name: token.raw.tier_name }
      : undefined;
    let paidTier: { id?: string; name?: string } | undefined = token.raw
      .paid_tier_id
      ? { id: token.raw.paid_tier_id, name: token.raw.paid_tier_name }
      : undefined;

    if (!projectId || !tier) {
      const projectInfo = await loadCodeAssistViaManagement(token.authIndex);
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

    const usage = await fetchAvailableModelsViaManagement(
      token.authIndex,
      projectId,
    );
    return {
      ...usage,
      tier,
      paidTier,
    };
  }

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
