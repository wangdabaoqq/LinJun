import { useEffect, useRef, useCallback, useState } from "react";
import { useTranslations } from "../../stores/settings";
import { useQuotaStore, ProviderType } from "../../stores/quota";
import { ProviderTabs } from "./ProviderTabs";
import { AccountQuotaCard } from "./AccountQuotaCard";
import { QuotaTip } from "./QuotaTip";
import { Activity, RotateCw, Search, X } from "lucide-react";
import { getProviderIcon } from "../icons/ProviderIcons";
import { Page } from "../Sidebar";

const PAGE_SIZE = 30;
const QUOTA_SEARCH_PREF_KEY = "quota:search-expanded";
const SEARCH_FILTER_THRESHOLD = 10;

interface QuotaProps {
  onNavigate?: (page: Page) => void;
}

export function Quota({ onNavigate }: QuotaProps) {
  const t = useTranslations();
  const providers = useQuotaStore((state) => state.providers);
  const selectedProvider = useQuotaStore((state) => state.selectedProvider);
  const accounts = useQuotaStore((state) => state.accounts);
  const isLoading = useQuotaStore((state) => state.isLoading);
  const _isStreaming = useQuotaStore((state) => state.isStreaming);
  const error = useQuotaStore((state) => state.error);
  const loadProviders = useQuotaStore((state) => state.loadProviders);
  const selectProvider = useQuotaStore((state) => state.selectProvider);
  const refreshQuotas = useQuotaStore((state) => state.refreshQuotas);
  const refreshAccount = useQuotaStore((state) => state.refreshAccount);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [accountSearch, setAccountSearch] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedSearch = accountSearch.trim().toLowerCase();
  const showAccountSearchBar =
    accounts.length >= SEARCH_FILTER_THRESHOLD &&
    (showSearchBar || normalizedSearch.length > 0);
  const filteredAccounts = normalizedSearch
    ? accounts.filter((account) => {
        const searchableFields = [
          account.email,
          account.id,
          account.badge,
          account.status,
          account.error,
        ];
        return searchableFields.some((field) =>
          String(field || "")
            .toLowerCase()
            .includes(normalizedSearch),
        );
      })
    : accounts;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.localStorage.getItem(QUOTA_SEARCH_PREF_KEY);
    if (saved === "1") {
      setShowSearchBar(true);
      return;
    }
    if (saved === "0") {
      setShowSearchBar(false);
      return;
    }
    setShowSearchBar(accounts.length >= SEARCH_FILTER_THRESHOLD);
  }, [accounts.length]);

  useEffect(() => {
    if (accounts.length >= SEARCH_FILTER_THRESHOLD) {
      return;
    }
    setShowSearchBar(false);
    setAccountSearch("");
  }, [accounts.length]);

  useEffect(() => {
    if (accounts.length < SEARCH_FILTER_THRESHOLD) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key !== "/") {
        return;
      }
      event.preventDefault();
      setShowSearchBar(true);
      window.localStorage.setItem(QUOTA_SEARCH_PREF_KEY, "1");
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [accounts.length]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedProvider]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedProvider, normalizedSearch]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) =>
      Math.min(prev + PAGE_SIZE, filteredAccounts.length),
    );
  }, [filteredAccounts.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { root: container, rootMargin: "120px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const currentProvider = providers.find((p) => p.id === selectedProvider);

  const tabProviders = providers.map((p) => ({
    id: p.id,
    name: p.id === "custom" ? t.providers.customProvider : p.name,
    accountCount: p.accountCount,
    color: p.color,
  }));

  const handleGoToSettings = () => {
    if (onNavigate) {
      onNavigate("providers");
    }
  };

  const visibleAccounts = filteredAccounts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAccounts.length;

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden p-6">
      <div className="shrink-0 pb-6 z-20">
        <div className="flex flex-col gap-6 ">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-[var(--accent-primary)]/5 rounded-2xl border border-[var(--glass-border)] shadow-lg shadow-[var(--accent-primary)]/5">
              <Activity className="w-7 h-7 text-[var(--accent-primary)]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                {t.quota.managementTitle}
              </h2>
              <p className="text-[var(--text-muted)] text-sm">
                {t.quota.monitorDescription}
              </p>
            </div>

            <button
              onClick={refreshQuotas}
              disabled={isLoading}
              className={`
                ml-auto h-10 px-4 flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-primary)] text-sm font-bold transition-all hover:bg-[var(--text-primary)]/5 active:scale-95
                ${isLoading ? "opacity-70 cursor-not-allowed" : ""}
              `}
            >
              <RotateCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span>{isLoading ? t.quota.refreshing : t.quota.refreshAll}</span>
            </button>
          </div>

          {tabProviders.length > 0 && (
            <ProviderTabs
              providers={tabProviders}
              selected={selectedProvider || ""}
              onSelect={(id) => selectProvider(id as ProviderType)}
            />
          )}

          {error && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 text-xs font-medium px-3 py-2">
              {error}
            </div>
          )}

          {accounts.length >= SEARCH_FILTER_THRESHOLD && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setShowSearchBar((prev) => {
                    const next = !prev;
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem(
                        QUOTA_SEARCH_PREF_KEY,
                        next ? "1" : "0",
                      );
                    }
                    return next;
                  });
                }}
                className="h-9 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-2 hover:bg-[var(--text-primary)]/[0.06] transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t.quota.searchAccounts}</span>
              </button>
              {normalizedSearch && (
                <button
                  onClick={() => setAccountSearch("")}
                  className="h-9 px-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors"
                >
                  {t.common.close}
                </button>
              )}
            </div>
          )}

          {showAccountSearchBar && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1 group">
                <Search
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    accountSearch
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--text-dim)] group-focus-within:text-[var(--accent-primary)]"
                  }`}
                  size={16}
                />
                <input
                  ref={searchInputRef}
                  className="w-full pl-11 pr-10 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--glass-border)] rounded-full outline-none focus:border-[rgba(var(--accent-primary-rgb),0.5)] focus:ring-4 focus:ring-[rgba(var(--accent-primary-rgb),0.1)] transition-all text-sm placeholder:text-[var(--text-dim)] shadow-inner appearance-none"
                  placeholder={t.quota.searchAccounts}
                  value={accountSearch}
                  onChange={(event) => setAccountSearch(event.target.value)}
                />
                {accountSearch && (
                  <button
                    onClick={() => setAccountSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="px-4 py-2 bg-[var(--bg-secondary)]/30 border border-[var(--glass-border)] rounded-full flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-[var(--text-primary)]">
                  {normalizedSearch
                    ? `${filteredAccounts.length}/${accounts.length}`
                    : accounts.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto pb-6 custom-scrollbar"
      >
        <div className="h-full">
          {isLoading && accounts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center animate-pulse">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-hover)] mb-4"></div>
              <div className="h-4 w-48 bg-[var(--surface-hover)] rounded-full"></div>
            </div>
          ) : filteredAccounts.length > 0 ? (
            <div className="space-y-4">
              {selectedProvider === "custom" && (
                <QuotaTip onAction={handleGoToSettings} actionLabel="前往设置">
                  {t.quota.customProviderTip}
                </QuotaTip>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {visibleAccounts.map((account, index) => (
                  <div
                    key={account.id}
                    style={
                      index < 20
                        ? {
                            animationDelay: `${index * 50}ms`,
                            animationFillMode: "both",
                          }
                        : undefined
                    }
                    className={
                      index < 20
                        ? "animate-in fade-in slide-in-from-bottom-4 duration-500"
                        : undefined
                    }
                  >
                    <AccountQuotaCard
                      email={account.email}
                      badge={account.badge}
                      status={account.status}
                      error={account.error}
                      providerId={selectedProvider || undefined}
                      rateLimits={account.rateLimits}
                      lastUpdated={account.lastUpdated}
                      onRefresh={() => refreshAccount(account.id)}
                    />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center py-6 gap-3"
                >
                  <div className="h-px flex-1 bg-[var(--glass-border)]" />
                  <span className="text-[10px] text-[var(--text-dim)] tabular-nums">
                    {visibleAccounts.length} / {accounts.length}
                  </span>
                  <div className="h-px flex-1 bg-[var(--glass-border)]" />
                </div>
              )}

              {!hasMore && filteredAccounts.length > PAGE_SIZE && (
                <div className="flex items-center justify-center py-4 gap-3">
                  <div className="h-px flex-1 bg-[var(--glass-border)]" />
                  <span className="text-[10px] text-[var(--text-dim)]">
                    {filteredAccounts.length} accounts
                  </span>
                  <div className="h-px flex-1 bg-[var(--glass-border)]" />
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[var(--surface-hover)] to-[var(--surface-hover)]/[0.4] flex items-center justify-center mb-6 shadow-2xl border border-[var(--glass-border)] rotate-3">
                <span className="text-4xl filter drop-shadow-lg opacity-80 text-[var(--text-primary)] w-12 h-12 flex items-center justify-center">
                  {currentProvider ? getProviderIcon(currentProvider.id) : "⚡️"}
                </span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                {normalizedSearch
                  ? t.quota.noSearchResults
                  : t.quota.noAccountsConnected}
              </h3>
              <p className="text-[var(--text-muted)] max-w-sm mx-auto mb-6">
                {normalizedSearch
                  ? t.quota.noSearchResultsDesc.replace(
                      "{keyword}",
                      accountSearch,
                    )
                  : providers.length === 0
                    ? t.quota.noProvidersConfigured
                    : t.quota.noAccountsForProvider.replace(
                        "{provider}",
                        currentProvider?.name || "this provider",
                      )}
              </p>
              {providers.length === 0 && (
                <div className="px-4 py-3 bg-[var(--surface-hover)] rounded-xl border border-[var(--glass-border)] text-sm text-[var(--text-muted)] font-mono">
                  {t.quota.addTokenFiles}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
