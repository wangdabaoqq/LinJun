import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronRight, Search, X } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ProviderCard } from "./ProviderCard";
import { Account, Provider } from "./types";

const OFFICIAL_FILTER_PREF_KEY = "providers:official:filters-expanded";
const SEARCH_FILTER_THRESHOLD = 10;

interface OfficialProvidersSectionProps {
  officialExpanded: boolean;
  setOfficialExpanded: Dispatch<SetStateAction<boolean>>;
  totalAccounts: number;
  providersWithAccounts: Provider[];
  pendingAccountToggles: Record<string, boolean>;
  onEditAccount: (providerId: string, account: Account) => void;
  onRemoveAccount: (providerId: string, accountId: string) => void;
  onToggleAccountEnabled: (
    providerId: string,
    accountId: string,
    enabled: boolean,
  ) => void;
  onDownloadAccountJson: (providerId: string, accountId: string) => void;
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
}

export function OfficialProvidersSection({
  officialExpanded,
  setOfficialExpanded,
  totalAccounts,
  providersWithAccounts,
  pendingAccountToggles,
  onEditAccount,
  onRemoveAccount,
  onToggleAccountEnabled,
  onDownloadAccountJson,
  onEditProviderModelRules,
  onEditAccountModelRules,
  onEditProviderModelAlias,
  getProviderModelRulesMeta,
  getAccountModelRulesMeta,
  getProviderModelAliasMeta,
}: OfficialProvidersSectionProps) {
  const t = useTranslations();
  const [accountKeyword, setAccountKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "enabled" | "disabled"
  >("all");
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.localStorage.getItem(OFFICIAL_FILTER_PREF_KEY);
    if (saved === "1") {
      setShowFilters(true);
      return;
    }
    if (saved === "0") {
      setShowFilters(false);
      return;
    }
    setShowFilters(totalAccounts >= SEARCH_FILTER_THRESHOLD);
  }, [totalAccounts]);

  useEffect(() => {
    if (totalAccounts >= SEARCH_FILTER_THRESHOLD) {
      return;
    }
    setShowFilters(false);
    setAccountKeyword("");
    setStatusFilter("all");
  }, [totalAccounts]);

  useEffect(() => {
    if (!officialExpanded || totalAccounts < SEARCH_FILTER_THRESHOLD) {
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
      setShowFilters(true);
      window.localStorage.setItem(OFFICIAL_FILTER_PREF_KEY, "1");
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [officialExpanded, totalAccounts]);

  const filteredProviders = useMemo(() => {
    const keyword = accountKeyword.trim().toLowerCase();

    return providersWithAccounts
      .map((provider) => {
        const accounts = provider.accounts.filter((account) => {
          const enabled = account.enabled !== false;
          if (statusFilter === "enabled" && !enabled) {
            return false;
          }
          if (statusFilter === "disabled" && enabled) {
            return false;
          }

          if (!keyword) {
            return true;
          }

          const searchTargets = [
            account.nickname,
            account.email,
            account.id,
            account.filePath,
            provider.id,
            provider.name,
          ]
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.toLowerCase());

          return searchTargets.some((item) => item.includes(keyword));
        });

        return {
          ...provider,
          accounts,
        };
      })
      .filter((provider) => provider.accounts.length > 0);
  }, [accountKeyword, providersWithAccounts, statusFilter]);

  const filteredAccountCount = useMemo(
    () =>
      filteredProviders.reduce(
        (sum, provider) => sum + provider.accounts.length,
        0,
      ),
    [filteredProviders],
  );

  const hasActiveFilters =
    accountKeyword.trim().length > 0 || statusFilter !== "all";
  const showFilterBar = showFilters || hasActiveFilters;

  return (
    <section>
      <div
        className={`flex items-center gap-3 mb-6 cursor-pointer group/section px-4 py-3 rounded-xl border transition-all duration-200 ${
          officialExpanded
            ? "bg-[var(--text-primary)]/[0.05] border-[var(--glass-border-hover)]"
            : "bg-transparent border-transparent hover:bg-[var(--text-primary)]/[0.03] hover:border-[var(--glass-border)]"
        }`}
        onClick={() => setOfficialExpanded(!officialExpanded)}
      >
        <div
          className={`flex-shrink-0 transition-transform duration-300 ${officialExpanded ? "rotate-90 text-[var(--accent-primary)]" : "text-[var(--text-dim)]"}`}
        >
          <ChevronRight className="w-4 h-4" />
        </div>
        <h3
          className={`text-xs font-bold text-[var(--text-primary)] uppercase tracking-[0.15em] transition-opacity duration-200 ${officialExpanded ? "opacity-80" : "opacity-40 group-hover/section:opacity-60"}`}
        >
          {t.providers.officialAccounts}
        </h3>
        <div className="flex-1" />
        <span className="text-[10px] font-mono font-bold text-[var(--text-dim)] tabular-nums">
          {totalAccounts}
        </span>
      </div>

      {officialExpanded && totalAccounts >= SEARCH_FILTER_THRESHOLD && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={(event) => {
              event.stopPropagation();
              setShowFilters((prev) => {
                const next = !prev;
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(
                    OFFICIAL_FILTER_PREF_KEY,
                    next ? "1" : "0",
                  );
                }
                return next;
              });
            }}
            className="h-9 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-2 hover:bg-[var(--text-primary)]/[0.06] transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{t.providers.accountFilterPlaceholder}</span>
          </button>
          {hasActiveFilters && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                setAccountKeyword("");
                setStatusFilter("all");
              }}
              className="h-9 px-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors"
            >
              {t.common.close}
            </button>
          )}
        </div>
      )}

      {officialExpanded &&
        totalAccounts >= SEARCH_FILTER_THRESHOLD &&
        showFilterBar && (
          <div className="mb-5 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
              <input
                ref={searchInputRef}
                value={accountKeyword}
                onChange={(e) => setAccountKeyword(e.target.value)}
                placeholder={t.providers.accountFilterPlaceholder}
                className="glass-input h-10 w-full pl-10 pr-9 border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.03] focus:border-[var(--accent-primary)]/50"
              />
              {accountKeyword && (
                <button
                  onClick={() => setAccountKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.06] transition-colors"
                  title={t.common.close}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "all" | "enabled" | "disabled")
              }
            >
              <SelectTrigger
                style={{ borderRadius: "12px" }}
                className="md:w-44 h-10 pl-4 pr-10 py-0 text-xs font-medium transition-all duration-300 border backdrop-blur-md text-left outline-none focus:outline-none focus:ring-0 bg-[var(--bg-secondary)]/30 border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/50 hover:border-[var(--glass-border-hover)] shadow-sm data-[state=open]:bg-[var(--accent-primary)]/10 data-[state=open]:border-[var(--accent-primary)]/30 data-[state=open]:text-[var(--accent-primary)] data-[state=open]:shadow-[0_0_15px_-5px_var(--accent-primary)]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]/95 backdrop-blur-xl border border-[var(--glass-border)] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-[100] py-1 ring-1 ring-[var(--glass-border)]">
                <SelectItem
                  value="all"
                  className="py-2 text-xs cursor-pointer transition-colors data-[highlighted]:bg-[var(--accent-primary)]/5 data-[highlighted]:text-[var(--text-primary)] data-[state=checked]:bg-[var(--accent-primary)]/10 data-[state=checked]:text-[var(--accent-primary)] text-[var(--text-muted)]"
                >
                  {t.providers.accountFilterStatusAll}
                </SelectItem>
                <SelectItem
                  value="enabled"
                  className="py-2 text-xs cursor-pointer transition-colors data-[highlighted]:bg-[var(--accent-primary)]/5 data-[highlighted]:text-[var(--text-primary)] data-[state=checked]:bg-[var(--accent-primary)]/10 data-[state=checked]:text-[var(--accent-primary)] text-[var(--text-muted)]"
                >
                  {t.providers.accountFilterStatusEnabled}
                </SelectItem>
                <SelectItem
                  value="disabled"
                  className="py-2 text-xs cursor-pointer transition-colors data-[highlighted]:bg-[var(--accent-primary)]/5 data-[highlighted]:text-[var(--text-primary)] data-[state=checked]:bg-[var(--accent-primary)]/10 data-[state=checked]:text-[var(--accent-primary)] text-[var(--text-muted)]"
                >
                  {t.providers.accountFilterStatusDisabled}
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="h-10 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] text-[10px] font-mono text-[var(--text-dim)] flex items-center tabular-nums">
              {filteredAccountCount} / {totalAccounts}
            </div>
          </div>
        )}

      {filteredProviders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isExpanded={officialExpanded}
              onEditAccount={onEditAccount}
              onRemoveAccount={onRemoveAccount}
              onToggleAccountEnabled={onToggleAccountEnabled}
              onDownloadAccountJson={onDownloadAccountJson}
              pendingToggleAccountIds={pendingAccountToggles}
              onEditProviderModelRules={onEditProviderModelRules}
              onEditAccountModelRules={onEditAccountModelRules}
              onEditProviderModelAlias={onEditProviderModelAlias}
              getProviderModelRulesMeta={getProviderModelRulesMeta}
              getAccountModelRulesMeta={getAccountModelRulesMeta}
              getProviderModelAliasMeta={getProviderModelAliasMeta}
            />
          ))}
        </div>
      ) : (
        officialExpanded && (
          <div className="px-4 py-8 rounded-xl border border-dashed border-[var(--glass-border)] text-[var(--text-dim)] text-sm text-center">
            {t.providers.accountFilterNoResults}
          </div>
        )
      )}
    </section>
  );
}
