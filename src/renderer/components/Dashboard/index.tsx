import { useEffect, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap,
  Clock,
  Database,
  Users,
} from "lucide-react";
import { useDashboardStore } from "../../stores/dashboard";
import { getProviderIcon } from "../icons/ProviderIcons";

function StatusBadge({ running }: { running: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        running
          ? "bg-[rgba(var(--accent-primary-rgb),0.15)] text-[var(--accent-primary)]"
          : "bg-[rgba(239,68,68,0.15)] text-red-500"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${running ? "bg-[var(--accent-primary)] animate-pulse" : "bg-red-500"}`}
      />
      {running ? "运行中" : "已停止"}
    </div>
  );
}

function HealthGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "var(--accent-primary)" : score >= 50 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="var(--border-primary)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-[var(--text-primary)]">
            {score}
          </span>
        </div>
      </div>
      <span className="text-xs text-[var(--text-muted)] mt-2">{label}</span>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  unit,
  subtitle,
  trend,
  accent = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  accent?: boolean;
}) {
  return (
    <div className="glass-card glass-card-hover p-4">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2 rounded-xl ${accent ? "bg-[rgba(var(--accent-primary-rgb),0.15)]" : "bg-soft"}`}
        >
          {icon}
        </div>
        {trend && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              trend === "up"
                ? "bg-green-500/15 text-green-500"
                : trend === "down"
                  ? "bg-red-500/15 text-red-500"
                  : "bg-muted text-[var(--text-dim)]"
            }`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"}
          </span>
        )}
      </div>
      <div className="text-xs text-[var(--text-muted)] mb-1">{title}</div>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-2xl font-semibold ${accent ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"}`}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-[var(--text-dim)]">{unit}</span>}
      </div>
      {subtitle && (
        <div className="text-xs text-[var(--text-dim)] mt-1">{subtitle}</div>
      )}
    </div>
  );
}

