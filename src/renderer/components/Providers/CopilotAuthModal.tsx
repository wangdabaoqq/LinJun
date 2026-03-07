import { useState, useEffect, useRef, memo } from "react";
import log from "@renderer/utils/logger";
import GithubCopilot from "@lobehub/icons/es/GithubCopilot";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { CopilotAuthInfo } from "./types";

interface CopilotAuthModalProps {
  authInfo: CopilotAuthInfo;
  onClose: () => void;
  onSuccess?: () => void;
  authError: string | null;
}

export const CopilotAuthModal = memo(function CopilotAuthModal({
  authInfo,
  onClose,
  onSuccess,
  authError,
}: CopilotAuthModalProps) {
  const t = useTranslations();
  const [copilotCopied, setCopilotCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<
    "idle" | "waiting" | "success" | "error"
  >("idle");
  const [pollError, setPollError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const pollStartRef = useRef<number>(0);

  // GitHub device codes typically expire in ~15 minutes
  const DEVICE_CODE_TIMEOUT_MS = 15 * 60 * 1000;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // Poll oauth:getAuthStatus when waiting
  useEffect(() => {
    if (oauthStatus !== "waiting" || !authInfo.state) return;

    pollStartRef.current = Date.now();
    let cancelled = false;

    const poll = async () => {
      // Client-side timeout check
      if (Date.now() - pollStartRef.current > DEVICE_CODE_TIMEOUT_MS) {
        if (!cancelled) {
          log.warn("[CopilotAuth] Device code polling timed out");
          setOauthStatus("error");
          setPollError(
            t.providers.copilotDeviceExpired ||
              "Device code expired. Please try again.",
          );
        }
        return;
      }

      try {
        const status = await window.electronAPI?.oauth?.getAuthStatus(
          authInfo.state,
        );
        if (!status || cancelled) return;

        if (status.status === "ok") {
          setOauthStatus("success");
          closeTimerRef.current = window.setTimeout(() => {
            if (!cancelled) {
              onSuccess?.();
              onClose();
            }
          }, 2400);
        } else if (status.status === "error") {
          setOauthStatus("error");
          setPollError(
            status.error || t.providers.authFailed || "Authentication failed",
          );
        }
        // "pending" | "wait" → keep polling (no action needed)
      } catch (err) {
        if (!cancelled) {
          log.error("[CopilotAuth] Polling error:", err);
          setOauthStatus("error");
          setPollError(String(err));
        }
      }
    };

    const interval = setInterval(poll, 1500);
    poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    oauthStatus,
    authInfo.state,
    onClose,
    onSuccess,
    t.providers.authFailed,
    t.providers.copilotDeviceExpired,
  ]);

  const handleOpenLoginPage = () => {
    setOauthStatus("waiting");
    window.electronAPI?.app.openExternal(
      authInfo.url || authInfo.verification_uri,
    );
  };

  const handleRetry = () => {
    setPollError(null);
    setOauthStatus("idle");
  };

  const runCloseAnimation = (action: () => void) => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(action, 240);
  };

  const verificationUrl = authInfo.url || authInfo.verification_uri;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (error) {
      log.error("[CopilotAuth] Failed to copy URL:", error);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(authInfo.user_code);
      setCopilotCopied(true);
      setTimeout(() => setCopilotCopied(false), 2000);
    } catch (error) {
      log.error("[CopilotAuth] Failed to copy code:", error);
    }
  };

  const displayError = pollError || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
        onClick={() => runCloseAnimation(onClose)}
      />
      <div
        className={`relative w-full max-w-[460px] overflow-hidden shadow-[0_0_60px_-15px_rgba(0,0,0,0.3)] border border-[var(--glass-border)] rounded-2xl flex flex-col transition-all duration-240 ${isClosing ? "opacity-0 scale-95" : "animate-scale-in"}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] z-0" />
        <div className="absolute inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-2xl z-0" />

        {/* Header */}
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
            onClick={() => runCloseAnimation(onClose)}
            className="p-2 rounded-lg text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] hover:bg-white/10 transition-all"
            aria-label={t.providers.dismiss}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="relative z-10 p-6 min-h-[300px]">
          {oauthStatus === "success" ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-10 animate-fade-in text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">
                  {t.providers.authSuccess || "CONNECTED!"}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-medium max-w-[240px] mx-auto leading-relaxed">
                  {t.providers.authSuccessMessage ||
                    "Your account has been successfully linked."}
                </p>
              </div>
            </div>
          ) : oauthStatus === "error" ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-10 animate-fade-in text-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <div className="space-y-4 max-w-[320px]">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {t.providers.authFailed || "Authentication Failed"}
                </h3>
                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 text-[11px] font-mono leading-relaxed break-words shadow-inner">
                  {displayError || "Unknown error occurred"}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleRetry}
                  className="px-6 h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase border border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all flex items-center gap-2 active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {t.common.back || "Back"}
                </button>
                <button
                  onClick={() => {
                    handleRetry();
                    handleOpenLoginPage();
                  }}
                  className="px-6 h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase glass-btn glass-btn-primary flex items-center justify-center gap-2 active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t.common.retry || "Try Again"}
                </button>
              </div>
            </div>
          ) : oauthStatus === "waiting" ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-10 animate-fade-in text-center">
              {/* Spinning loader */}
              <div className="relative h-20 w-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-[var(--glass-border)]" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent-primary)] animate-spin" />
                <div className="flex items-center justify-center">
                  <GithubCopilot size={32} className="animate-pulse" />
                </div>
              </div>

              <div className="space-y-4 max-w-[280px]">
                <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                  {t.providers.waitingForBrowser || "Waiting for Browser"}
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] max-w-[240px] mx-auto leading-relaxed font-bold uppercase tracking-wider">
                  {t.providers.copilotDeviceWaiting ||
                    t.providers.oauthHintGeneric}
                </p>
              </div>

              {/* Device code — only visible during waiting */}
              <div className="w-full glass-card p-4 bg-white/[0.03] border-white/10">
                <p className="text-[9px] font-bold text-[var(--text-primary)]/40 uppercase tracking-widest mb-2">
                  {t.providers.copilotDeviceCodeLabel}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono text-lg font-bold tracking-[0.2em] text-[var(--accent-primary)]">
                    {authInfo.user_code}
                  </div>
                  <button
                    className="glass-btn text-[10px] py-1.5 px-3 font-bold bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-lg transition-all active:scale-95"
                    onClick={handleCopyCode}
                  >
                    {copilotCopied
                      ? t.providers.copilotDeviceCodeCopied
                      : t.providers.copilotDeviceCodeCopy}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setOauthStatus("idle")}
                className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2 group active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                {t.common.cancel || "Cancel"}
              </button>
            </div>
          ) : (
            /* idle — verification URL + open button (like iFlow) */
            <div className="space-y-6">
              <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed text-left">
                {t.providers.copilotDeviceInstructions}
              </p>

              {/* Verification URL (like iFlow callback URL) */}
              <div className="group space-y-2 text-left">
                <label className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em] pl-1">
                  {t.providers.antigravityCallbackLabel}
                </label>
                <div className="relative">
                  <div className="w-full font-mono text-[10px] text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-3.5 rounded-xl border border-[var(--glass-border)] truncate leading-relaxed shadow-inner pr-12">
                    {verificationUrl}
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)]/5 transition-all active:scale-90"
                    title={t.common.copy}
                  >
                    {urlCopied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handleOpenLoginPage}
                className="w-full h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase glass-btn glass-btn-primary flex items-center justify-center gap-2 active:scale-95"
              >
                <span>{t.providers.copilotDeviceOpen}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </button>

              {authError && (
                <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-100 text-xs font-bold animate-shake">
                  {authError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
