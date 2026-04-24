import { memo, useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Check,
  Download,
  ListChecks,
  Loader2,
  Trash2,
  User,
  X,
  AlertTriangle,
} from "lucide-react";
import { motion } from "motion/react";

import { useTranslations } from "../../stores/settings";
import { Provider, Account } from "./types";

const ACCOUNT_PAGE_SIZE = 30;
const ACCOUNT_LIST_MAX_HEIGHT = 400;

interface ProviderCardProps {
  provider: Provider;
  isExpanded: boolean;
  onEditAccount: (providerId: string, account: Account) => void;
  onRemoveAccount: (providerId: string, accountId: string) => void;
  onToggleAccountEnabled: (
    providerId: string,
    accountId: string,
    enabled: boolean,
  ) => void;
  onDownloadAccountJson: (providerId: string, accountId: string) => void;
  pendingToggleAccountIds: Record<string, boolean>;
  onEditProviderModelRules: (providerId: string) => void;
  onEditAccountModelRules: (providerId: string, account: Account) => void;
  onEditProviderModelAlias: (providerId: string) => void;
  getProviderModelRulesMeta: (providerId: string) => {
    sourceKey?: string;
    count: number;
  };
  getAccountModelRulesMeta: (
    providerId: string,
    account: Account,
  ) => { sourceKey?: string; count: number };
  getProviderModelAliasMeta: (providerId: string) => {
    sourceKey?: string;
    count: number;
  };
  // batch select
  isSelectMode: boolean;
  selectedAccountIds: Set<string>;
  onEnterSelectMode: (providerId: string) => void;
  onExitSelectMode: () => void;
  onToggleSelectAccount: (accountId: string) => void;
  onToggleSelectAll: (allIds: string[]) => void;
  onBatchDelete: () => void;
  onDeleteExpired: (providerId: string) => void;
}

