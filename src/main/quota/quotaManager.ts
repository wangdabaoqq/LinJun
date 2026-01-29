import path from "path";

import {
  scanTokenFiles,
  getTokensByProvider,
  getProviderSummary,
  ProviderType,
  TokenReadResult,
} from "./tokenReader";
import {
  fetchCodexUsage,
  formatResetTime,
  CodexUsageResponse,
} from "./codexService";
import {
  fetchAntigravityUsage,
  AntigravityUsageResponse,
  AntigravityModelQuota,
} from "./antigravityService";
import { store } from "../utils/store";
import {
  getKiroUsage,
  isKiroTokenValid,
  KiroUsageResponse,
} from "./kiroService";

export interface QuotaWindow {
  label: string;
  usedPercent: number;
  resetIn: string;
  limitReached: boolean;
}

export interface QuotaAccount {
  id: string;
  provider: ProviderType;
  email: string;
  badge?: string;
  status: "active" | "limited" | "error" | "refreshing";
  rateLimits: {
    primary: QuotaWindow;
    secondary?: QuotaWindow;
    codeReview?: QuotaWindow;
    additional?: QuotaWindow[];
  };
  lastUpdated: Date;
  error?: string;
}

export interface ProviderInfo {
  id: ProviderType;
  name: string;
  icon: string;
  accountCount: number;
  color: "teal" | "magenta" | "indigo";
}

const PROVIDER_META: Record<
  ProviderType,
  { name: string; icon: string; color: "teal" | "magenta" | "indigo" }
> = {
  codex: { name: "Codex", icon: "◈", color: "teal" },
  antigravity: { name: "Antigravity", icon: "⚛", color: "magenta" },
  claude: { name: "Claude", icon: "◆", color: "indigo" },
  gemini: { name: "Gemini", icon: "◇", color: "teal" },
  kiro: { name: "Kiro", icon: "◎", color: "magenta" },
  copilot: { name: "Copilot", icon: "⬡", color: "indigo" },
  qwen: { name: "Qwen", icon: "◎", color: "teal" },
  iflow: { name: "iFlow", icon: "◉", color: "magenta" },
};

function convertCodexUsageToQuotaAccount(
  token: TokenReadResult,
  usage: CodexUsageResponse,
): QuotaAccount {
  const isLimited =
    usage.rate_limit.limit_reached ||
    usage.rate_limit.primary_window.used_percent > 95;

  return {
    id: `${token.provider}-${token.email}`,
    provider: token.provider,
    email: token.email,
    badge: "Plus",
    status: isLimited ? "limited" : "active",
    rateLimits: {
      primary: {
        label: "5-Hour Window",
        usedPercent: usage.rate_limit.primary_window.used_percent,
        resetIn: formatResetTime(
          usage.rate_limit.primary_window.reset_after_seconds,
        ),
        limitReached: usage.rate_limit.limit_reached,
      },
      secondary: usage.rate_limit.secondary_window
        ? {
            label: "7-Day Window",
            usedPercent: usage.rate_limit.secondary_window.used_percent,
            resetIn: formatResetTime(
              usage.rate_limit.secondary_window.reset_after_seconds,
            ),
            limitReached: false,
          }
        : undefined,
    },
    lastUpdated: new Date(),
  };
}

