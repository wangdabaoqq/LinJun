import path from "path";

import axios from "axios";

import log from "../utils/logger";
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
import { getKiroUsage, KiroUsageResponse } from "./kiroService";
import {
  fetchCustomUserSelf,
  fetchCustomPricing,
  parseCustomPricingModels,
} from "./customService";
import {
  fetchClaudeUsage,
  parseClaudeUsageWindows,
  ClaudeUsageResponse,
} from "./claudeService";
import { proxyManager } from "../proxy/manager";

export interface QuotaWindow {
  label: string;
  modelId?: string;
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
  custom: { name: "Custom", icon: "<>", color: "indigo" },
};

function getCustomProviders() {
  const config = proxyManager.loadConfigFromYaml();
  const providers: Array<{
    name?: string;
    "base-url"?: string;
    "system-access-token"?: string;
    "new-api-user"?: string;
    "enable-usage-query"?: boolean;
    type: "openai" | "claude" | "gemini" | "codex";
  }> = [];

  const openaiCompat = config?.["openai-compatibility"] || [];
  openaiCompat.forEach((p) => {
    providers.push({
      name: p.name || "OpenAI Compatible",
      "base-url": p["base-url"],
      "system-access-token": p["system-access-token"],
      "new-api-user": p["new-api-user"],
      "enable-usage-query": p["enable-usage-query"],
      type: "openai",
    });
  });

  const claudeKeys = config?.["claude-api-key"] || [];
  claudeKeys.forEach((p) => {
    providers.push({
      name: p.name || "Claude",
      "base-url": p["base-url"] || "https://api.anthropic.com",
      "system-access-token": p["system-access-token"],
      "new-api-user": p["new-api-user"],
      "enable-usage-query": p["enable-usage-query"],
      type: "claude",
    });
  });

  const geminiKeys = config?.["gemini-api-key"] || [];
  geminiKeys.forEach((p) => {
    providers.push({
      name: p.name || "Gemini",
      "base-url": p["base-url"] || "https://generativelanguage.googleapis.com",
      "system-access-token": p["system-access-token"],
      "new-api-user": p["new-api-user"],
      "enable-usage-query": p["enable-usage-query"],
      type: "gemini",
    });
  });

  const codexKeys = config?.["codex-api-key"] || [];
  codexKeys.forEach((p) => {
    providers.push({
      name: p.name || "Codex",
      "base-url": p["base-url"],
      "system-access-token": p["system-access-token"],
      "new-api-user": p["new-api-user"],
      "enable-usage-query": p["enable-usage-query"],
      type: "codex",
    });
  });

  return providers;
}

function createCustomAccountError(name: string, error: string): QuotaAccount {
  return {
    id: `custom-${name}`,
    provider: "custom",
    email: name,
    status: "error",
    rateLimits: {
      primary: {
        label: "Usage",
        usedPercent: 0,
        resetIn: "",
        limitReached: false,
      },
    },
    lastUpdated: new Date(),
    error,
  };
}

function getCustomUsageErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      return "Authentication failed (401). Check system-access-token and new-api-user.";
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function createCustomAccountSimple(name: string): QuotaAccount {
  return {
    id: `custom-${name}`,
    provider: "custom",
    email: name,
    status: "active",
    rateLimits: {
      primary: {
        label: "",
        usedPercent: 0,
        resetIn: "",
        limitReached: false,
      },
    },
    lastUpdated: new Date(),
  };
}

function createCustomQuotaAccount(
  name: string,
  quota: number,
  usedQuota: number,
  models: QuotaWindow[] = [],
): QuotaAccount {
  const quotaUnit = 500000;
  const normalizedQuota = quota / quotaUnit;
  const normalizedUsed = usedQuota / quotaUnit;
  const total = Math.max(normalizedQuota + normalizedUsed, 0);
  const usedPercent = total > 0 ? (normalizedUsed / total) * 100 : 0;
  const usedValue = `$${normalizedUsed.toFixed(2)}`;
  const balanceValue = `$${normalizedQuota.toFixed(2)}`;

  return {
    id: `custom-${name}`,
    provider: "custom",
    email: name,
    badge: `Balance ${balanceValue}`,
    status: usedPercent >= 100 ? "limited" : "active",
    rateLimits: {
      primary: {
        label: `Total Used ${usedValue}`,
        usedPercent,
        resetIn: "",
        limitReached: usedPercent >= 100,
      },
      additional: models.length > 0 ? models : undefined,
    },
    lastUpdated: new Date(),
  };
}

