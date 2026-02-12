import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap,
  Clock,
  Database,
  Users,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  useDashboardStore,
  useHealthScore,
  useProviderStats,
  useRequestStats,
} from "../../stores/dashboard";
import { useTranslations } from "../../stores/settings";
import { getProviderIcon } from "../icons/ProviderIcons";
import { Modal } from "../ui/Modal";

function StatusBadge({
  running,
  runningText,
  stoppedText,
}: {
  running: boolean;
  runningText: string;
  stoppedText: string;
}) {
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
      {running ? runningText : stoppedText}
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

export function QuotaBar({
  provider,
  used,
  limit,
  action,
}: {
  provider: string;
  used: number;
  limit: number;
  action?: React.ReactNode;
}) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div className="py-2 group/quota">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
            {provider}
          </span>
          {action}
        </div>
        <span className="text-xs text-[var(--text-muted)] font-mono">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="h-2 bg-soft rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isCritical
              ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
              : isWarning
                ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                : "bg-[var(--accent-primary)] shadow-[0_0_8px_rgba(var(--accent-primary-rgb),0.4)]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function AccountStatusCard({
  accounts,
  labels,
}: {
  accounts: { status: string; count: number }[];
  labels: {
    accountStatus: string;
    accountsCount: string;
    active: string;
    cooling: string;
    error: string;
  };
}) {
  const total = accounts.reduce((sum, a) => sum + a.count, 0);
  const getStatusLabel = (status: string) => {
    if (status === "active") return labels.active;
    if (status === "cooling") return labels.cooling;
    return labels.error;
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {labels.accountStatus}
        </span>
        <span className="text-xs text-[var(--text-dim)] ml-auto">
          {labels.accountsCount.replace("{count}", String(total))}
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
              {getStatusLabel(status)}: {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderTable({
  providers,
  labels,
}: {
  providers: {
    provider: string;
    requests: number;
    tokens: number;
    successRate: number;
    avgLatency: number;
  }[];
  labels: {
    noData: string;
    provider: string;
    requests: string;
    tokens: string;
    successRate: string;
    latency: string;
  };
}) {
  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        {labels.noData}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-[var(--text-dim)] border-b border-[var(--glass-border)]">
            <th className="text-left py-2 font-medium">{labels.provider}</th>
            <th className="text-right py-2 font-medium">{labels.requests}</th>
            <th className="text-right py-2 font-medium">{labels.tokens}</th>
            <th className="text-right py-2 font-medium">
              {labels.successRate}
            </th>
            <th className="text-right py-2 font-medium">{labels.latency}</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr
              key={p.provider}
              className="border-b border-[var(--glass-border)] last:border-b-0"
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
  labels,
}: {
  data: { hour: string; count: number }[];
  height?: number;
  labels: {
    noTrendData: string;
    tooltip: string;
  };
}) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div
        className="flex items-center justify-center text-[var(--text-dim)] text-sm"
        style={{ height }}
      >
        {labels.noTrendData}
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
          title={labels.tooltip
            .replace("{hour}", d.hour)
            .replace("{count}", String(d.count))}
        />
      ))}
    </div>
  );
}

