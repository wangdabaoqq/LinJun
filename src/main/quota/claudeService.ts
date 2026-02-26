import { managementAPI } from "../proxy/api";
import log from "../utils/logger";
import { TokenReadResult } from "./tokenReader";

const CLAUDE_USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const ANTHROPIC_BETA_HEADER = "oauth-2025-04-20";

export interface ClaudeUsageWindow {
  utilization: number;
  resets_at?: string;
}

export interface ClaudeIguanaNecktie {
  is_enabled: boolean;
  used_credits: number;
  monthly_limit: number;
}

export interface ClaudeUsageResponse {
  five_hour?: ClaudeUsageWindow;
  seven_day?: ClaudeUsageWindow;
  seven_day_oauth_apps?: ClaudeUsageWindow;
  seven_day_opus?: ClaudeUsageWindow;
  seven_day_sonnet?: ClaudeUsageWindow;
  seven_day_cowork?: ClaudeUsageWindow;
  iguana_necktie?: ClaudeIguanaNecktie;
}

function extractClaudeUsageFromManagementPayload(
  payload: unknown,
): ClaudeUsageResponse {
  let parsedPayload: unknown = payload;
  if (typeof parsedPayload === "string") {
    try {
      parsedPayload = JSON.parse(parsedPayload);
    } catch {
      throw new Error("Invalid management api-call payload for Claude usage");
    }
  }

  if (!parsedPayload || typeof parsedPayload !== "object") {
    throw new Error("Invalid management api-call payload for Claude usage");
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
        const parsedBody = JSON.parse(bodyText) as {
          error?: { message?: string };
        };
        if (typeof parsedBody.error?.message === "string") {
          detail = parsedBody.error.message;
        }
      } catch {
        detail = bodyText;
      }
    }
    throw new Error(
      detail
        ? `Claude usage request failed (${statusCode}): ${detail}`
        : `Claude usage request failed (${statusCode})`,
    );
  }

  if (objectPayload.success === false) {
    throw new Error(
      typeof objectPayload.error === "string"
        ? objectPayload.error
        : "Claude management api-call failed",
    );
  }

  if (typeof objectPayload.body === "string") {
    try {
      const parsedBody = JSON.parse(objectPayload.body) as unknown;
      if (parsedBody && typeof parsedBody === "object") {
        return parsedBody as ClaudeUsageResponse;
      }
    } catch {
      throw new Error("Invalid management api-call payload for Claude usage");
    }
  }

  const candidate =
    objectPayload.data && typeof objectPayload.data === "object"
      ? objectPayload.data
      : objectPayload;

  if (candidate && typeof candidate === "object") {
    return candidate as ClaudeUsageResponse;
  }

  throw new Error("Unexpected Claude usage payload from management api-call");
}

export async function fetchClaudeUsage(
  token: TokenReadResult,
): Promise<ClaudeUsageResponse> {
  if (!token.authIndex) {
    throw new Error(
      "Claude account missing authIndex. Re-import this auth file from management auth-files.",
    );
  }

  const payload = await managementAPI.callManagementApi({
    method: "GET",
    url: CLAUDE_USAGE_URL,
    authIndex: token.authIndex,
    header: {
      Authorization: "Bearer $TOKEN$",
      "Content-Type": "application/json",
      "anthropic-beta": ANTHROPIC_BETA_HEADER,
    },
  });

  return extractClaudeUsageFromManagementPayload(payload);
}

const WINDOW_LABEL_MAP: Record<keyof ClaudeUsageResponse, string> = {
  five_hour: "5-Hour Window",
  seven_day: "7-Day Window",
  seven_day_oauth_apps: "7-Day OAuth Apps",
  seven_day_opus: "7-Day Opus",
  seven_day_sonnet: "7-Day Sonnet",
  seven_day_cowork: "7-Day Cowork",
  iguana_necktie: "Extra Credits",
};

export function formatClaudeResetTime(resetsAt?: string): string {
  if (!resetsAt) return "-";
  const resetDate = new Date(resetsAt);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  if (diffMs <= 0) return "0m";

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export interface ClaudeQuotaWindows {
  primary: {
    label: string;
    usedPercent: number;
    resetIn: string;
    limitReached: boolean;
  };
  additional: Array<{
    label: string;
    usedPercent: number;
    resetIn: string;
    limitReached: boolean;
  }>;
}

export function parseClaudeUsageWindows(
  usage: ClaudeUsageResponse,
): ClaudeQuotaWindows {
  const windowKeys: Array<keyof Omit<ClaudeUsageResponse, "iguana_necktie">> = [
    "five_hour",
    "seven_day",
    "seven_day_oauth_apps",
    "seven_day_opus",
    "seven_day_sonnet",
    "seven_day_cowork",
  ];

  const windows = windowKeys
    .filter((key) => usage[key] !== undefined)
    .map((key) => {
      const w = usage[key] as ClaudeUsageWindow;
      return {
        label: WINDOW_LABEL_MAP[key],
        usedPercent: w.utilization ?? 0,
        resetIn: formatClaudeResetTime(w.resets_at),
        limitReached: (w.utilization ?? 0) >= 100,
      };
    });

  if (usage.iguana_necktie?.is_enabled) {
    const ig = usage.iguana_necktie;
    const total = ig.monthly_limit;
    const used = ig.used_credits;
    const usedPercent = total > 0 ? (used / total) * 100 : 0;
    windows.push({
      label: WINDOW_LABEL_MAP.iguana_necktie,
      usedPercent,
      resetIn: "Monthly",
      limitReached: usedPercent >= 100,
    });
  }

  if (windows.length === 0) {
    log.warn("[ClaudeService] No usage windows found in response");
    return {
      primary: {
        label: "Usage",
        usedPercent: 0,
        resetIn: "-",
        limitReached: false,
      },
      additional: [],
    };
  }

  const [primary, ...rest] = windows;
  return { primary, additional: rest };
}
