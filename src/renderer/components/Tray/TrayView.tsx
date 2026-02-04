import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Power,
  ExternalLink,
  Copy,
  Check,
  Play,
  Square,
  RotateCw,
} from "lucide-react";
import {
  useQuotaStore,
  QuotaAccount,
  QuotaWindow,
  ProviderType,
} from "@renderer/stores/quota";
import {
  useSettingsStore,
  useTheme,
  useTranslations,
  startProxy,
  stopProxy,
} from "@renderer/stores/settings";
import { getProviderIcon } from "@renderer/components/icons/ProviderIcons";
import { SunIcon } from "../ui/sun";
import { MoonIcon } from "../ui/moon";

function ProgressBar({
  percent,
  label,
  resetIn,
  provider,
}: {
  percent: number;
  label?: string;
  resetIn?: string;
  provider: ProviderType;
}) {
  const t = useTranslations();
  const displayLabel = useMemo(() => {
    if (provider !== "codex") {
      return label || "";
    }
    if (label?.includes("5小时") || label?.includes("5-Hour")) {
      return t.quota.fiveHourLimit;
    }
    if (
      label?.includes("7天") ||
      label?.includes("7-Day") ||
      label?.includes("Weekly")
    ) {
      return t.quota.weeklyLimit;
    }
    return "";
  }, [label, provider, t.quota.fiveHourLimit, t.quota.weeklyLimit]);
  const shouldShowLabel = displayLabel.length > 0;

  const colorClass = useMemo(() => {
    if (percent >= 90)
      return "bg-neon-red shadow-[0_0_8px_rgba(239,68,68,0.4)] dark:shadow-[0_0_12px_rgba(239,68,68,0.3)]";
    if (percent >= 70)
      return "bg-neon-amber shadow-[0_0_8px_rgba(245,158,11,0.4)] dark:shadow-[0_0_12px_rgba(245,158,11,0.3)]";
    return "bg-neon-green shadow-[0_0_8px_rgba(16,185,129,0.4)] dark:shadow-[0_0_12px_rgba(16,185,129,0.3)]";
  }, [percent]);

  return (
    <div className="w-full min-w-0">
      {shouldShowLabel && (
        <div className="flex justify-between items-center mb-1.5 px-0.5">
          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest truncate max-w-[55%]">
            {displayLabel}
          </span>
          <div className="flex items-center gap-1.5">
            {resetIn && (
              <span className="text-[9px] font-bold text-[var(--text-muted)] whitespace-nowrap italic opacity-80">
                {resetIn}
              </span>
            )}
            <span className="text-[10px] font-black text-[var(--text-muted)] font-mono tabular-nums">
              {Math.round(percent)}%
            </span>
          </div>
        </div>
      )}
      <div className="h-1.5 w-full bg-[var(--text-primary)]/10 dark:bg-black/40 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(percent, 1.5)}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full transition-colors duration-500 ${colorClass}`}
        />
      </div>
    </div>
  );
}