function buildCustomModelWindows(
  models: { name: string; vendor?: string }[],
): QuotaWindow[] {
  return models.map((model) => ({
    label: model.vendor ? `${model.vendor} · ${model.name}` : model.name,
    modelId: model.name,
    usedPercent: 0,
    resetIn: "",
    limitReached: false,
  }));
}

function convertCodexUsageToQuotaAccount(
  token: TokenReadResult,
  usage: CodexUsageResponse,
): QuotaAccount {
  const getCodexBadge = (planType?: string): string => {
    const normalized = (planType || "").trim().toLowerCase();
    if (!normalized) return "Unknown";
    if (normalized === "free") return "Free";
    if (normalized === "plus") return "Plus";
    if (normalized === "pro") return "Pro";
    if (normalized === "team") return "Team";
    if (normalized === "enterprise") return "Enterprise";
    return planType || "Unknown";
  };

  const formatCodexWindowLabel = (
    seconds?: number,
    fallback = "Usage Window",
  ): string => {
    if (!seconds || seconds <= 0) return fallback;
    if (seconds >= 7 * 24 * 3600) return "7-Day Window";
    if (seconds >= 24 * 3600) return "24-Hour Window";
    if (seconds >= 5 * 3600) return "5-Hour Window";
    if (seconds >= 3600) return "1-Hour Window";
    return fallback;
  };

  const isLimited =
    usage.rate_limit.limit_reached ||
    usage.rate_limit.primary_window.used_percent > 95;

  return {
    id: `${token.provider}-${token.email}`,
    provider: token.provider,
    email: token.email,
    badge: getCodexBadge(usage.plan_type),
    status: isLimited ? "limited" : "active",
    rateLimits: {
      primary: {
        label: formatCodexWindowLabel(
          usage.rate_limit.primary_window.limit_window_seconds,
          "Primary Window",
        ),
        usedPercent: usage.rate_limit.primary_window.used_percent,
        resetIn: formatResetTime(
          usage.rate_limit.primary_window.reset_after_seconds,
        ),
        limitReached: usage.rate_limit.limit_reached,
      },
      secondary: usage.rate_limit.secondary_window
        ? {
            label: formatCodexWindowLabel(
              usage.rate_limit.secondary_window.limit_window_seconds,
              "Secondary Window",
            ),
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
    "claude-opus-4-6-thinking",
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
    const resetDate = new Date(model.resetTime);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();

    if (diffMs <= 0) return "0m";

    const seconds = Math.floor(diffMs / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const language = store.get("language");

    if (days > 0) {
      return language === "zh"
        ? `${days}天 ${hours}小时`
        : `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return language === "zh"
        ? `${hours}小时 ${minutes}分钟`
        : `${hours}h ${minutes}m`;
    }
    return language === "zh" ? `${minutes}分钟` : `${minutes}m`;
  };

  const additional: QuotaWindow[] = remainingModels.map((model) => ({
    label: model.displayName,
    modelId: model.modelId,
    usedPercent: model.usedPercent || 0,
    resetIn: formatModelResetTime(model),
    limitReached: (model.usedPercent || 0) >= 100,
  }));

  const accountType = token.raw.account_type?.trim().toLowerCase();
  const tierLabel = usage.paidTier?.name
    ? "Pro"
    : usage.tier?.id === "standard-tier"
      ? "Plus"
      : accountType === "plus"
        ? "Plus"
        : accountType === "pro"
          ? "Pro"
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
        modelId: primaryModel?.modelId,
        usedPercent,
        resetIn: formatModelResetTime(primaryModel),
        limitReached: usedPercent >= 100,
      },
      additional: additional.length > 0 ? additional : undefined,
    },
    lastUpdated: new Date(),
  };
}

function _formatUnixSecondsToLocal(seconds?: number): string {
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
  const _resetSeconds =
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

function convertClaudeUsageToQuotaAccount(
  token: TokenReadResult,
  usage: ClaudeUsageResponse,
): QuotaAccount {
  const { primary, additional } = parseClaudeUsageWindows(usage);
  const isLimited =
    primary.limitReached || additional.some((w) => w.limitReached);
  return {
    id: `${token.provider}-${token.email}`,
    provider: token.provider,
    email: token.email,
    status: isLimited ? "limited" : "active",
    rateLimits: {
      primary,
      additional: additional.length > 0 ? additional : undefined,
    },
    lastUpdated: new Date(),
  };
}

export async function getProviders(): Promise<ProviderInfo[]> {
  const summary = await getProviderSummary();
  const results: ProviderInfo[] = [];

  for (const { provider, accountCount } of summary) {
    let validCount = accountCount;

    if (provider === "kiro") {
      const tokens = await getTokensByProvider(provider);
      validCount = tokens.length;
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

  const customProviders = getCustomProviders();
  if (customProviders.length > 0) {
    results.push({
      id: "custom",
      name: PROVIDER_META.custom.name,
      icon: PROVIDER_META.custom.icon,
      accountCount: customProviders.length,
      color: PROVIDER_META.custom.color,
    });
  }
  return results;
}

export async function getQuotaByProvider(
  provider: ProviderType,
): Promise<QuotaAccount[]> {
  const tokens = await getTokensByProvider(provider);
  const results: QuotaAccount[] = [];
  const providerCounts = new Map<string, number>();

  if (provider === "custom") {
    const customProviders = getCustomProviders();
    for (const customProvider of customProviders) {
      const name = customProvider.name || "Custom";
      const enableUsageQuery = customProvider["enable-usage-query"] || false;

      if (!enableUsageQuery) {
        results.push(createCustomAccountSimple(name));
        continue;
      }

      const accessToken = customProvider["system-access-token"] || "";
      const baseUrl = customProvider["base-url"] || "";
      const newApiUser = customProvider["new-api-user"] || "";

      if (!accessToken || !baseUrl) {
        results.push(createCustomAccountSimple(name));
        continue;
      }

      try {
        const response = await fetchCustomUserSelf(
          baseUrl,
          accessToken,
          newApiUser,
        );
        const data = response.data || {};
        const quota = Number(data.quota || 0);
        const usedQuota = Number(data.used_quota || 0);
        let modelWindows: QuotaWindow[] = [];
        try {
          const pricing = await fetchCustomPricing(
            baseUrl,
            accessToken,
            newApiUser,
          );
          const pricingModels = parseCustomPricingModels(pricing);
          modelWindows = buildCustomModelWindows(pricingModels);
        } catch (pricingError) {
          log.warn(
            `[QuotaManager] Failed to fetch custom pricing for ${name}:`,
            pricingError,
          );
        }
        results.push(
          createCustomQuotaAccount(name, quota, usedQuota, modelWindows),
        );
      } catch (error) {
        results.push(
          createCustomAccountError(name, getCustomUsageErrorMessage(error)),
        );
      }
    }

    return results;
  }

  for (const token of tokens) {
    if (provider === "codex") {
      try {
        const usage = await fetchCodexUsage(token);
        results.push(convertCodexUsageToQuotaAccount(token, usage));
      } catch (error) {
        log.error(
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
        log.error(
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        log.error(
          `[QuotaManager] Failed to fetch Kiro quota for ${token.filePath}:`,
          errorMessage,
        );
        results.push(createErrorQuotaAccount(token, errorMessage));
      }
    } else if (provider === "claude") {
      if (!token.authIndex) {
        results.push(
          createErrorQuotaAccount(
            token,
            "Claude account missing authIndex. Re-import this auth file from management auth-files.",
          ),
        );
      } else {
        try {
          const usage = await fetchClaudeUsage(token);
          results.push(convertClaudeUsageToQuotaAccount(token, usage));
        } catch (error) {
          log.error(
            `[QuotaManager] Failed to fetch Claude quota for ${token.email}:`,
            error,
          );
          results.push(
            createErrorQuotaAccount(
              token,
              error instanceof Error ? error.message : "Unknown error",
            ),
          );
        }
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

async function fetchCodexAccountWithConcurrency(
  token: import("./tokenReader").TokenReadResult,
): Promise<QuotaAccount> {
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

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<QuotaAccount>,
  onBatch: (batch: QuotaAccount[]) => void,
): Promise<void> {
  const batchSize = concurrency;
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const results = await Promise.all(chunk.map(fn));
    onBatch(results);
  }
}

export async function getQuotaByProviderStream(
  provider: ProviderType,
  onBatch: (accounts: QuotaAccount[], done: boolean) => void,
): Promise<void> {
  if (provider !== "codex" && provider !== "claude") {
    const accounts = await getQuotaByProvider(provider);
    onBatch(accounts, true);
    return;
  }

  if (provider === "codex") {
    const tokens = await getTokensByProvider(provider);
    if (tokens.length === 0) {
      onBatch([], true);
      return;
    }
    await runWithConcurrency(
      tokens,
      10,
      fetchCodexAccountWithConcurrency,
      (batch) => {
        onBatch(batch, false);
      },
    );
    onBatch([], true);
    return;
  }

  // claude: stream with concurrency
  const claudeTokens = await getTokensByProvider(provider);
  if (claudeTokens.length === 0) {
    onBatch([], true);
    return;
  }
  await runWithConcurrency(
    claudeTokens,
    5,
    async (token) => {
      if (!token.authIndex) {
        return createErrorQuotaAccount(
          token,
          "Claude account missing authIndex. Re-import this auth file from management auth-files.",
        );
      }
      try {
        const usage = await fetchClaudeUsage(token);
        return convertClaudeUsageToQuotaAccount(token, usage);
      } catch (error) {
        return createErrorQuotaAccount(
          token,
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    },
    (batch) => {
      onBatch(batch, false);
    },
  );
  onBatch([], true);
}

export async function refreshQuota(
  accountId: string,
): Promise<QuotaAccount | null> {
  const [provider, ...emailParts] = accountId.split("-");
  const email = emailParts.join("-");

  if (provider === "custom") {
    const customProviders = getCustomProviders();
    const customProvider = customProviders.find((p) => p.name === email);
    if (!customProvider) {
      return createCustomAccountError(email, "Custom provider not found");
    }

    const enableUsageQuery = customProvider["enable-usage-query"] || false;
    if (!enableUsageQuery) {
      return createCustomAccountSimple(email);
    }

    const accessToken = customProvider["system-access-token"] || "";
    const baseUrl = customProvider["base-url"] || "";
    const newApiUser = customProvider["new-api-user"] || "";
    if (!accessToken || !baseUrl) {
      return createCustomAccountSimple(email);
    }
    try {
      const response = await fetchCustomUserSelf(
        baseUrl,
        accessToken,
        newApiUser,
      );
      const data = response.data || {};
      const quota = Number(data.quota || 0);
      const usedQuota = Number(data.used_quota || 0);
      let modelWindows: QuotaWindow[] = [];
      try {
        const pricing = await fetchCustomPricing(
          baseUrl,
          accessToken,
          newApiUser,
        );
        const pricingModels = parseCustomPricingModels(pricing);
        modelWindows = buildCustomModelWindows(pricingModels);
      } catch (pricingError) {
        log.warn(
          `[QuotaManager] Failed to fetch custom pricing for ${email}:`,
          pricingError,
        );
      }
      return createCustomQuotaAccount(email, quota, usedQuota, modelWindows);
    } catch (error) {
      return createCustomAccountError(email, getCustomUsageErrorMessage(error));
    }
  }
  const tokens = await scanTokenFiles();
  const token = tokens.find(
    (t) => t.provider === provider && t.email === email,
  );

  if (!token) {
    log.error(`[QuotaManager] Token not found for account: ${accountId}`);
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

  if (token.provider === "claude") {
    if (!token.authIndex) {
      return createErrorQuotaAccount(
        token,
        "Claude account missing authIndex. Re-import this auth file from management auth-files.",
      );
    }
    try {
      const usage = await fetchClaudeUsage(token);
      return convertClaudeUsageToQuotaAccount(token, usage);
    } catch (error) {
      return createErrorQuotaAccount(
        token,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  return null;
}