function convertAntigravityUsageToQuotaAccount(
  token: TokenReadResult,
  usage: AntigravityUsageResponse,
): QuotaAccount {
  const modelsWithUsage = usage.models.filter(
    (m) => m.usedPercent !== undefined,
  );

  const preferredModelOrder = [
    "gemini-3-pro-image",
    "claude-opus-4-5-thinking",
    "gemini-3-flash",
    "gemini-3-pro-high",
  ];

  const normalizedPreferredOrder = preferredModelOrder.map((modelId) =>
    modelId.toLowerCase().replace(/[-_\s]/g, ""),
  );

  const sortedModels = [...modelsWithUsage].sort((a, b) => {
    const normalizedA = a.modelId.toLowerCase().replace(/[-_\s]/g, "");
    const normalizedB = b.modelId.toLowerCase().replace(/[-_\s]/g, "");
    const indexA = normalizedPreferredOrder.indexOf(normalizedA);
    const indexB = normalizedPreferredOrder.indexOf(normalizedB);

    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const primaryModel = sortedModels[0];
  const remainingModels = sortedModels.slice(1);

  const usedPercent = primaryModel?.usedPercent || 0;
  const isLimited = usedPercent > 95 || !usage.hasQuota;

  const formatModelResetTime = (model?: AntigravityModelQuota) => {
    if (!model?.resetTime) {
      return "Monthly";
    }
    const date = new Date(model.resetTime);
    const datePart = date.toISOString().slice(0, 10);
    const language = store.get("language");
    const locale = language === "en" ? "en-US" : "zh-CN";
    const timePart = date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart} ${timePart}`;
  };

  const additional: QuotaWindow[] = remainingModels.map((model) => ({
    label: model.displayName,
    usedPercent: model.usedPercent || 0,
    resetIn: formatModelResetTime(model),
    limitReached: (model.usedPercent || 0) >= 100,
  }));

  const tierLabel = usage.paidTier?.name
    ? "Pro"
    : usage.tier?.id === "standard-tier"
      ? "Plus"
      : "Free";

  return {
    id: `${token.provider}-${token.email}`,
    provider: token.provider,
    email: token.email,
    badge: tierLabel,
    status: isLimited ? "limited" : "active",
    rateLimits: {
      primary: {
        label: primaryModel?.displayName || "Model Quota",
        usedPercent,
        resetIn: formatModelResetTime(primaryModel),
        limitReached: usedPercent >= 100,
      },
      additional: additional.length > 0 ? additional : undefined,
    },
    lastUpdated: new Date(),
  };
}

function formatUnixSecondsToLocal(seconds?: number): string {
  if (!seconds) return "-";
  const date = new Date(seconds * 1000);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
}

function convertKiroUsageToQuotaAccount(
  token: TokenReadResult,
  usage: KiroUsageResponse,
  displayEmail: string,
  accountId: string,
): QuotaAccount {
  const breakdown = usage.usageBreakdownList?.[0];
  const currentUsage =
    breakdown?.freeTrialInfo?.currentUsageWithPrecision ??
    breakdown?.currentUsageWithPrecision ??
    0;
  const usageLimit =
    breakdown?.freeTrialInfo?.usageLimitWithPrecision ??
    breakdown?.usageLimitWithPrecision ??
    0;
  const resetSeconds =
    breakdown?.nextDateReset ??
    usage.nextDateReset ??
    breakdown?.freeTrialInfo?.freeTrialExpiry;
  const usedPercent = usageLimit > 0 ? (currentUsage / usageLimit) * 100 : 0;
  const isLimited = usedPercent >= 100;

  return {
    id: accountId,
    provider: token.provider,
    email: displayEmail,
    badge: usage.subscriptionInfo?.subscriptionTitle || "Kiro",
    status: isLimited ? "limited" : "active",
    rateLimits: {
      primary: {
        label: breakdown?.displayName || "Credit",
        usedPercent,
        resetIn: "",
        limitReached: isLimited,
      },
    },
    lastUpdated: new Date(),
  };
}

function createErrorQuotaAccount(
  token: TokenReadResult,
  error: string,
): QuotaAccount {
  let displayEmail = token.email;
  if (!displayEmail || displayEmail === "unknown") {
    displayEmail = path.basename(token.filePath, ".json");
  }
  return {
    id: `${token.provider}-${displayEmail}`,
    provider: token.provider,
    email: displayEmail,
    status: "error",
    rateLimits: {
      primary: {
        label: "Unknown",
        usedPercent: 0,
        resetIn: "-",
        limitReached: false,
      },
    },
    lastUpdated: new Date(),
    error,
  };
}

export async function getProviders(): Promise<ProviderInfo[]> {
  const summary = getProviderSummary();
  const results: ProviderInfo[] = [];

  for (const { provider, accountCount } of summary) {
    let validCount = accountCount;

    if (provider === "kiro") {
      const tokens = getTokensByProvider(provider);
      let validKiroCount = 0;
      for (const token of tokens) {
        const isValid = await isKiroTokenValid(token);
        if (isValid) validKiroCount++;
      }
      validCount = validKiroCount;
    }

    if (validCount > 0) {
      results.push({
        id: provider,
        name: PROVIDER_META[provider]?.name || provider,
        icon: PROVIDER_META[provider]?.icon || "◈",
        accountCount: validCount,
        color: PROVIDER_META[provider]?.color || "teal",
      });
    }
  }

  return results;
}

export async function getQuotaByProvider(
  provider: ProviderType,
): Promise<QuotaAccount[]> {
  const tokens = getTokensByProvider(provider);
  const results: QuotaAccount[] = [];
  const providerCounts = new Map<string, number>();

  for (const token of tokens) {
    if (provider === "codex") {
      try {
        const usage = await fetchCodexUsage(token);
        results.push(convertCodexUsageToQuotaAccount(token, usage));
      } catch (error) {
        console.error(
          `[QuotaManager] Failed to fetch quota for ${token.email}:`,
          error,
        );
        results.push(
          createErrorQuotaAccount(
            token,
            error instanceof Error ? error.message : "Unknown error",
          ),
        );
      }
    } else if (provider === "antigravity") {
      try {
        const usage = await fetchAntigravityUsage(token);
        results.push(convertAntigravityUsageToQuotaAccount(token, usage));
      } catch (error) {
        console.error(
          `[QuotaManager] Failed to fetch Antigravity quota for ${token.email}:`,
          error,
        );
        results.push(
          createErrorQuotaAccount(
            token,
            error instanceof Error ? error.message : "Unknown error",
          ),
        );
      }
    } else if (provider === "kiro") {
      try {
        const usage = await getKiroUsage(token);
        let displayEmail = token.email || usage.userInfo?.email || "";
        if (!displayEmail || displayEmail === "unknown") {
          displayEmail = path.basename(token.filePath, ".json");
        }
        const baseName = displayEmail;
        const count = providerCounts.get(baseName) ?? 0;
        const nextCount = count + 1;
        providerCounts.set(baseName, nextCount);
        const suffix = nextCount > 1 ? `-${nextCount}` : "";
        const safeName = `${baseName}${suffix}`;
        const accountId = `${token.provider}-${safeName}`;
        results.push(
          convertKiroUsageToQuotaAccount(token, usage, safeName, accountId),
        );
      } catch (error) {
        console.error(
          `[QuotaManager] Skipping expired Kiro account ${token.filePath}:`,
          error,
        );
      }
    } else {
      results.push({
        id: `${token.provider}-${token.email}`,
        provider: token.provider,
        email: token.email,
        status: "active",
        rateLimits: {
          primary: {
            label: "Usage",
            usedPercent: 0,
            resetIn: "-",
            limitReached: false,
          },
        },
        lastUpdated: new Date(),
      });
    }
  }

  return results;
}

export async function refreshQuota(
  accountId: string,
): Promise<QuotaAccount | null> {
  const [provider, ...emailParts] = accountId.split("-");
  const email = emailParts.join("-");
  const tokens = scanTokenFiles();
  const token = tokens.find(
    (t) => t.provider === provider && t.email === email,
  );

  if (!token) {
    console.error(`[QuotaManager] Token not found for account: ${accountId}`);
    return null;
  }

  if (token.provider === "codex") {
    try {
      const usage = await fetchCodexUsage(token);
      return convertCodexUsageToQuotaAccount(token, usage);
    } catch (error) {
      return createErrorQuotaAccount(
        token,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  if (token.provider === "antigravity") {
    try {
      const usage = await fetchAntigravityUsage(token);
      return convertAntigravityUsageToQuotaAccount(token, usage);
    } catch (error) {
      return createErrorQuotaAccount(
        token,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  if (token.provider === "kiro") {
    try {
      const usage = await getKiroUsage(token);
      let displayEmail = token.email || usage.userInfo?.email || "";
      if (!displayEmail || displayEmail === "unknown") {
        displayEmail = path.basename(token.filePath, ".json");
      }
      const accountId = `${token.provider}-${displayEmail}`;
      return convertKiroUsageToQuotaAccount(
        token,
        usage,
        displayEmail,
        accountId,
      );
    } catch (error) {
      return createErrorQuotaAccount(
        token,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  return null;
}