function QuotaBar({
  provider,
  used,
  limit,
  resetAt,
}: {
  provider: string;
  used: number;
  limit: number;
  resetAt: string;
}) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
          {provider}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {used.toLocaleString()} / {limit.toLocaleString()} · 重置: {resetAt}
        </span>
      </div>
      <div className="h-2 bg-soft rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isCritical
              ? "bg-red-500"
              : isWarning
                ? "bg-amber-500"
                : "bg-[var(--accent-primary)]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function AccountStatusCard({
  accounts,
}: {
  accounts: { status: string; count: number }[];
}) {
  const total = accounts.reduce((sum, a) => sum + a.count, 0);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          账户状态
        </span>
        <span className="text-xs text-[var(--text-dim)] ml-auto">
          {total} 个账户
        </span>
      </div>
      <div className="flex gap-2 mb-3">
        {accounts.map(({ status, count }) => (
          <div
            key={status}
            className="flex-1 h-2 rounded-full"
            style={{
              backgroundColor:
                status === "active"
                  ? "var(--accent-primary)"
                  : status === "cooling"
                    ? "#f59e0b"
                    : "#ef4444",
              opacity: count > 0 ? 1 : 0.2,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs">
        {accounts.map(({ status, count }) => (
          <div key={status} className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "active"
                  ? "bg-[var(--accent-primary)]"
                  : status === "cooling"
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
            />
            <span className="text-[var(--text-muted)]">
              {status === "active"
                ? "活跃"
                : status === "cooling"
                  ? "冷却"
                  : "错误"}
              : {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderTable({
  providers,
}: {
  providers: {
    provider: string;
    requests: number;
    tokens: number;
    successRate: number;
    avgLatency: number;
  }[];
}) {
  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">暂无数据</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-[var(--text-dim)] border-b border-[var(--border-primary)]">
            <th className="text-left py-2 font-medium">Provider</th>
            <th className="text-right py-2 font-medium">请求数</th>
            <th className="text-right py-2 font-medium">Tokens</th>
            <th className="text-right py-2 font-medium">成功率</th>
            <th className="text-right py-2 font-medium">延迟</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr
              key={p.provider}
              className="border-b border-[var(--border-secondary)] last:border-0"
            >
              <td className="py-3 text-sm font-medium text-[var(--text-primary)] capitalize flex items-center gap-2">
                <span className="w-5 h-5">{getProviderIcon(p.provider)}</span>
                {p.provider}
              </td>
              <td className="py-3 text-sm text-right text-[var(--text-secondary)]">
                {p.requests.toLocaleString()}
              </td>
              <td className="py-3 text-sm text-right text-[var(--text-secondary)]">
                {p.tokens.toLocaleString()}
              </td>
              <td className="py-3 text-sm text-right">
                <span
                  className={
                    p.successRate >= 95
                      ? "text-[var(--accent-primary)]"
                      : p.successRate >= 80
                        ? "text-amber-500"
                        : "text-red-500"
                  }
                >
                  {p.successRate.toFixed(1)}%
                </span>
              </td>
              <td className="py-3 text-sm text-right text-[var(--text-secondary)]">
                {(p.avgLatency * 1000).toFixed(0)}ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendChart({
  data,
  height = 60,
}: {
  data: { hour: string; count: number }[];
  height?: number;
}) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div
        className="flex items-center justify-center text-[var(--text-dim)] text-sm"
        style={{ height }}
      >
        暂无趋势数据
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 bg-[var(--accent-primary)] rounded-t opacity-70 hover:opacity-100 transition-opacity"
          style={{
            height: `${(d.count / max) * 100}%`,
            minHeight: d.count > 0 ? 4 : 0,
          }}
          title={`${d.hour}: ${d.count} 请求`}
        />
      ))}
    </div>
  );
}

export function Dashboard() {
  const {
    proxyStatus,
    accounts,
    quotas,
    isLoading,
    lastUpdated,
    refreshAll,
    getRequestStats,
    getProviderStats,
    getHealthScore,
    getRequestTrend,
  } = useDashboardStore();

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const stats = useMemo(() => getRequestStats(), [getRequestStats]);
  const providerStats = useMemo(() => getProviderStats(), [getProviderStats]);
  const healthScore = useMemo(() => getHealthScore(), [getHealthScore]);
  const trendData = useMemo(() => getRequestTrend(12), [getRequestTrend]);

  const accountStatus = useMemo(() => {
    const statusCounts = { active: 0, cooling: 0, error: 0 };
    accounts.forEach((a) => {
      if (a.status in statusCounts) {
        statusCounts[a.status as keyof typeof statusCounts]++;
      }
    });
    return [
      { status: "active", count: statusCounts.active },
      { status: "cooling", count: statusCounts.cooling },
      { status: "error", count: statusCounts.error },
    ];
  }, [accounts]);

  const quotaByProvider = useMemo(() => {
    const map = new Map<
      string,
      { used: number; limit: number; resetAt: string }
    >();
    quotas.forEach((q) => {
      const existing = map.get(q.provider);
      if (existing) {
        existing.used += q.used;
        existing.limit += q.limit;
      } else {
        map.set(q.provider, {
          used: q.used,
          limit: q.limit,
          resetAt: q.resetAt,
        });
      }
    });
    return Array.from(map.entries()).map(([provider, data]) => ({
      provider,
      ...data,
    }));
  }, [quotas]);

  const formatLatency = (seconds: number) => `${(seconds * 1000).toFixed(0)}`;
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            仪表盘
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            CLIProxyAPIPlus 运行状态概览
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-[var(--text-dim)]">
              更新于 {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => refreshAll()}
            disabled={isLoading}
            className="glass-btn p-2 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <StatusBadge running={proxyStatus.running} />
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="flex items-center gap-6">
            <HealthGauge score={healthScore.overall} label="总体健康度" />
            <div className="hidden sm:flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)] rounded-full"
                    style={{ width: `${healthScore.availability}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  可用性 {healthScore.availability}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-secondary)] rounded-full"
                    style={{ width: `${healthScore.performance}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  性能 {healthScore.performance}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-tertiary)] rounded-full"
                    style={{ width: `${healthScore.quota}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  配额 {healthScore.quota}%
                </span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block w-px h-24 bg-[var(--border-primary)]" />

          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--accent-primary)]">
                {stats.successRate.toFixed(1)}%
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                成功率
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--text-primary)]">
                {stats.requestsPerMinute}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                请求/分钟
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--text-primary)]">
                {formatLatency(stats.avgLatency)}
                <span className="text-base font-normal">ms</span>
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                平均延迟
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--text-primary)]">
                {formatTokens(stats.totalTokens)}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                总 Tokens
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity className="w-5 h-5 text-[var(--accent-primary)]" />}
          title="总请求数"
          value={stats.totalRequests.toLocaleString()}
          accent
        />
        <MetricCard
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          title="成功请求"
          value={stats.successCount.toLocaleString()}
          subtitle={`错误: ${stats.errorCount}`}
        />
        <MetricCard
          icon={<Clock className="w-5 h-5 text-[var(--accent-secondary)]" />}
          title="P95 延迟"
          value={formatLatency(stats.p95Latency)}
          unit="ms"
          subtitle={`P99: ${formatLatency(stats.p99Latency)}ms`}
        />
        <MetricCard
          icon={<Database className="w-5 h-5 text-[var(--accent-tertiary)]" />}
          title="Token 消耗"
          value={formatTokens(stats.totalTokens)}
          subtitle={
            stats.totalRequests > 0
              ? `${(stats.totalTokens / stats.totalRequests).toFixed(0)} /请求`
              : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs tracking-wider text-[var(--text-dim)] uppercase">
                配额使用
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">
                Provider 配额
              </h3>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {quotaByProvider.length} 个 Provider
            </span>
          </div>
          {quotaByProvider.length > 0 ? (
            <div className="space-y-1">
              {quotaByProvider.map((q) => (
                <QuotaBar key={q.provider} {...q} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)]">
              暂无配额数据
            </div>
          )}
        </div>

        <div className="space-y-4">
          <AccountStatusCard accounts={accountStatus} />

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                请求趋势
              </span>
              <span className="text-xs text-[var(--text-dim)]">
                过去 12 小时
              </span>
            </div>
            <TrendChart data={trendData} />
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs tracking-wider text-[var(--text-dim)] uppercase">
              性能分析
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">
              Provider 效率
            </h3>
          </div>
          <Zap className="w-5 h-5 text-[var(--accent-tertiary)]" />
        </div>
        <ProviderTable providers={providerStats} />
      </div>

      {(stats.successRate < 95 || healthScore.overall < 80) && (
        <div className="glass-card p-4 border-l-4 border-amber-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <div className="font-medium text-[var(--text-primary)]">
                需要关注
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                {stats.successRate < 95 &&
                  `成功率 (${stats.successRate.toFixed(1)}%) 低于 95% 阈值。`}
                {healthScore.overall < 80 &&
                  ` 总体健康度 (${healthScore.overall}) 低于 80 分。`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
