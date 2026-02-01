import { useState, memo } from "react";
import { Plus } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { Provider, Account } from "./types";

interface ProviderCardProps {
  provider: Provider;
  onAddAccount: (providerId: string) => void;
  onRemoveAccount: (providerId: string, accountId: string) => void;
}

export const ProviderCard = memo(function ProviderCard({
  provider,
  onAddAccount,
  onRemoveAccount,
}: ProviderCardProps) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(true);
  const onlineCount = provider.accounts.filter(
    (a) => a.status === "online",
  ).length;

  const getAccountDisplayName = (account: Account) => {
    if (account.nickname) return account.nickname;
    if (
      account.email &&
      !account.email.startsWith("oauth-") &&
      account.email !== "unknown"
    )
      return account.email;
    if (account.filePath) {
      const filename = account.filePath.split(/[/\\]/).pop();
      if (filename) {
        return filename
          .replace(
            /^(claude|gemini|codex|antigravity|qwen|iflow|github-copilot|kiro)-/i,
            "",
          )
          .replace(/\.json$/i, "");
      }
    }
    return account.email || "Unknown Account";
  };

  return (
    <div className={`glass-card glass-card-${provider.color} overflow-hidden`}>
      <div
        className="p-5 cursor-pointer hover:bg-soft transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`text-2xl text-[var(--accent-${provider.color})] glow-${provider.color}`}
            >
              {provider.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[var(--text-primary)]">
                  {provider.id === "custom"
                    ? t.providers.customProvider
                    : provider.name}
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full bg-[var(--accent-${provider.color})]/20 text-[var(--accent-${provider.color})] border border-[var(--accent-${provider.color})]/30`}
                >
                  {provider.accounts.length}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {onlineCount}/{provider.accounts.length}{" "}
                {t.providers.connected.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="status-dot status-dot-online" />
            <span
              className={`text-[var(--accent-${provider.color})] transform transition-transform duration-200`}
              style={{ transform: expanded ? "rotate(180deg)" : "" }}
            >
              ▼
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-subtle">
          <div className="p-3 space-y-2">
            {provider.accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 rounded-xl bg-soft hover:bg-[var(--glass-bg-hover)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`status-dot ${
                      account.status === "online"
                        ? "status-dot-online"
                        : "status-dot-offline"
                    }`}
                  />
                  <div>
                    <div className="text-sm text-[var(--text-primary)]">
                      {getAccountDisplayName(account)}
                    </div>
                    <div className="text-xs text-[var(--text-dim)]">
                      {account.lastUsed}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="glass-btn text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAccount(provider.id, account.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-subtle">
            <button
              className="glass-btn glass-btn-teal text-xs py-1.5 w-full transition-all duration-300 hover:brightness-110 active:scale-[0.98] shadow-sm hover:shadow-teal-500/20 flex items-center justify-center gap-2 group"
              onClick={(e) => {
                e.stopPropagation();
                onAddAccount(provider.id);
              }}
            >
              <Plus className="w-3.5 h-3.5 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
              {t.providers.addAccount}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