export const ProviderCard = memo(function ProviderCard({
  provider,
  isExpanded,
  onEditAccount,
  onRemoveAccount,
  onToggleAccountEnabled,
  onDownloadAccountJson,
  pendingToggleAccountIds,
  onEditProviderModelRules,
  onEditAccountModelRules,
  onEditProviderModelAlias,
  getProviderModelRulesMeta,
  getAccountModelRulesMeta,
  getProviderModelAliasMeta,
  isSelectMode,
  selectedAccountIds,
  onEnterSelectMode,
  onExitSelectMode,
  onToggleSelectAccount,
  onToggleSelectAll,
  onBatchDelete,
  onDeleteExpired,
}: ProviderCardProps) {
  const t = useTranslations();
  const [visibleCount, setVisibleCount] = useState(ACCOUNT_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) {
      setVisibleCount(ACCOUNT_PAGE_SIZE);
    }
  }, [isExpanded]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) =>
      Math.min(prev + ACCOUNT_PAGE_SIZE, provider.accounts.length),
    );
  }, [provider.accounts.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = listRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root: container, rootMargin: "60px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, isExpanded]);

  const onlineCount = provider.accounts.filter(
    (a) => a.status === "online",
  ).length;

  const expiredCount = useMemo(
    () => provider.accounts.filter((a) => a.status === "expired").length,
    [provider.accounts],
  );

  const visibleAccounts = provider.accounts.slice(0, visibleCount);
  const hasMore = visibleCount < provider.accounts.length;
  const providerRulesMeta = getProviderModelRulesMeta(provider.id);
  const providerAliasMeta = getProviderModelAliasMeta(provider.id);

  const compactSourceLabel = (sourceKey?: string): string => {
    const source = (sourceKey || provider.id || "").trim();
    if (source.toLowerCase() === "antigravity") {
      return "Ant";
    }
    return source;
  };

  const getAccountDisplay = (account: Account) => {
    let main = account.nickname || "";
    let sub = account.email || "";

    if (!main) {
      if (
        account.email &&
        !account.email.startsWith("oauth-") &&
        account.email !== "unknown"
      ) {
        main = account.email.split("@")[0];
        sub = account.email;
      } else if (account.filePath) {
        const filename = account.filePath.split(/[/\\]/).pop() || "";
        main = filename
          .replace(/^(claude|gemini|codex|antigravity|qwen|iflow)-/i, "")
          .replace(/\.json$/i, "");
        sub = filename;
      } else {
        main = account.email || "Account";
        sub = "";
      }
    }

    if (main === sub) sub = "";

    return { main, sub };
  };

  return (
    <div className="glass-card flex flex-col p-5 group/card transition-all duration-300 border border-[var(--glass-border)]">
      <div className="flex items-center gap-4 min-w-0">
        <div className="text-3xl transition-transform duration-300 group-hover/card:scale-105">
          {provider.icon}
        </div>
        <div className="space-y-0.5 min-w-0 flex-1">
          <h3 className="font-bold text-base text-[var(--text-primary)] tracking-tight leading-tight truncate">
            {provider.id === "custom"
              ? t.providers.customProvider
              : provider.name}
          </h3>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`w-1.5 h-1.5 rounded-full ${onlineCount > 0 ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" : "bg-[var(--text-dim)]/20"}`}
              />
              <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider whitespace-nowrap">
                {onlineCount} / {provider.accounts.length}
              </p>
              {expiredCount > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-red-500/30 text-red-500 bg-red-500/5 whitespace-nowrap">
                  {expiredCount} {t.providers.expiredLabel}
                </span>
              )}
            </div>
            {provider.compatStatus && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border whitespace-nowrap ${
                  provider.compatStatus === "migration-complete"
                    ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                    : provider.compatStatus === "migration-failed"
                      ? "border-red-500/30 text-red-500 bg-red-500/5"
                      : "border-amber-500/30 text-amber-500 bg-amber-500/5"
                }`}
              >
                {provider.compatStatus === "fallback" &&
                  t.providers.compatFallbackActive}
                {provider.compatStatus === "migration-pending" &&
                  t.providers.compatMigrationPending}
                {provider.compatStatus === "migration-complete" &&
                  t.providers.compatMigrationComplete}
                {provider.compatStatus === "migration-failed" &&
                  t.providers.compatMigrationFailed}
              </span>
            )}

            <div className="flex items-center justify-end gap-1 min-w-0 ml-auto overflow-hidden">
              <button
                onClick={() => onEditProviderModelRules(provider.id)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 max-w-[152px] rounded-full border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  providerRulesMeta.count > 0
                    ? "border-amber-500/30 text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/10"
                    : "border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border-hover)]"
                }`}
                title={t.providers.providerModelRulesTitle}
              >
                <span className="font-mono text-[8px] opacity-70 max-w-[48px] truncate">
                  {compactSourceLabel(providerRulesMeta.sourceKey)}
                </span>
                <span className="shrink-0 whitespace-nowrap tracking-normal normal-case">
                  {providerRulesMeta.count > 0
                    ? t.providers.accountModelRulesLimited.replace(
                        "{count}",
                        String(providerRulesMeta.count),
                      )
                    : t.providers.accountModelRulesAll}
                </span>
              </button>

              <button
                onClick={() => onEditProviderModelAlias(provider.id)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 max-w-[152px] rounded-full border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors dark:outline-none dark:focus:outline-none dark:focus-visible:outline-none dark:focus-visible:ring-0 ${
                  providerAliasMeta.count > 0
                    ? "border-[var(--accent-primary)]/30 text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/10 dark:border-[rgba(var(--accent-primary-rgb),0.28)] dark:hover:border-[rgba(var(--accent-primary-rgb),0.4)]"
                    : "border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border-hover)] dark:border-[rgba(255,255,255,0.08)] dark:hover:border-[rgba(255,255,255,0.14)]"
                }`}
                title={t.providers.accountModelAliasManage}
              >
                <span className="font-mono text-[8px] opacity-70 max-w-[48px] truncate">
                  {compactSourceLabel(providerAliasMeta.sourceKey)}
                </span>
                <span className="shrink-0 whitespace-nowrap tracking-normal normal-case">
                  {providerAliasMeta.count > 0
                    ? t.providers.accountModelAliasMapped.replace(
                        "{count}",
                        String(providerAliasMeta.count),
                      )
                    : t.providers.accountModelAliasNone}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && provider.accounts.length > 0 && (
        <div className="mt-5 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Batch mode header */}
          <div className="flex items-center justify-between mb-2 min-h-[32px]">
            {isSelectMode ? (
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() =>
                    onToggleSelectAll(provider.accounts.map((a) => a.id))
                  }
                  className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] hover:opacity-80 transition-opacity"
                >
                  {selectedAccountIds.size === provider.accounts.length
                    ? t.providers.batchDeselectAll
                    : t.providers.batchSelectAll}
                </button>
                {selectedAccountIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 ml-auto mr-1"
                  >
                    <span className="text-[10px] text-[var(--text-dim)] tracking-tight font-medium tabular-nums">
                      <span className="text-[var(--accent-primary)] font-bold">
                        {selectedAccountIds.size}
                      </span>
                      /{provider.accounts.length}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-[var(--glass-border)]" />
                    <button
                      onClick={onBatchDelete}
                      className="flex items-center gap-1.5 text-red-500/80 hover:text-red-500 text-[10px] font-bold uppercase tracking-wider transition-colors active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t.common.delete}
                    </button>
                  </motion.div>
                )}
                <button
                  onClick={onExitSelectMode}
                  className={`${selectedAccountIds.size > 0 ? "" : "ml-auto"} p-1.5 rounded-full text-[var(--text-dim)] hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90`}
                  title={t.providers.batchManageExit}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                {expiredCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteExpired(provider.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/20 text-red-500/70 hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/5 text-[9px] font-bold uppercase tracking-wider transition-all"
                    title={t.providers.deleteExpiredTitle}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {t.providers.deleteExpiredBtn.replace(
                      "{count}",
                      String(expiredCount),
                    )}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnterSelectMode(provider.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border-hover)] text-[9px] font-bold uppercase tracking-wider transition-all bg-[var(--text-primary)]/[0.02] hover:bg-[var(--text-primary)]/[0.05]"
                  title={t.providers.batchManage}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  {t.providers.batchManage}
                </button>
              </div>
            )}
          </div>
          <div
            ref={listRef}
            className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1"
            style={{ maxHeight: ACCOUNT_LIST_MAX_HEIGHT }}
          >
            {visibleAccounts.map((account) => {
              const { main, sub } = getAccountDisplay(account);
              const isEnabled = account.enabled !== false;
              const isOffline = account.status === "offline";
              const toggleKey = `${provider.id}:${account.id}`;
              const isTogglePending = !!pendingToggleAccountIds[toggleKey];
              const modelRulesMeta = getAccountModelRulesMeta(
                provider.id,
                account,
              );
              const accountSourceLabel =
                modelRulesMeta.sourceKey ||
                account.oauthSourceKey ||
                provider.id;
              const isSelected =
                isSelectMode && selectedAccountIds.has(account.id);
              return (
                <div
                  key={account.id}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all group/item border ${isSelected ? "bg-[var(--text-primary)]/[0.03] border-[var(--glass-border)]" : "hover:bg-[var(--text-primary)]/[0.04] border-transparent hover:border-[var(--glass-border-hover)]"} ${isSelectMode ? "cursor-pointer" : ""}`}
                  onClick={
                    isSelectMode
                      ? () => onToggleSelectAccount(account.id)
                      : undefined
                  }
                >
                  <div className="relative flex-shrink-0">
                    {isSelectMode ? (
                      <div className="w-8 h-8 flex items-center justify-center">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? "border-[var(--glass-border-hover)] bg-[var(--bg-secondary)]/60 ring-1 ring-[var(--accent-primary)]/25" : "border-[var(--glass-border-hover)] bg-[var(--bg-secondary)]/40"}`}
                        >
                          {isSelected && (
                            <Check className="w-2.5 h-2.5 text-[var(--accent-primary)]" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-[var(--text-primary)]/[0.03] flex items-center justify-center text-[var(--text-dim)] group-hover/item:text-[var(--text-primary)] transition-colors">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-primary)] ${account.status === "expired" ? "bg-red-500" : isOffline ? "bg-amber-500" : isEnabled ? "bg-[var(--accent-primary)]" : "bg-[var(--text-dim)]"}`}
                        />
                      </>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate tracking-tight">
                      {main}
                    </div>
                    {sub && (
                      <div className="text-[10px] text-[var(--text-dim)] truncate font-mono opacity-60 mt-0.5">
                        {sub}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAccount(provider.id, account);
                      }}
                      className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[var(--glass-border)] text-[9px] font-bold uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border-hover)] transition-colors"
                      title={t.common.edit}
                    >
                      <span>{t.common.edit}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAccountModelRules(provider.id, account);
                      }}
                      className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                        modelRulesMeta.count > 0
                          ? "border-amber-500/30 text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/10"
                          : "border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border-hover)]"
                      }`}
                      title={t.providers.accountModelRulesManage}
                    >
                      <span className="font-mono text-[8px] opacity-70 max-w-[120px] truncate">
                        {accountSourceLabel}
                      </span>
                      <span>
                        {modelRulesMeta.count > 0
                          ? t.providers.accountModelRulesLimited.replace(
                              "{count}",
                              String(modelRulesMeta.count),
                            )
                          : t.providers.accountModelRulesAll}
                      </span>
                    </button>
                  </div>

                  {!isSelectMode && (
                    <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-all">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          account.status === "expired"
                            ? "text-red-500"
                            : isOffline
                              ? "text-amber-500"
                              : isEnabled
                                ? "text-emerald-500"
                                : "text-[var(--text-dim)]"
                        }`}
                      >
                        {account.status === "expired"
                          ? t.providers.expiredState
                          : isOffline
                            ? t.status.offline
                            : isEnabled
                              ? t.providers.enabledState
                              : t.providers.disabledState}
                      </span>
                      <motion.button
                        role="switch"
                        aria-checked={isEnabled}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleAccountEnabled(
                            provider.id,
                            account.id,
                            !isEnabled,
                          );
                        }}
                        disabled={isTogglePending}
                        className={`relative w-8 h-4 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                          isEnabled ? "toggle-track-active" : "toggle-track"
                        } ${isTogglePending ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
                        title={
                          isEnabled
                            ? t.providers.disableProvider
                            : t.providers.enableProvider
                        }
                      >
                        <motion.div
                          className="toggle-knob absolute top-0.5 left-0.5 w-3 h-3 rounded-full flex items-center justify-center pointer-events-none"
                          animate={{
                            x: isEnabled ? 16 : 0,
                            scale: isTogglePending ? 0.8 : 1,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                        >
                          {isTogglePending && (
                            <Loader2 className="w-2 h-2 text-[var(--accent-primary)] animate-spin" />
                          )}
                        </motion.div>
                      </motion.button>

                      <button
                        className="p-2 rounded-xl text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/6 transition-all active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadAccountJson(provider.id, account.id);
                        }}
                        title={t.providers.downloadAccountJson}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        className="p-2 rounded-xl text-[var(--text-dim)] hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveAccount(provider.id, account.id);
                        }}
                        title={t.common.delete}
                      >
                        {isTogglePending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center py-3 gap-3"
              >
                <div className="h-px flex-1 bg-[var(--glass-border)]" />
                <span className="text-[10px] text-[var(--text-dim)] tabular-nums">
                  {visibleCount} / {provider.accounts.length}
                </span>
                <div className="h-px flex-1 bg-[var(--glass-border)]" />
              </div>
            )}
          </div>

          {provider.accounts.length > ACCOUNT_PAGE_SIZE && (
            <div className="mt-2 flex items-center justify-between px-0.5">
              <span className="text-[10px] text-[var(--text-dim)] tabular-nums">
                {visibleAccounts.length} / {provider.accounts.length}
              </span>
              <div className="h-0.5 flex-1 mx-2 rounded-full bg-[var(--glass-border)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)]/30 transition-all duration-300"
                  style={{
                    width: `${(visibleAccounts.length / provider.accounts.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