function TokenBreakdownCard({
  breakdown,
  labels,
}: {
  breakdown: {
    input: number;
    output: number;
    reasoning: number;
    cached: number;
    total: number;
  } | null;
  labels: {
    title: string;
    noData: string;
    input: string;
    output: string;
    reasoning: string;
    cached: string;
    total: string;
  };
}) {
  if (!breakdown || breakdown.total === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {labels.title}
          </span>
        </div>
        <div className="text-center py-4 text-[var(--text-muted)] text-sm">
          {labels.noData}
        </div>
      </div>
    );
  }

  const items = [
    {
      label: labels.input,
      value: breakdown.input,
      color: "var(--accent-primary)",
    },
    {
      label: labels.output,
      value: breakdown.output,
      color: "var(--accent-secondary)",
    },
    {
      label: labels.reasoning,
      value: breakdown.reasoning,
      color: "var(--accent-tertiary)",
    },
    { label: labels.cached, value: breakdown.cached, color: "#10b981" },
  ];

  const formatTokens = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {labels.title}
          </span>
        </div>
        <span className="text-xs text-[var(--text-dim)]">
          {formatTokens(breakdown.total)} {labels.total}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const percentage =
            breakdown.total > 0 ? (item.value / breakdown.total) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--text-muted)]">{item.label}</span>
                <span className="text-[var(--text-primary)]">
                  {formatTokens(item.value)} ({percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-1.5 bg-soft rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { Page } from "../Sidebar";

interface DashboardProps {
  onNavigate?: (page: Page) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const t = useTranslations();
  const {
    proxyStatus,
    accounts,
    quotas,
    isLoading,
    lastUpdated,
    refreshAll,
    getRequestTrend,
    getTokenBreakdown,
  } = useDashboardStore();

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const stats = useRequestStats();
  const providerStats = useProviderStats();
  const healthScore = useHealthScore();
  const [selectedCustomProvider, setSelectedCustomProvider] = useState<
    string | null
  >(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const trendData = useMemo(() => getRequestTrend(12), [getRequestTrend]);
  const tokenBreakdown = useMemo(
    () => getTokenBreakdown(),
    [getTokenBreakdown],
  );

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

  const customQuotaOptions = useMemo(() => {
    const options = quotas
      .filter((q) => q.provider === "custom")
      .map((q) => {
        const account = accounts.find((a) => a.id === q.accountId);
        const name = q.accountId.startsWith("custom-")
          ? q.accountId.slice("custom-".length)
          : q.accountId;
        return {
          id: q.accountId,
          name: name || t.dashboard.customPrefix,
          protocol: account?.provider || "custom",
          used: q.used,
          limit: q.limit,
          resetAt: q.resetAt,
        };
      });
    return options;
  }, [quotas, accounts, t.dashboard.customPrefix]);

  useEffect(() => {
    if (customQuotaOptions.length === 0) {
      setSelectedCustomProvider(null);
      return;
    }
    if (
      !selectedCustomProvider ||
      !customQuotaOptions.some((opt) => opt.id === selectedCustomProvider)
    ) {
      setSelectedCustomProvider(customQuotaOptions[0].id);
    }
  }, [customQuotaOptions, selectedCustomProvider]);

  const quotaByProvider = useMemo(() => {
    const map = new Map<
      string,
      { used: number; limit: number; resetAt: string }
    >();
    quotas
      .filter((q) => q.provider !== "custom")
      .forEach((q) => {
        if (!map.has(q.provider)) {
          map.set(q.provider, {
            used: q.used,
            limit: q.limit,
            resetAt: q.resetAt,
          });
        }
      });

    const selectedCustom = selectedCustomProvider
      ? customQuotaOptions.find((opt) => opt.id === selectedCustomProvider)
      : customQuotaOptions[0];

    const entries = Array.from(map.entries()).map(([provider, data]) => ({
      provider,
      ...data,
    }));

    if (selectedCustom) {
      entries.push({
        provider: `${t.dashboard.customPrefix} · ${selectedCustom.name}`,
        used: selectedCustom.used,
        limit: selectedCustom.limit,
        resetAt: selectedCustom.resetAt,
      });
    }

    return entries;
  }, [
    customQuotaOptions,
    quotas,
    selectedCustomProvider,
    t.dashboard.customPrefix,
  ]);

  const customProviderCount = customQuotaOptions.length;

  const formatLatency = (seconds: number) => `${(seconds * 1000).toFixed(0)}`;
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {t.dashboard.title}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {t.dashboard.overview}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-[var(--text-dim)]">
              {t.dashboard.updatedAt} {lastUpdated.toLocaleTimeString()}
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
          <StatusBadge
            running={proxyStatus.running}
            runningText={t.status.running}
            stoppedText={t.status.stopped}
          />
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="flex items-center gap-6">
            <HealthGauge
              score={healthScore.overall}
              label={t.dashboard.overallHealth}
            />
            <div className="hidden sm:flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)] rounded-full"
                    style={{ width: `${healthScore.availability}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {t.dashboard.availability}{" "}
                  {Math.round(healthScore.availability)}%
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
                  {t.dashboard.performance}{" "}
                  {Math.round(healthScore.performance)}%
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
                  {t.dashboard.quotaHealth} {Math.round(healthScore.quota)}%
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
                {t.dashboard.successRateLabel}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--text-primary)]">
                {stats.requestsPerMinute}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {t.dashboard.requestsPerMinute}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--text-primary)]">
                {formatLatency(stats.avgLatency)}
                <span className="text-base font-normal">ms</span>
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {t.dashboard.avgLatencyLabel}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--text-primary)]">
                {formatTokens(stats.totalTokens)}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {t.dashboard.totalTokensLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity className="w-5 h-5 text-[var(--accent-primary)]" />}
          title={t.dashboard.totalRequests}
          value={stats.totalRequests.toLocaleString()}
          accent
        />
        <MetricCard
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          title={t.dashboard.successRequests}
          value={stats.successCount.toLocaleString()}
          subtitle={t.dashboard.errorCount.replace(
            "{count}",
            String(stats.errorCount),
          )}
        />
        <MetricCard
          icon={<Clock className="w-5 h-5 text-[var(--accent-secondary)]" />}
          title={t.dashboard.p95Latency}
          value={formatLatency(stats.p95Latency)}
          unit="ms"
          subtitle={t.dashboard.p99Latency.replace(
            "{value}",
            formatLatency(stats.p99Latency),
          )}
        />
        <MetricCard
          icon={<Database className="w-5 h-5 text-[var(--accent-tertiary)]" />}
          title={t.dashboard.tokenConsumption}
          value={formatTokens(stats.totalTokens)}
          subtitle={
            stats.totalRequests > 0
              ? t.dashboard.perRequest.replace(
                  "{count}",
                  (stats.totalTokens / stats.totalRequests).toFixed(0),
                )
              : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs tracking-wider text-[var(--text-dim)] uppercase">
                {t.dashboard.quotaUsage}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {t.dashboard.providerQuotaTitle}
                </h3>
                <div className="group relative flex items-center justify-center cursor-help">
                  <Info className="w-3.5 h-3.5 text-[var(--text-dim)] hover:text-[var(--accent-primary)] transition-colors" />
                  <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--bg-secondary)] backdrop-blur-xl border border-[var(--glass-border)] rounded-lg text-xs text-[var(--text-primary)] whitespace-nowrap shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    {t.dashboard.providerQuotaTip}
                    <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[calc(50%-1px)] w-2 h-2 bg-[var(--bg-secondary)] border-r border-b border-[var(--glass-border)] rotate-45" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate?.("quota")}
                className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-all font-medium"
              >
                {t.dashboard.viewAll}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          {quotaByProvider.length > 0 ? (
            <div className="space-y-1">
              {quotaByProvider.map((q) => (
                <QuotaBar
                  key={q.provider}
                  {...q}
                  action={
                    q.provider.includes(t.dashboard.customPrefix) &&
                    customProviderCount > 1 ? (
                      <button
                        onClick={() => setIsCustomModalOpen(true)}
                        className="p-1 rounded-md bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] opacity-0 group-hover/quota:opacity-100 transition-all hover:bg-[var(--accent-primary)]/20 active:scale-90"
                        title={t.dashboard.switchCustomProvider}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    ) : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)]">
              {t.dashboard.noQuotaData}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <AccountStatusCard
            accounts={accountStatus}
            labels={{
              accountStatus: t.dashboard.accountStatus,
              accountsCount: t.dashboard.accountsCount,
              active: t.dashboard.active,
              cooling: t.dashboard.cooling,
              error: t.dashboard.error,
            }}
          />

          <TokenBreakdownCard
            breakdown={tokenBreakdown}
            labels={{
              title: t.dashboard.tokenBreakdown,
              noData: t.dashboard.noTokenData,
              input: t.dashboard.input,
              output: t.dashboard.output,
              reasoning: t.dashboard.reasoning,
              cached: t.dashboard.cached,
              total: t.dashboard.total,
            }}
          />

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {t.dashboard.requestTrend}
              </span>
              <span className="text-xs text-[var(--text-dim)]">
                {t.dashboard.past12Hours}
              </span>
            </div>
            <TrendChart
              data={trendData}
              labels={{
                noTrendData: t.dashboard.noTrendData,
                tooltip: t.dashboard.trendTooltip,
              }}
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs tracking-wider text-[var(--text-dim)] uppercase">
              {t.dashboard.performanceAnalysis}
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">
              {t.dashboard.providerEfficiency}
            </h3>
          </div>
          <Zap className="w-5 h-5 text-[var(--accent-tertiary)]" />
        </div>
        <ProviderTable
          providers={providerStats}
          labels={{
            noData: t.dashboard.noData,
            provider: t.dashboard.providerColumn,
            requests: t.dashboard.requestsColumn,
            tokens: t.dashboard.tokensColumn,
            successRate: t.dashboard.successRateLabel,
            latency: t.dashboard.latencyColumn,
          }}
        />
      </div>

      {(stats.successRate < 95 || healthScore.overall < 80) && (
        <div className="glass-card p-4 border-l-4 border-amber-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <div className="font-medium text-[var(--text-primary)]">
                {t.dashboard.needsAttention}
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                {stats.successRate < 95 &&
                  t.dashboard.successRateLow.replace(
                    "{rate}",
                    stats.successRate.toFixed(1),
                  )}
                {healthScore.overall < 80 &&
                  ` ${t.dashboard.healthScoreLow.replace("{score}", String(healthScore.overall))}`}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
              <Database className="w-5 h-5" />
            </div>
            <span>{t.dashboard.customProviderQuota}</span>
          </div>
        }
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customQuotaOptions.map((option) => (
            <div
              key={option.id}
              className={`group relative p-4 rounded-2xl border transition-all duration-300 ${
                selectedCustomProvider === option.id
                  ? "bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/30 shadow-lg shadow-[var(--accent-primary)]/5"
                  : "bg-[var(--bg-secondary)]/20 border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] hover:bg-[var(--bg-secondary)]/40"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] border border-[var(--glass-border)] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    {getProviderIcon(option.protocol, undefined, 24)}
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)] leading-tight">
                      {option.name}
                    </h4>
                    <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">
                      {option.id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[var(--accent-primary)]">
                    {option.limit > 0
                      ? `${Math.round((option.used / option.limit) * 100)}%`
                      : "0%"}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                    {t.dashboard.used}
                  </div>
                </div>
              </div>

              <QuotaBar
                provider={option.name}
                used={option.used}
                limit={option.limit}
              />

              <div className="mt-4 pt-4 border-t border-[var(--glass-border)] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[var(--text-dim)]" />
                  <span className="text-[10px] text-[var(--text-dim)] font-medium">
                    {t.dashboard.updatedAt}{" "}
                    {option.resetAt || t.dashboard.justNow}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomProvider(option.id);
                    setIsCustomModalOpen(false);
                  }}
                  className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                    selectedCustomProvider === option.id
                      ? "bg-[var(--accent-primary)] text-white"
                      : "bg-[var(--text-primary)]/5 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]"
                  }`}
                >
                  {selectedCustomProvider === option.id
                    ? t.dashboard.showing
                    : t.dashboard.setPreferred}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
