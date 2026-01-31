import { create } from "zustand";
import { DEFAULT_PORT } from "../../shared/constants";

export interface ProxyStatus {
  running: boolean;
  port: number;
  version: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  tokens: number;
  status: "success" | "error";
  duration: number;
}

export interface Account {
  id: string;
  provider: string;
  email: string;
  status: "active" | "cooling" | "error";
  quotaUsed: number;
  quotaLimit: number;
}

export interface QuotaInfo {
  provider: string;
  accountId: string;
  used: number;
  limit: number;
  resetAt: string;
}

export interface RequestStats {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  totalTokens: number;
  requestsPerMinute: number;
}

export interface ProviderStats {
  provider: string;
  requests: number;
  tokens: number;
  successRate: number;
  avgLatency: number;
}

export interface ModelStats {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
}

export interface HealthScore {
  overall: number;
  availability: number;
  performance: number;
  quota: number;
}

export interface TokenBreakdown {
  input: number;
  output: number;
  reasoning: number;
  cached: number;
  total: number;
}

export interface DashboardState {
  proxyStatus: ProxyStatus;
  accounts: Account[];
  quotas: QuotaInfo[];
  logs: LogEntry[];
  usage: UsageResponse | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;

  fetchProxyStatus: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchQuotas: () => Promise<void>;
  fetchLogs: (limit?: number) => Promise<void>;
  fetchUsage: () => Promise<void>;
  refreshAll: () => Promise<void>;

