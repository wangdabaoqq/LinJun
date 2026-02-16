import { Dispatch, SetStateAction } from "react";
import { ChevronRight } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { ProviderCard } from "./ProviderCard";
import { Account, Provider } from "./types";

interface OfficialProvidersSectionProps {
  officialExpanded: boolean;
  setOfficialExpanded: Dispatch<SetStateAction<boolean>>;
  totalAccounts: number;
  providersWithAccounts: Provider[];
  pendingAccountToggles: Record<string, boolean>;
  onRemoveAccount: (providerId: string, accountId: string) => void;
  onToggleAccountEnabled: (
    providerId: string,
    accountId: string,
    enabled: boolean,
  ) => void;
  onEditAccountModelRules: (providerId: string, account: Account) => void;
  getAccountModelRulesMeta: (
    providerId: string,
    account: Account,
  ) => { sourceKey?: string; count: number };
}

export function OfficialProvidersSection({
  officialExpanded,
  setOfficialExpanded,
  totalAccounts,
  providersWithAccounts,
  pendingAccountToggles,
  onRemoveAccount,
  onToggleAccountEnabled,
  onEditAccountModelRules,
  getAccountModelRulesMeta,
}: OfficialProvidersSectionProps) {
  const t = useTranslations();

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {providersWithAccounts.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isExpanded={officialExpanded}
            onRemoveAccount={onRemoveAccount}
            onToggleAccountEnabled={onToggleAccountEnabled}
            pendingToggleAccountIds={pendingAccountToggles}
            onEditAccountModelRules={onEditAccountModelRules}
            getAccountModelRulesMeta={getAccountModelRulesMeta}
          />
        ))}
      </div>
    </section>
  );
}
