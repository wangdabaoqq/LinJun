import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Power,
  Copy,
  Check,
  Play,
  Square,
  RotateCw,
  LayoutDashboard,
  ChevronRight,
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

function SlimProgressBar({
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
    if (provider !== "codex") return label || "";
    if (label?.includes("5小时") || label?.includes("5-Hour"))
      return t.quota.fiveHourLimit;
    if (
      label?.includes("7天") ||
      label?.includes("7-Day") ||
      label?.includes("Weekly")
    )
      return t.quota.weeklyLimit;
    return label || "";
  }, [label, provider, t.quota]);

  const colorClass = useMemo(() => {
    if (percent >= 90)
      return "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]";
    if (percent >= 70)
      return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
    return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
  }, [percent]);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between items-end px-0.5">
        <span className="text-[10px] font-semibold text-slate-500/80 dark:text-white/40 uppercase tracking-wider truncate max-w-[60%]">
          {displayLabel}
        </span>
        <div className="flex items-center gap-1.5">
          {resetIn && (
            <span className="text-[9px] font-medium text-slate-400 dark:text-white/30 italic">
              {resetIn}
            </span>
          )}
          <span className="text-[10px] font-bold text-slate-700 dark:text-white/60 font-mono">
            {Math.round(percent)}%
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-slate-200/50 dark:bg-black/40 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(percent, 2)}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full transition-colors duration-500 ${colorClass}`}
        />
      </div>
    </div>
  );
}

function AccountCard({ account }: { account: QuotaAccount }) {
  const windows = useMemo(() => {
    const list: QuotaWindow[] = [];
    if (account.rateLimits.primary) list.push(account.rateLimits.primary);
    if (account.rateLimits.secondary) list.push(account.rateLimits.secondary);
    if (account.provider !== "custom" && account.rateLimits.additional)
      list.push(...account.rateLimits.additional);
    return list.slice(0, 4);
  }, [account.provider, account.rateLimits]);

  return (
    <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
          <span className="text-xs font-bold text-slate-700 dark:text-white/80 truncate font-mono">
            {account.email}
          </span>
        </div>
        {account.status === "limited" && (
          <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-1.5 py-0.5 rounded-md">
            Limit
          </span>
        )}
      </div>

      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {windows.map((w, i) => (
          <SlimProgressBar
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
  const { theme, toggleTheme } = useTheme();
  const port = useSettingsStore((s) => s.port);
  const host = useSettingsStore((s) => s.host);
  const proxyRunning = useSettingsStore((s) => s.proxyRunning);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const providerTabsRef = useRef<HTMLDivElement | null>(null);
  const providerButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );

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
    if (!selectedProvider) return;
    const selectedButton = providerButtonRefs.current[selectedProvider];
    selectedButton?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedProvider]);

  useEffect(() => {
    window.electronAPI?.tray?.setHeight?.(580);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshQuotas();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleCopyUrl = async () => {
    const url = `http://${host || "127.0.0.1"}:${port}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleProxy = async () => {
    if (proxyRunning) await stopProxy();
    else await startProxy();
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

  return (
    <div className="w-full h-[580px] flex flex-col select-none overflow-hidden font-sans tracking-tight text-slate-900 dark:text-white/90 antialiased relative">
      <div className="absolute inset-0 bg-white/30 dark:bg-black/20 backdrop-blur-3xl -z-10" />

      <div className="absolute top-0 left-0 right-0 h-6 drag-region z-50" />

      <header className="flex-none px-5 pt-6 pb-3 flex items-center justify-between border-b border-black/[0.03] dark:border-white/[0.03] no-drag relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2 h-2 rounded-full shadow-lg ${proxyRunning ? "bg-emerald-500 shadow-emerald-500/40 animate-pulse" : "bg-slate-400 dark:bg-white/20"}`}
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">
            LinJun Proxy • {proxyRunning ? "Active" : "Paused"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors disabled:opacity-20"
          >
            <RotateCw
              size={14}
              className={
                isLoading || isRefreshing ? "animate-spin" : "text-slate-500"
              }
            />
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
          >
            {theme === "dark" ? (
              <SunIcon size={14} className="text-slate-400" />
            ) : (
              <MoonIcon size={14} className="text-slate-500" />
            )}
          </button>
        </div>
      </header>

      <section className="flex-none p-5 no-drag">
        <div className="p-4 rounded-3xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-xl shadow-black/[0.02] backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Endpoint
              </span>
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-2 group transition-opacity active:opacity-60"
              >
                <code className="text-[13px] font-bold font-mono text-slate-700 dark:text-white/80">
                  {host || "127.0.0.1"}:{port}
                </code>
                {copied ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy
                    size={12}
                    className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </button>
            </div>
            <button
              onClick={toggleProxy}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all active:scale-95 shadow-lg ${
                proxyRunning
                  ? "bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600"
                  : "bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600"
              }`}
            >
              {proxyRunning ? (
                <Square size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider">
                {proxyRunning ? "Stop" : "Start"}
              </span>
            </button>
          </div>
        </div>
      </section>

      <nav className="flex-none px-5 py-2 no-drag">
        <div
          ref={providerTabsRef}
          className="p-1 flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-2xl border border-black/[0.02] dark:border-white/[0.02] overflow-x-auto tray-x-scrollbar scroll-smooth"
          onWheel={(event) => {
            const tabs = providerTabsRef.current;
            if (!tabs || tabs.scrollWidth <= tabs.clientWidth) return;
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
            const delta = event.deltaY;
            if (delta === 0) return;
            event.preventDefault();
            tabs.scrollLeft += delta * 1.8;
          }}
        >
          {providers.map((p) => (
            <button
              key={p.id}
              ref={(element) => {
                providerButtonRefs.current[p.id] = element;
              }}
              onClick={(event) => {
                selectProvider(p.id);
                event.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap active:scale-95 ${
                selectedProvider === p.id
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/60"
              }`}
            >
              {selectedProvider === p.id && (
                <motion.div
                  layoutId="tray-provider-tab-active"
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 34,
                    mass: 0.6,
                  }}
                  className="absolute inset-0 rounded-xl bg-white dark:bg-white/10 shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.05]"
                />
              )}
              <div
                className={`relative z-10 w-3.5 h-3.5 transition-opacity ${selectedProvider === p.id ? "opacity-100" : "opacity-50"}`}
              >
                {getProviderIcon(p.id)}
              </div>
              <span className="relative z-10">{p.name}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 min-h-0 px-5 py-3 overflow-y-auto tray-scrollbar no-drag space-y-4">
        <AnimatePresence mode="popLayout">
          {isLoading && accounts.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-5 h-5 border-2 border-slate-500/20 border-t-slate-500 rounded-full animate-spin" />
            </motion.div>
          ) : accounts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">
                {t.tray.noAccounts}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3 pb-4"
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                  Accounts
                </h3>
                <span className="text-[9px] font-bold text-slate-400 dark:text-white/20 italic">
                  {timeAgo}
                </span>
              </div>
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="flex-none p-5 border-t border-black/[0.03] dark:border-white/[0.03] no-drag">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.electronAPI?.tray?.openDashboard?.()}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 transition-all active:scale-[0.96] group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <LayoutDashboard size={16} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/60">
              Dashboard
            </span>
          </button>

          <button
            onClick={() => window.electronAPI?.app?.quit?.()}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-all active:scale-[0.96] group"
          >
            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform">
              <Power size={16} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500/80">
              Quit App
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default TrayView;
