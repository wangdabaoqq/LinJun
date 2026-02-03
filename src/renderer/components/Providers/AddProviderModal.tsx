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
        onClick={onClose}
      />
      <div className="relative w-full max-w-[820px] max-h-[85vh] flex flex-col overflow-hidden animate-scale-in shadow-soft-xl border border-[var(--glass-border)] rounded-3xl isolation-isolate">
        <div className="absolute inset-0 glass-modal-bg z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 via-transparent to-transparent z-0" />

        <div className="relative z-10 flex items-center justify-between p-8 border-b border-[var(--glass-border)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            {t.providers.addProvider}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--text-primary)]/5 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 p-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {allProviders.map((provider) => {
              return (
                <div
                  key={provider.id}
                  className="group relative p-6 cursor-pointer transition-all duration-300 rounded-2xl glass-card border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01] hover:bg-[var(--text-primary)]/[0.03] hover:border-[var(--accent-primary)]/20 hover:shadow-soft-md"
                  onClick={() => onSelectProvider(provider)}
                >
                  <div className="flex flex-col gap-6">
                    <div className="text-4xl transition-transform duration-300 group-hover:scale-105">
                      {provider.icon}
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-[var(--text-primary)] text-base tracking-tight leading-tight">
                        {provider.id === "custom"
                          ? t.providers.customProvider
                          : provider.name}
                      </h3>
                      <div className="flex">
                        <span className="px-3 py-1 text-[9px] rounded-full font-bold uppercase tracking-wider border border-[var(--glass-border)] text-[var(--text-dim)] group-hover:text-[var(--text-primary)] group-hover:border-[var(--text-primary)]/20 transition-all opacity-70">
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
