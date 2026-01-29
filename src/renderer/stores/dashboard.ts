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

export interface DashboardState {
  proxyStatus: ProxyStatus;
  accounts: Account[];
  quotas: QuotaInfo[];
  logs: LogEntry[];
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;

  fetchProxyStatus: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchQuotas: () => Promise<void>;
  fetchLogs: (limit?: number) => Promise<void>;
  refreshAll: () => Promise<void>;

  getRequestStats: () => RequestStats;
  getProviderStats: () => ProviderStats[];
  getModelStats: () => ModelStats[];
  getHealthScore: () => HealthScore;
  getRecentRequests: (minutes: number) => LogEntry[];
  getRequestTrend: (hours: number) => { hour: string; count: number }[];
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
      const accounts = await window.electronAPI?.api.getAccounts();
      if (accounts) {
        set({ accounts });
      }
    } catch (error) {
      console.error("[Dashboard] Failed to fetch accounts:", error);
    }
  },

  fetchQuotas: async () => {
    try {
      const quotas = await window.electronAPI?.api.getQuota();
      if (quotas) {
        set({ quotas });
      }
    } catch (error) {
      console.error("[Dashboard] Failed to fetch quotas:", error);
    }
  },

  fetchLogs: async (limit = 500) => {
    try {
      const logs = await window.electronAPI?.api.getLogs(limit);
      if (logs) {
        set({ logs });
      }
    } catch (error) {
      console.error("[Dashboard] Failed to fetch logs:", error);
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
      ]);
      set({ lastUpdated: new Date() });
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  getRequestStats: () => {
    const { logs } = get();
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
    const latencies = logs.map((l) => l.duration);

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const recentLogs = logs.filter(
      (l) => new Date(l.timestamp).getTime() > oneMinuteAgo,
    );

    return {
      totalRequests: logs.length,
      successCount: successLogs.length,
      errorCount: errorLogs.length,
      successRate:
        logs.length > 0 ? (successLogs.length / logs.length) * 100 : 0,
      avgLatency:
        latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0,
      p95Latency: calculatePercentile(latencies, 95),
      p99Latency: calculatePercentile(latencies, 99),
      totalTokens: logs.reduce((sum, l) => sum + l.tokens, 0),
      requestsPerMinute: recentLogs.length,
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
