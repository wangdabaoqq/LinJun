import { useEffect } from "react";
import { useTranslations } from "../../stores/settings";
import { useQuotaStore, ProviderType } from "../../stores/quota";
import { ProviderTabs } from "./ProviderTabs";
import { AccountQuotaCard } from "./AccountQuotaCard";
import { Activity, RotateCw, Info } from "lucide-react";
import { getProviderIcon } from "../icons/ProviderIcons";

export function Quota() {
  const t = useTranslations();
  const providers = useQuotaStore((state) => state.providers);
  const selectedProvider = useQuotaStore((state) => state.selectedProvider);
  const accounts = useQuotaStore((state) => state.accounts);
  const isLoading = useQuotaStore((state) => state.isLoading);
  const loadProviders = useQuotaStore((state) => state.loadProviders);
  const selectProvider = useQuotaStore((state) => state.selectProvider);
  const refreshQuotas = useQuotaStore((state) => state.refreshQuotas);
  const refreshAccount = useQuotaStore((state) => state.refreshAccount);

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

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden p-6">
      <div className="shrink-0 pb-6 z-20">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
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
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto h-full">
          {isLoading && accounts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center animate-pulse">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-hover)] mb-4"></div>
              <div className="h-4 w-48 bg-[var(--surface-hover)] rounded-full"></div>
            </div>
          ) : accounts.length > 0 ? (
            <div className="space-y-4">
              {selectedProvider === "custom" && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10">
                  <Info
                    size={16}
                    className="text-[var(--accent-primary)] flex-shrink-0"
                  />
                  <p className="text-xs text-[var(--text-muted)]">
                    {t.quota.customProviderTip}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {accounts.map((account, index) => (
                  <div
                    key={account.id}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: "both",
                    }}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500"
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
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[var(--surface-hover)] to-[var(--surface-hover)]/[0.4] flex items-center justify-center mb-6 shadow-2xl border border-[var(--glass-border)] rotate-3">
                <span className="text-4xl filter drop-shadow-lg opacity-80 text-[var(--text-primary)] w-12 h-12 flex items-center justify-center">
                  {currentProvider ? getProviderIcon(currentProvider.id) : "⚡️"}
                </span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                {t.quota.noAccountsConnected}
              </h3>
              <p className="text-[var(--text-muted)] max-w-sm mx-auto mb-6">
                {providers.length === 0
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
