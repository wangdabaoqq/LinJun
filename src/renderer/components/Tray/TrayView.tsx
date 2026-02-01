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
    if (percent >= 90) return "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.3)]";
    if (percent >= 70)
      return "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.3)]";
    return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
  }, [percent]);

  return (
    <div className="w-full min-w-0">
      {shouldShowLabel && (
        <div className="flex justify-between items-center mb-1 px-0.5">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 truncate max-w-[55%] tracking-tighter">
            {displayLabel}
          </span>
          <div className="flex items-center gap-1.5">
            {resetIn && (
              <span className="text-[8px] font-medium text-gray-400/70 dark:text-gray-500/70">
                {resetIn}
              </span>
            )}
            <span className="text-[9px] font-mono font-black text-gray-500/80 tabular-nums">
              {Math.round(percent)}%
            </span>
          </div>
        </div>
      )}
      <div className="h-1 w-full bg-black/[0.04] dark:bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percent, 100)}%` }}
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
    if (account.rateLimits.additional)
      list.push(...account.rateLimits.additional);
    return list.slice(0, 4);
  }, [account.rateLimits]);

  return (
    <div className="group relative p-3 rounded-2xl bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 border border-black/[0.03] dark:border-white/[0.03] hover:border-black/[0.08] dark:hover:border-white/[0.08] hover:shadow-xl hover:shadow-black/5">
      <div className="flex justify-between items-start mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[11px] font-bold text-gray-800 dark:text-gray-100 truncate select-none tracking-tight"
            title={account.email}
          >
            {account.email}
          </span>
          {account.badge && (
            <span className="flex-none text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400 tracking-wide">
              {account.badge}
            </span>
          )}
        </div>
        {account.status === "limited" && (
          <span className="flex-none text-[8px] text-red-500 font-bold uppercase tracking-wider">
            Limit
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
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
    </div>
  );
}

export function TrayView() {
  const t = useTranslations();
  const { theme } = useTheme();
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
    window.electronAPI?.tray?.setHeight?.(520);
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
    <div
      className={`w-full h-[520px] flex flex-col select-none overflow-hidden font-sans tracking-tight transition-all duration-300 ${
        theme === "dark"
          ? "text-white selection:bg-white/20"
          : "text-gray-900 selection:bg-black/10"
      }`}
    >
      <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[40px] -z-10" />

      <header className="flex-none px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-black text-base tracking-tighter uppercase">
              LinJun
            </h1>
            <div
              className={`w-2 h-2 rounded-full ring-4 ring-offset-0 ${
                proxyRunning
                  ? "bg-emerald-500 shadow-[0_0_12px_#10b981] ring-emerald-500/20 animate-pulse"
                  : "bg-gray-400 dark:bg-gray-600 ring-transparent"
              }`}
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 disabled:opacity-30"
            >
              <RotateCw
                size={16}
                className={`${isLoading || isRefreshing ? "animate-spin" : "opacity-60 hover:opacity-100 transition-opacity"}`}
              />
            </button>
            <button
              onClick={toggleProxy}
              className={`p-2 rounded-full transition-all active:scale-90 ${
                proxyRunning
                  ? "text-red-500 bg-red-500/10 hover:bg-red-500/20"
                  : "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
              }`}
            >
              {proxyRunning ? (
                <Square size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-0.5">
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
          >
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-mono">
              127.0.0.1:${port}
            </span>
            {copied ? (
              <Check size={10} className="text-emerald-500" />
            ) : (
              <Copy
                size={10}
                className="opacity-0 group-hover:opacity-40 transition-opacity"
              />
            )}
          </button>
          <span className="text-[9px] font-bold text-gray-400/60 uppercase tracking-widest">
            {timeAgo}
          </span>
        </div>
      </header>

      <div className="flex-none px-4 py-2">
        <div className="flex items-center gap-2 p-1 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl overflow-x-auto no-scrollbar border border-black/[0.02] dark:border-white/[0.02]">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProvider(p.id)}
              className={`relative flex-shrink-0 min-w-[40px] h-10 px-3 rounded-xl flex items-center justify-center transition-all duration-300 ${
                selectedProvider === p.id
                  ? "bg-white dark:bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-100 ring-1 ring-black/[0.05] dark:ring-white/[0.05]"
                  : "hover:bg-black/5 dark:hover:bg-white/5 scale-95 opacity-50 hover:opacity-100"
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

      <div className="flex-1 min-h-0 px-5 py-2 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {isLoading && accounts.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="py-10 flex flex-col items-center justify-center text-gray-400 space-y-3"
            >
              <div className="w-6 h-6 animate-spin border-2 border-current border-t-transparent rounded-full opacity-30" />
            </motion.div>
          ) : accounts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="py-10 flex flex-col items-center justify-center text-gray-400/60"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {t.tray.noAccounts}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-3 pb-4"
            >
              {accounts.map((account) => (
                <AccountItem key={account.id} account={account} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="flex-none p-5 flex items-center gap-3 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.05] dark:border-white/[0.05]">
        <button
          onClick={() => window.electronAPI?.tray?.openDashboard?.()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-black transition-all text-[11px] font-black uppercase tracking-tight active:scale-95 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-white/10"
        >
          <ExternalLink size={14} strokeWidth={3} />
          {t.tray.openDashboard}
        </button>
        <button
          onClick={() => window.electronAPI?.app?.quit?.()}
          className="flex-none w-11 h-11 flex items-center justify-center rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"
          title={t.tray.quit}
        >
          <Power size={18} strokeWidth={2.5} />
        </button>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

export default TrayView;