  getRequestStats: () => RequestStats;
  getProviderStats: () => ProviderStats[];
  getModelStats: () => ModelStats[];
  getHealthScore: () => HealthScore;
  getRecentRequests: (minutes: number) => LogEntry[];
  getRequestTrend: (hours: number) => { hour: string; count: number }[];
  getTokenBreakdown: () => TokenBreakdown | null;
  getUsageTrend: () => { hour: string; count: number }[];
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function parseTimeAgo(resetAt: string): number {
  const match = resetAt.match(/(\d+)h\s*(\d+)m/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return Infinity;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  proxyStatus: { running: false, port: DEFAULT_PORT, version: "unknown" },
  accounts: [],
  quotas: [],
  logs: [],
  usage: null,
  isLoading: false,
  lastUpdated: null,
  error: null,

  fetchProxyStatus: async () => {
    try {
      const status = await window.electronAPI?.proxy.status();
      if (status) {
        set((state) => ({
          proxyStatus: {
            ...state.proxyStatus,
            running: status.running,
            port: status.port,
          },
        }));
      }
    } catch (error) {
      console.error("[Dashboard] Failed to fetch proxy status:", error);
    }
  },

  fetchAccounts: async () => {
    try {
      const result = await window.electronAPI?.providers.getAccounts();
      if (result?.success && result.accounts) {
        const accounts: Account[] = result.accounts.map(
          (ta: {
            id: string;
            provider: string;
            email: string;
            status: string;
          }) => ({
            id: ta.id,
            provider: ta.provider,
            email: ta.email,
            status: (ta.status === "online"
              ? "active"
              : "error") as Account["status"],
            quotaUsed: 0,
            quotaLimit: 100,
          }),
        );
        set({ accounts });
      }
    } catch (error) {
      console.error("[Dashboard] Failed to fetch accounts:", error);
    }
  },

  fetchQuotas: async () => {
    if (!window.electronAPI?.quota?.refreshAll) {
      set({ quotas: [] });
      return;
    }
    try {
      const result = await window.electronAPI.quota.refreshAll();
      if (result?.success && Array.isArray(result.accounts)) {
        const quotas: QuotaInfo[] = result.accounts.map(
          (account: {
            id: string;
            provider: string;
            rateLimits?: {
              primary?: {
                usedPercent?: number;
                resetIn?: string;
              };
            };
          }) => {
            const usedPercent = account.rateLimits?.primary?.usedPercent ?? 0;
            return {
              provider: account.provider,
              accountId: account.id,
              used: usedPercent,
              limit: 100,
              resetAt: account.rateLimits?.primary?.resetIn || "-",
            };
          },
        );
        set({ quotas });
      } else {
        set({ quotas: [] });
      }
    } catch (error) {
      console.error("[Dashboard] Failed to fetch quotas:", error);
      set({ quotas: [] });
    }
  },

  fetchLogs: async (limit = 500) => {
    try {
      const entries = await window.electronAPI?.logs.fetch(limit);
      if (entries && Array.isArray(entries)) {
        const logs: LogEntry[] = entries.map(
          (e: {
            id: string;
            timestamp: string;
            provider?: string;
            model?: string;
            status: string;
            duration?: number;
          }) => ({
            id: e.id,
            timestamp: e.timestamp,
            provider: e.provider || "unknown",
            model: e.model || "unknown",
            tokens: 0,
            status: (e.status === "success"
              ? "success"
              : "error") as LogEntry["status"],
            duration: e.duration || 0,
          }),
        );
        set({ logs });
      }
    } catch (error) {
      console.error("[Dashboard] Failed to fetch logs:", error);
    }
  },

  fetchUsage: async () => {
    try {
      const usage = await window.electronAPI?.api.getUsage();
      if (usage) {
        set({ usage });
      }
    } catch (error) {
      console.error("[Dashboard] Failed to fetch usage:", error);
    }
  },

  refreshAll: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().fetchProxyStatus(),
        get().fetchAccounts(),
        get().fetchQuotas(),
        get().fetchLogs(),
        get().fetchUsage(),
      ]);
      set({ lastUpdated: new Date() });
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  getRequestStats: () => {
    const { usage, logs } = get();

    const validLatencies = logs.map((l) => l.duration).filter((d) => d > 0);
    const avgLatency =
      validLatencies.length > 0
        ? validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length
        : 0;

    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const recentLogs = logs.filter(
      (l) => new Date(l.timestamp).getTime() > fiveMinAgo,
    );
    const requestsPerMinute =
      recentLogs.length > 0 ? Math.round(recentLogs.length / 5) : 0;

    if (usage && usage.usage.total_requests > 0) {
      const u = usage.usage;
      return {
        totalRequests: u.total_requests,
        successCount: u.success_count,
        errorCount: u.failure_count,
        successRate:
          u.total_requests > 0 ? (u.success_count / u.total_requests) * 100 : 0,
        avgLatency,
        p95Latency: calculatePercentile(validLatencies, 95),
        p99Latency: calculatePercentile(validLatencies, 99),
        totalTokens: u.total_tokens,
        requestsPerMinute,
      };
    }

    if (logs.length === 0) {
      return {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        successRate: 0,
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        totalTokens: 0,
        requestsPerMinute: 0,
      };
    }

    const successLogs = logs.filter((l) => l.status === "success");
    const errorLogs = logs.filter((l) => l.status === "error");

    return {
      totalRequests: logs.length,
      successCount: successLogs.length,
      errorCount: errorLogs.length,
      successRate:
        logs.length > 0 ? (successLogs.length / logs.length) * 100 : 0,
      avgLatency,
      p95Latency: calculatePercentile(validLatencies, 95),
      p99Latency: calculatePercentile(validLatencies, 99),
      totalTokens: logs.reduce((sum, l) => sum + l.tokens, 0),
      requestsPerMinute,
    };
  },

  getProviderStats: () => {
    const { logs } = get();
    const statsMap = new Map<
      string,
      { requests: number; tokens: number; success: number; latencies: number[] }
    >();

    logs.forEach((log) => {
      const existing = statsMap.get(log.provider);
      if (existing) {
        existing.requests++;
        existing.tokens += log.tokens;
        if (log.status === "success") existing.success++;
        existing.latencies.push(log.duration);
      } else {
        statsMap.set(log.provider, {
          requests: 1,
          tokens: log.tokens,
          success: log.status === "success" ? 1 : 0,
          latencies: [log.duration],
        });
      }
    });

    return Array.from(statsMap.entries()).map(([provider, data]) => ({
      provider,
      requests: data.requests,
      tokens: data.tokens,
      successRate: data.requests > 0 ? (data.success / data.requests) * 100 : 0,
      avgLatency:
        data.latencies.length > 0
          ? data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length
          : 0,
    }));
  },

