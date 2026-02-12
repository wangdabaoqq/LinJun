import { memo } from "react";
import { Loader2, Trash2, User } from "lucide-react";
import { motion } from "motion/react";

import { useTranslations } from "../../stores/settings";
import { Provider, Account } from "./types";

interface ProviderCardProps {
  provider: Provider;
  isExpanded: boolean;
  onRemoveAccount: (providerId: string, accountId: string) => void;
  onToggleAccountEnabled: (
    providerId: string,
    accountId: string,
    enabled: boolean,
  ) => void;
  pendingToggleAccountIds: Record<string, boolean>;
}

export const ProviderCard = memo(function ProviderCard({
  provider,
  isExpanded,
  onRemoveAccount,
  onToggleAccountEnabled,
  pendingToggleAccountIds,
}: ProviderCardProps) {
  const t = useTranslations();
  const onlineCount = provider.accounts.filter(
    (a) => a.status === "online",
  ).length;

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
        <div className="mt-5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {provider.accounts.map((account) => {
            const { main, sub } = getAccountDisplay(account);
            const isEnabled = account.enabled !== false;
            const toggleKey = `${provider.id}:${account.id}`;
            const isTogglePending = !!pendingToggleAccountIds[toggleKey];
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
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-all">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isEnabled ? "text-emerald-500" : "text-[var(--text-dim)]"
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
        </div>
      )}
    </div>
  );
});
