import { memo } from "react";
import { X } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { Provider } from "./types";
import { allProviders } from "./providerDefinitions";

interface AddProviderModalProps {
  onClose: () => void;
  onSelectProvider: (provider: Omit<Provider, "accounts">) => void;
}

export const AddProviderModal = memo(function AddProviderModal({
  onClose,
  onSelectProvider,
}: AddProviderModalProps) {
  const t = useTranslations();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      />
      <div className="relative w-full max-w-[640px] max-h-[85vh] flex flex-col overflow-hidden animate-scale-in shadow-[0_0_60px_-15px_rgba(0,0,0,0.3)] border border-[var(--glass-border)] rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] z-0" />
        <div className="absolute inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-2xl z-0" />

        <div className="relative z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/30">
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            {t.providers.addProvider}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 p-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allProviders.map((provider) => {
              return (
                <div
                  key={provider.id}
                  className={`group glass-card p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] bg-[var(--bg-secondary)]/40 border-[var(--glass-border)] hover:border-[var(--accent-${provider.color})]/40 shadow-sm hover:shadow-md`}
                  onClick={() => onSelectProvider(provider)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-[var(--accent-${provider.color})]/10 text-[var(--accent-${provider.color})] group-hover:scale-110 transition-transform shadow-inner`}
                    >
                      {provider.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[var(--text-primary)] text-sm">
                        {provider.id === "custom"
                          ? t.providers.customProvider
                          : provider.name}
                      </h3>
                      <div className="mt-1">
                        <span
                          className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                            provider.authType === "oauth" ||
                            provider.authType === "oauth-project"
                              ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                              : provider.authType === "import"
                                ? "bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)]"
                                : "bg-[var(--accent-tertiary)]/20 text-[var(--accent-tertiary)]"
                          }`}
                        >
                          {provider.authType === "oauth" ||
                          provider.authType === "oauth-project"
                            ? "OAuth"
                            : provider.authType === "import"
                              ? "Import"
                              : "API Key"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
