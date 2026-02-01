import { useState, memo } from "react";
import log from "@renderer/utils/logger";
import GithubCopilot from "@lobehub/icons/es/GithubCopilot";
import { X } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { CopilotAuthInfo } from "./types";

interface CopilotAuthModalProps {
  authInfo: CopilotAuthInfo;
  onClose: () => void;
  authError: string | null;
}

export const CopilotAuthModal = memo(function CopilotAuthModal({
  authInfo,
  onClose,
  authError,
}: CopilotAuthModalProps) {
  const t = useTranslations();
  const [copilotCopied, setCopilotCopied] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      />
      <div className="relative w-full max-w-[460px] overflow-hidden animate-scale-in shadow-[0_0_60px_-15px_rgba(0,0,0,0.3)] border border-[var(--glass-border)] rounded-2xl flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] z-0" />
        <div className="absolute inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-2xl z-0" />

        <div className="relative z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] shadow-inner">
              <GithubCopilot size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {t.providers.copilotDeviceTitle}
              </h2>
              <p className="text-xs text-[var(--text-primary)]/70 font-medium">
                {t.providers.copilotDeviceSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] hover:bg-white/10 transition-all"
            aria-label={t.providers.dismiss}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 p-6 space-y-6">
          <div className="glass-card p-5 bg-white/[0.03] border-white/10">
            <p className="text-xs font-bold text-[var(--text-primary)]/60 uppercase tracking-widest mb-3">
              {t.providers.copilotDeviceCodeLabel}
            </p>
            <div className="flex items-center justify-between gap-4">
              <div className="font-mono text-2xl font-bold tracking-[0.2em] text-[var(--accent-primary)] drop-shadow-sm">
                {authInfo.user_code}
              </div>
              <button
                className="glass-btn text-xs py-2 px-4 font-bold bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-xl transition-all active:scale-95"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(authInfo.user_code);
                    setCopilotCopied(true);
                    setTimeout(() => setCopilotCopied(false), 2000);
                  } catch (error) {
                    log.error("[Providers] Failed to copy code:", error);
                  }
                }}
              >
                {copilotCopied
                  ? t.providers.copilotDeviceCodeCopied
                  : t.providers.copilotDeviceCodeCopy}
              </button>
            </div>
          </div>

          <div className="glass-card p-5 bg-white/[0.03] border-white/10">
            <p className="text-sm text-[var(--text-primary)]/90 leading-relaxed mb-4">
              {t.providers.copilotDeviceInstructions}
            </p>
            <button
              onClick={() =>
                window.electronAPI?.app.openExternal(
                  authInfo.url || authInfo.verification_uri,
                )
              }
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              {t.providers.copilotDeviceOpen}
            </button>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-100 text-xs font-bold animate-shake">
              {authError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