function AccountItem({ account }: { account: QuotaAccount }) {
  const windows = useMemo(() => {
    const list: QuotaWindow[] = [];
    if (account.rateLimits.primary) list.push(account.rateLimits.primary);
    if (account.rateLimits.secondary) list.push(account.rateLimits.secondary);

    if (account.provider !== "custom" && account.rateLimits.additional)
      list.push(...account.rateLimits.additional);

    return list.slice(0, 4);
  }, [account.provider, account.rateLimits]);

  return (
    <div className="group relative p-4 rounded-[20px] bg-[var(--text-primary)]/[0.02] dark:bg-white/[0.03] hover:bg-[var(--text-primary)]/[0.04] dark:hover:bg-white/[0.06] transition-all duration-500 border border-[var(--text-primary)]/[0.05] dark:border-white/[0.05] hover:border-[var(--text-primary)]/10 dark:hover:border-white/10">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs font-black text-[var(--text-primary)] truncate select-none tracking-tight font-mono"
            title={account.email}
          >
            {account.email}
          </span>
          {account.badge && (
            <span className="flex-none text-[8px] font-black px-1.5 py-0.5 rounded-full bg-[var(--text-primary)]/[0.06] dark:bg-white/10 text-[var(--text-muted)] tracking-widest uppercase">
              {account.badge}
            </span>
          )}
        </div>
        {account.status === "limited" && (
          <span className="flex-none text-[8px] text-neon-red font-black uppercase tracking-[0.2em] animate-pulse">
            Limit
          </span>
        )}
      </div>
      {windows.length > 0 && (
        <div
          className={`grid gap-x-6 gap-y-4 ${windows.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {windows.map((w, i) => (
            <ProgressBar
              key={i}
              percent={w.usedPercent}
              label={w.label}
              resetIn={w.resetIn}
              provider={account.provider}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TrayView() {
  const t = useTranslations();
  const { theme, toggleTheme } = useTheme();
  const port = useSettingsStore((s) => s.port);
  const proxyRunning = useSettingsStore((s) => s.proxyRunning);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    providers,
    selectedProvider,
    selectProvider,
    accounts,
    loadProviders,
    isLoading,
    lastUpdated,
    refreshQuotas,
  } = useQuotaStore();

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    if (!selectedProvider && providers.length > 0) {
      const firstWithAccounts =
        providers.find((p) => p.accountCount > 0) || providers[0];
      selectProvider(firstWithAccounts.id);
    }
  }, [providers, selectedProvider, selectProvider]);

  useEffect(() => {
    window.electronAPI?.tray?.setHeight?.(560);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshQuotas();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const timeAgo = useMemo(() => {
    if (!lastUpdated) return "";
    const seconds = Math.floor(
      (new Date().getTime() - lastUpdated.getTime()) / 1000,
    );
    if (seconds < 60) return t.quota.justNow;
    const minutes = Math.floor(seconds / 60);
    return t.quota.minutesAgo.replace("{minutes}", minutes.toString());
  }, [lastUpdated, t.quota]);

  const handleCopyUrl = async () => {
    const url = `http://127.0.0.1:${port}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleProxy = async () => {
    if (proxyRunning) await stopProxy();
    else await startProxy();
  };

  return (
    <div className="w-full h-[560px] flex flex-col select-none overflow-hidden font-sans tracking-tight transition-all duration-300 text-[var(--text-primary)] bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-[24px]">
      <div className="absolute inset-0 bg-overlay -z-10" />

      <header className="flex-none px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="font-black text-xl tracking-tighter uppercase italic bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-dim)] bg-clip-text text-transparent">
              LinJun
            </h1>
            <div
              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all duration-500 ${
                proxyRunning
                  ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                  : "bg-[var(--text-primary)]/5 text-[var(--text-dim)] border border-[var(--text-primary)]/10"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  proxyRunning
                    ? "bg-neon-green animate-pulse"
                    : "bg-current opacity-40"
                }`}
              />
              {proxyRunning ? "Active" : "Stopped"}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="p-2 rounded-xl hover:bg-[var(--text-primary)]/5 dark:hover:bg-white/10 transition-all active:scale-90 disabled:opacity-30 group"
              title="Refresh"
            >
              <RotateCw
                size={16}
                className={`${isLoading || isRefreshing ? "animate-spin" : "opacity-40 group-hover:opacity-100 transition-opacity"}`}
              />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[var(--text-primary)]/5 dark:hover:bg-white/10 transition-all active:scale-90 group"
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            >
              {theme === "dark" ? (
                <SunIcon
                  size={16}
                  className="opacity-40 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <MoonIcon
                  size={16}
                  className="opacity-40 group-hover:opacity-100 transition-opacity"
                />
              )}
            </button>
            <div className="w-px h-4 bg-[var(--text-primary)]/10 mx-1" />
            <button
              onClick={toggleProxy}
              className={`p-2 rounded-xl transition-all active:scale-90 shadow-sm ${
                proxyRunning
                  ? "text-white bg-neon-red hover:bg-neon-red/90 shadow-neon-red/20"
                  : "text-white bg-neon-green hover:bg-neon-green/90 shadow-neon-green/20"
              }`}
            >
              {proxyRunning ? (
                <Square size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" strokeWidth={3} />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-0.5">
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-2 py-1 px-2 -ml-2 rounded-lg hover:bg-[var(--text-primary)]/5 transition-colors group"
          >
            <span className="text-[10px] font-black text-[var(--text-dim)] font-mono tracking-tighter group-hover:text-[var(--text-primary)] transition-colors">
              127.0.0.1:{port}
            </span>
            {copied ? (
              <Check size={10} className="text-neon-green" />
            ) : (
              <Copy
                size={10}
                className="opacity-0 group-hover:opacity-40 transition-opacity"
              />
            )}
          </button>
          <span className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-[0.2em]">
            {timeAgo}
          </span>
        </div>
      </header>

      <div className="flex-none px-5 py-2">
        <div className="flex items-center gap-2 p-1.5 bg-[var(--text-primary)]/[0.03] dark:bg-white/[0.03] rounded-[22px] overflow-x-auto no-scrollbar border border-[var(--text-primary)]/5 dark:border-white/5">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProvider(p.id)}
              className={`relative flex-shrink-0 min-w-[44px] h-11 px-3 rounded-[16px] flex items-center justify-center transition-all duration-500 ${
                selectedProvider === p.id
                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg scale-100"
                  : "hover:bg-[var(--text-primary)]/10 scale-95 opacity-40 hover:opacity-100"
              }`}
              title={p.name}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {getProviderIcon(p.id)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 py-4 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {isLoading && accounts.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-6 h-6 animate-spin border-2 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full" />
            </motion.div>
          ) : accounts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center text-[var(--text-dim)]"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                {t.tray.noAccounts}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pb-6"
            >
              {accounts.map((account) => (
                <AccountItem key={account.id} account={account} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="flex-none p-6 flex items-center gap-4 border-t border-[var(--text-primary)]/5 dark:border-white/5">
        <button
          onClick={() => window.electronAPI?.tray?.openDashboard?.()}
          className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-primary)] transition-all text-xs font-black uppercase tracking-widest active:scale-95 shadow-lg hover:scale-[1.02] hover:shadow-xl"
        >
          <ExternalLink size={14} strokeWidth={3} />
          {t.tray.openDashboard}
        </button>
        <button
          onClick={() => window.electronAPI?.app?.quit?.()}
          className="flex-none w-12 h-12 flex items-center justify-center rounded-2xl bg-neon-red/10 text-neon-red hover:bg-neon-red hover:text-white transition-all active:scale-90 border border-neon-red/20"
          title={t.tray.quit}
        >
          <Power size={18} strokeWidth={2.5} />
        </button>
      </footer>
    </div>
  );
}

export default TrayView;
