import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Download, Loader2, Trash2, User } from "lucide-react";
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
  onEditAccountModelRules: (providerId: string, account: Account) => void;
  getAccountModelRulesMeta: (
    providerId: string,
    account: Account,
  ) => { sourceKey?: string; count: number };
}

export const ProviderCard = memo(function ProviderCard({
  provider,
  isExpanded,
  onEditAccount,
  onRemoveAccount,
  onToggleAccountEnabled,
  onDownloadAccountJson,
  pendingToggleAccountIds,
  onEditAccountModelRules,
  getAccountModelRulesMeta,
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

  const visibleAccounts = provider.accounts.slice(0, visibleCount);
  const hasMore = visibleCount < provider.accounts.length;

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
          .replace(
            /^(claude|gemini|codex|antigravity|qwen|iflow|github-copilot|kiro)-/i,
            "",
          )
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl transition-transform duration-300 group-hover/card:scale-105">
            {provider.icon}
          </div>
          <div className="space-y-0.5">
            <h3 className="font-bold text-base text-[var(--text-primary)] tracking-tight leading-tight">
              {provider.id === "custom"
                ? t.providers.customProvider
                : provider.name}
            </h3>
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${onlineCount > 0 ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" : "bg-[var(--text-dim)]/20"}`}
              />
              <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                {onlineCount} / {provider.accounts.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && provider.accounts.length > 0 && (
        <div className="mt-5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div
            ref={listRef}
            className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1"
            style={{ maxHeight: ACCOUNT_LIST_MAX_HEIGHT }}
          >
            {visibleAccounts.map((account) => {
              const { main, sub } = getAccountDisplay(account);
              const isEnabled = account.enabled !== false;
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
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[var(--text-primary)]/[0.04] transition-all group/item border border-transparent hover:border-[var(--glass-border-hover)]"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--text-primary)]/[0.03] flex items-center justify-center text-[var(--text-dim)] group-hover/item:text-[var(--text-primary)] transition-colors">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-primary)] ${isEnabled ? "bg-[var(--accent-primary)]" : "bg-[var(--text-dim)]"}`}
                    />
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
                      className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider transition-colors ${
                        modelRulesMeta.count > 0
                          ? "border-amber-500/30 text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/10"
                          : "border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border-hover)]"
                      }`}
                      title={t.providers.accountModelRulesManage}
                    >
                      <span className="font-mono text-[8px] opacity-70">
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

                  <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-all">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isEnabled
                          ? "text-emerald-500"
                          : "text-[var(--text-dim)]"
                      }`}
                    >
                      {isEnabled
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
