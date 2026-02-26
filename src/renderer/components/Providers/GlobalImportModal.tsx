import { FileJson, Layers, X } from "lucide-react";

import { useTranslations } from "../../stores/settings";

interface GlobalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: "oauth" | "custom") => void;
}

export function GlobalImportModal({
  isOpen,
  onClose,
  onSelect,
}: GlobalImportModalProps) {
  const t = useTranslations();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 z-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden animate-scale-in shadow-soft-xl border border-[var(--glass-border)] rounded-3xl isolation-isolate bg-[var(--bg-primary)]/85">
        <div className="absolute inset-0 glass-modal-bg z-0" />
        <div className="relative z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              {t.providers.globalImportTitle}
            </h2>
            <p className="text-xs font-medium text-[var(--text-muted)] opacity-70 mt-1">
              {t.providers.globalImportSubtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--text-primary)]/5 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onSelect("oauth")}
            className="text-left rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] hover:bg-[var(--text-primary)]/[0.05] hover:border-[var(--glass-border-hover)] transition-all p-5"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center mb-3">
              <FileJson className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {t.providers.globalImportOAuthTitle}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              {t.providers.globalImportOAuthDesc}
            </p>
          </button>

          <button
            onClick={() => onSelect("custom")}
            className="text-left rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] hover:bg-[var(--text-primary)]/[0.05] hover:border-[var(--glass-border-hover)] transition-all p-5"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {t.providers.globalImportCustomTitle}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              {t.providers.globalImportCustomDesc}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