  getModelStats: () => {
    const { logs } = get();
    const statsMap = new Map<
      string,
      { provider: string; requests: number; tokens: number }
    >();

    logs.forEach((log) => {
      const key = `${log.provider}:${log.model}`;
      const existing = statsMap.get(key);
      if (existing) {
        existing.requests++;
        existing.tokens += log.tokens;
      } else {
        statsMap.set(key, {
          provider: log.provider,
          requests: 1,
          tokens: log.tokens,
        });
      }
    });

    return Array.from(statsMap.entries())
      .map(([key, data]) => ({
        model: key.split(":")[1],
        provider: data.provider,
        requests: data.requests,
        tokens: data.tokens,
      }))
      .sort((a, b) => b.requests - a.requests);
  },

  getHealthScore: () => {
    const { proxyStatus, accounts, quotas } = get();
    const stats = get().getRequestStats();

    const availability = proxyStatus.running ? 100 : 0;

    let performance = 100;
    if (stats.avgLatency > 5) performance -= 30;
    else if (stats.avgLatency > 3) performance -= 15;
    else if (stats.avgLatency > 2) performance -= 5;

    if (stats.successRate < 90) performance -= 30;
    else if (stats.successRate < 95) performance -= 15;
    else if (stats.successRate < 99) performance -= 5;

    const activeAccounts = accounts.filter((a) => a.status === "active").length;
    const totalAccounts = accounts.length;
    const accountHealth =
      totalAccounts > 0 ? (activeAccounts / totalAccounts) * 100 : 0;

    const totalUsed = quotas.reduce((sum, q) => sum + q.used, 0);
    const totalLimit = quotas.reduce((sum, q) => sum + q.limit, 0);
    const quotaUsageRate = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
    const quotaHealth = Math.max(0, 100 - quotaUsageRate);

    const overall = Math.round(
      availability * 0.3 +
        Math.max(0, performance) * 0.3 +
        accountHealth * 0.2 +
        quotaHealth * 0.2,
    );

    return {
      overall: Math.max(0, Math.min(100, overall)),
      availability,
      performance: Math.max(0, Math.min(100, performance)),
      quota: Math.max(0, Math.min(100, quotaHealth)),
    };
  },

  getRecentRequests: (minutes: number) => {
    const { logs } = get();
    const cutoff = Date.now() - minutes * 60 * 1000;
    return logs.filter((l) => new Date(l.timestamp).getTime() > cutoff);
  },

  getRequestTrend: (hours: number) => {
    const { logs } = get();
    const now = new Date();
    const trend: { hour: string; count: number }[] = [];

    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = new Date(now);
      hourStart.setHours(now.getHours() - i, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourStart.getHours() + 1);

      const count = logs.filter((l) => {
        const ts = new Date(l.timestamp).getTime();
        return ts >= hourStart.getTime() && ts < hourEnd.getTime();
      }).length;

      trend.push({
        hour: hourStart.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        count,
      });
    }

    return trend;
  },

  getTokenBreakdown: () => {
    const { usage } = get();
    if (!usage) return null;

    let input = 0;
    let output = 0;
    let reasoning = 0;
    let cached = 0;

    Object.values(usage.usage.apis).forEach((api) => {
      Object.values(api.models).forEach((model) => {
        model.details.forEach((req) => {
          input += req.tokens.input_tokens;
          output += req.tokens.output_tokens;
          reasoning += req.tokens.reasoning_tokens;
          cached += req.tokens.cached_tokens;
        });
      });
    });

    const total = input + output + reasoning + cached;
    if (total === 0) return null;

    return { input, output, reasoning, cached, total };
  },

  getUsageTrend: () => {
    const { usage } = get();
    if (!usage) return [];

    const hourlyData = usage.usage.requests_by_hour;
    return Object.entries(hourlyData)
      .map(([hour, count]) => ({
        hour: `${hour}:00`,
        count,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  },
}));

export function useRequestStats() {
  return useDashboardStore((state) => state.getRequestStats());
}

export function useProviderStats() {
  return useDashboardStore((state) => state.getProviderStats());
}

export function useHealthScore() {
  return useDashboardStore((state) => state.getHealthScore());
}
