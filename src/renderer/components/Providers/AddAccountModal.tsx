import { useState, memo, useEffect, useRef } from "react";
import { X, Plus, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import log from "@renderer/utils/logger";

import { useTranslations } from "../../stores/settings";
import { AddAccountModalProps } from "./types";

export const AddAccountModal = memo(function AddAccountModal({
  provider,
  onClose,
  onAdd,
}: AddAccountModalProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [antigravityAuthUrl, setAntigravityAuthUrl] = useState<string | null>(
    null,
  );
  const [isAntigravityAuthenticating, setIsAntigravityAuthenticating] =
    useState(false);
  const [copied, setCopied] = useState(false);
  const [kiroAuthState, setKiroAuthState] = useState<string | null>(null);
  const [kiroVerificationUrl, setKiroVerificationUrl] = useState<string | null>(
    null,
  );
  const [kiroUserCode, setKiroUserCode] = useState<string | null>(null);
  const [kiroPendingOpen, setKiroPendingOpen] = useState(false);
  const [kiroAuthMode, setKiroAuthMode] = useState<
    "import" | "token" | "builder-id" | "idc"
  >("import");
  const [kiroTokenInput, setKiroTokenInput] = useState("");
  const [kiroIdcStartUrl, setKiroIdcStartUrl] = useState("");
  const [kiroIdcRegion, setKiroIdcRegion] = useState("us-east-1");
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const isAntigravity = provider.id === "antigravity";
  const isKiro = provider.id === "kiro";
  const isCodex = provider.id === "codex";
  const isAuthUrlModalProvider =
    provider.id === "antigravity" ||
    provider.id === "codex" ||
    provider.id === "claude" ||
    provider.id === "gemini" ||
    provider.id === "qwen" ||
    provider.id === "iflow";

  useEffect(() => {
    if (isAuthUrlModalProvider && (window as any).electronAPI) {
      const authGetters: Record<string, (() => Promise<any>) | undefined> = {
        antigravity: (window as any).electronAPI.antigravity?.getAuthUrl,
        codex: (window as any).electronAPI.codex?.getAuthUrl,
        claude: (window as any).electronAPI.claude?.getAuthUrl,
        gemini: (window as any).electronAPI.gemini?.getAuthUrl,
        qwen: (window as any).electronAPI.qwen?.getAuthUrl,
        iflow: (window as any).electronAPI.iflow?.getAuthUrl,
      };
      const authGetter = authGetters[provider.id];
      if (authGetter) {
        authGetter().then((res: any) => {
          if (res?.status === "ok" && res.url) {
            setAntigravityAuthUrl(res.url);
          }
        });
      }
    }
  }, [isAuthUrlModalProvider, provider.id]);

  useEffect(() => {
    if (!isKiro) {
      return;
    }
    setKiroVerificationUrl(null);
    setKiroUserCode(null);
    setKiroAuthState(null);
    setKiroPendingOpen(false);
  }, [isKiro, kiroAuthMode]);

  useEffect(() => {
    if (!isKiro || !kiroAuthState) {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const status = await (window as any).electronAPI?.kiro?.getAuthStatus(
          kiroAuthState,
        );
        if (!status || cancelled) return;

        if (status.status === "device_code") {
          if (status.verification_url) {
            setKiroVerificationUrl(status.verification_url);
          }
          if (status.user_code) {
            setKiroUserCode(status.user_code);
          }
          if (status.verification_url && kiroPendingOpen) {
            (window as any).electronAPI?.app.openExternal(
              status.verification_url,
            );
            setKiroPendingOpen(false);
          }
        } else if (status.status === "auth_url" && status.url) {
          setKiroVerificationUrl(status.url);
          if (kiroPendingOpen) {
            (window as any).electronAPI?.app.openExternal(status.url);
            setKiroPendingOpen(false);
          }
        } else if (status.status === "error" && status.error) {
          setError(status.error);
          setKiroPendingOpen(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setKiroPendingOpen(false);
        }
      }
    };

    const interval = setInterval(poll, 1200);
    poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isKiro, kiroAuthState, kiroPendingOpen]);

  const isCustomProvider = provider.id === "custom";

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const runCloseAnimation = (action: () => void) => {
    if (isClosing) {
      return;
    }
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      action();
    }, 240);
  };

  const handleOAuthConnect = async () => {
    if (isAuthUrlModalProvider && antigravityAuthUrl) {
      setIsAntigravityAuthenticating(true);
      (window as any).electronAPI?.app.openExternal(antigravityAuthUrl);
      setTimeout(() => {
        setIsAntigravityAuthenticating(false);
      }, 5000);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await (window as any).electronAPI?.api.startAuth(
        provider.id as any,
      );
      if (result?.success) {
        runCloseAnimation(() => {
          onAdd({
            email: `oauth-${provider.id}@pending`,
            nickname: undefined,
          });
        });
      } else {
        setError(result?.error || "Authentication failed");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKiroImportMode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await (window as any).electronAPI?.kiro?.importToken();
      if (result?.success) {
        runCloseAnimation(() => {
          onAdd({
            email: `import-${provider.id}@scanning`,
            nickname: undefined,
          });
        });
      } else {
        setError(result?.error || "Failed to import Kiro token");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKiroTokenImport = async () => {
    if (!kiroTokenInput.trim()) {
      setError("Please input Kiro token JSON");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await (window as any).electronAPI?.kiro?.importFromToken(
        kiroTokenInput.trim(),
      );
      if (result?.success) {
        runCloseAnimation(() => {
          onAdd({
            email: `import-${provider.id}@token`,
            nickname: undefined,
          });
        });
      } else {
        setError(result?.error || "Failed to import Kiro token");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKiroOAuthMode = async (mode: "builder-id" | "idc") => {
    if (mode === "idc" && !kiroIdcStartUrl.trim()) {
      setError(t.providers.kiroIdcStartUrlRequired);
      return;
    }

    setIsAntigravityAuthenticating(true);
    setKiroVerificationUrl(null);
    setKiroUserCode(null);
    setKiroAuthState(null);
    setKiroPendingOpen(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.kiro?.getAuthUrl({
        method: mode,
        startUrl: mode === "idc" ? kiroIdcStartUrl.trim() : undefined,
        region:
          mode === "idc" ? kiroIdcRegion.trim() || "us-east-1" : undefined,
      });

      if (result?.status === "ok" && result.state) {
        setKiroAuthState(result.state);
      } else {
        setError(t.providers.kiroAuthUrlFailed);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setTimeout(() => {
        setIsAntigravityAuthenticating(false);
      }, 5000);
    }
  };

  const handleOAuthProjectConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await (window as any).electronAPI?.gemini?.getAuthUrl(
        projectId.trim() || undefined,
      );
      if (result?.status === "ok") {
        runCloseAnimation(() => {
          onAdd({
            email: `oauth-${provider.id}@pending`,
            nickname: undefined,
          });
        });
      } else {
        setError("Failed to get Gemini authentication URL");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      runCloseAnimation(() => {
        onAdd({
          email: `import-${provider.id}@scanning`,
          nickname: undefined,
        });
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) return;
    if (isCustomProvider && !endpoint.trim()) {
      setError(t.providers.endpointRequired);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await (window as any).electronAPI?.api.validateApiKey(
        provider.id as any,
        apiKey,
      );
      if (result?.valid) {
        runCloseAnimation(() => {
          onAdd({
            email:
              result.email ||
              (isCustomProvider ? endpoint : `apikey-${Date.now()}@local`),
            nickname: undefined,
          });
        });
      } else {
        setError(result?.error || "Invalid API key");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      log.error("[Providers] Failed to copy auth URL:", err);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? "pointer-events-none" : ""}`}
    >
      <div
        className={`fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      />
      <div
        className={`relative w-full ${isKiro ? "max-w-[560px]" : "max-w-[420px]"} overflow-hidden ${isClosing ? "animate-scale-out" : "animate-scale-in"} shadow-soft-xl border border-[var(--glass-border)] rounded-3xl flex flex-col isolation-isolate bg-[var(--bg-primary)] transition-all duration-300`}
      >
        <div className="absolute inset-0 glass-modal-bg z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 via-transparent to-transparent z-0" />

        <div className="relative z-10 flex items-center justify-between p-8 border-b border-[var(--glass-border)] text-left">
          <div className="flex items-center gap-5">
            <div className="text-4xl transition-transform duration-300 group-hover:scale-105">
              {provider.icon}
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight leading-tight text-left">
                {t.providers.addAccountTo}
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mt-1 text-left">
                {provider.id === "custom"
                  ? t.providers.customProvider
                  : provider.name}
              </p>
            </div>
          </div>
          {!isAntigravityAuthenticating && (
            <button
              onClick={() => runCloseAnimation(onClose)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="relative z-10 p-8 space-y-8 min-h-[300px]">
          {isAntigravityAuthenticating ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-8 animate-fade-in text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[var(--accent-magenta)]/20 animate-ping" />
                <div className="relative w-24 h-24 flex items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-tertiary)]/40">
                  <Loader2 className="w-10 h-10 text-[var(--accent-magenta)] animate-spin" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {isAntigravity
                    ? t.providers.oauthProgressGoogle
                    : t.providers.oauthProgressGeneric}
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] max-w-[280px] mx-auto uppercase tracking-wider font-bold">
                  {isAntigravity
                    ? t.providers.oauthHintGoogle
                    : t.providers.oauthHintGeneric}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col text-left">
              {provider.authType === "oauth" ? (
                isKiro ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em] pl-1">
                        {t.providers.kiroAuthModeLabel}
                      </label>
                      <div className="relative grid grid-cols-4 gap-1 p-1 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--glass-border)] shadow-inner">
                        <div
                          className="absolute top-1 bottom-1 rounded-xl bg-[var(--bg-primary)] shadow-soft-md transition-all duration-300 ease-out"
                          style={{
                            width: "calc(25% - 4px)",
                            left:
                              kiroAuthMode === "import"
                                ? "4px"
                                : kiroAuthMode === "token"
                                  ? "calc(25% + 2px)"
                                  : kiroAuthMode === "builder-id"
                                    ? "calc(50% + 1px)"
                                    : "calc(75% - 1px)",
                          }}
                        />
                        {[
                          {
                            id: "import",
                            label: t.providers.kiroAuthModeCurrent,
                          },
                          { id: "token", label: t.providers.kiroAuthModeToken },
                          {
                            id: "builder-id",
                            label: t.providers.kiroAuthModeBuilder,
                          },
                          { id: "idc", label: t.providers.kiroAuthModeIdc },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() =>
                              setKiroAuthMode(mode.id as typeof kiroAuthMode)
                            }
                            className={`relative z-10 min-h-[40px] rounded-lg px-1 text-[9px] font-bold tracking-wide transition-colors duration-300 flex items-center justify-center ${
                              kiroAuthMode === mode.id
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <span className="block text-center leading-tight whitespace-normal break-words">
                              {mode.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed text-left">
                      {kiroAuthMode === "import"
                        ? t.providers.importDescription
                        : kiroAuthMode === "token"
                          ? t.providers.kiroTokenImportDescription
                          : kiroAuthMode === "idc"
                            ? t.providers.kiroIdcDescription
                            : t.providers.oauthDescription}
                    </p>

                    {kiroAuthMode === "token" && (
                      <textarea
                        value={kiroTokenInput}
                        onChange={(e) => setKiroTokenInput(e.target.value)}
                        placeholder={t.providers.kiroTokenInputPlaceholder}
                        className="glass-input w-full min-h-[120px] font-mono text-[11px] leading-relaxed resize-none"
                      />
                    )}

                    {(kiroAuthMode === "builder-id" ||
                      kiroAuthMode === "idc") && (
                      <div className="space-y-3">
                        {kiroVerificationUrl && (
                          <div className="group space-y-2 text-left">
                            <label className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em] pl-1">
                              {t.providers.kiroVerificationUrlLabel}
                            </label>
                            <div className="relative">
                              <div className="w-full font-mono text-[10px] text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-3.5 rounded-xl border border-[var(--glass-border)] truncate leading-relaxed shadow-inner pr-12">
                                {kiroVerificationUrl}
                              </div>
                              <button
                                onClick={() =>
                                  handleCopyValue(kiroVerificationUrl)
                                }
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)]/5 transition-all active:scale-90"
                                title={t.common.copy}
                              >
                                {copied ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {kiroUserCode && (
                          <div className="group space-y-2 text-left">
                            <label className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em] pl-1">
                              {t.providers.kiroUserCodeLabel}
                            </label>
                            <div className="relative">
                              <div className="w-full font-mono text-[12px] text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--glass-border)] leading-relaxed shadow-inner pr-12 tracking-[0.2em]">
                                {kiroUserCode}
                              </div>
                              <button
                                onClick={() => handleCopyValue(kiroUserCode)}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)]/5 transition-all active:scale-90"
                                title={t.common.copy}
                              >
                                {copied ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {kiroAuthMode === "idc" && (
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          type="url"
                          value={kiroIdcStartUrl}
                          onChange={(e) => setKiroIdcStartUrl(e.target.value)}
                          placeholder={t.providers.kiroIdcStartUrlPlaceholder}
                          className="glass-input w-full"
                        />
                        <input
                          type="text"
                          value={kiroIdcRegion}
                          onChange={(e) => setKiroIdcRegion(e.target.value)}
                          placeholder={t.providers.kiroIdcRegionPlaceholder}
                          className="glass-input w-full"
                        />
                      </div>
                    )}

                    <button
                      onClick={
                        kiroAuthMode === "import"
                          ? handleKiroImportMode
                          : kiroAuthMode === "token"
                            ? handleKiroTokenImport
                            : kiroAuthMode === "builder-id"
                              ? () => handleKiroOAuthMode("builder-id")
                              : () => handleKiroOAuthMode("idc")
                      }
                      disabled={
                        isLoading ||
                        (kiroAuthMode === "token" && !kiroTokenInput.trim()) ||
                        (kiroAuthMode === "idc" && !kiroIdcStartUrl.trim())
                      }
                      className="w-full h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase glass-btn glass-btn-primary flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>
                          {kiroAuthMode === "import"
                            ? t.providers.importFromIDE
                            : kiroAuthMode === "token"
                              ? t.providers.kiroTokenImportAction
                              : kiroAuthMode === "builder-id"
                                ? t.providers.kiroBuilderIdLogin
                                : t.providers.kiroIdcLogin}
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div
                      className={`space-y-6 ${isAuthUrlModalProvider ? "" : "p-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01]"}`}
                    >
                      <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed text-left">
                        {isAntigravity
                          ? t.providers.antigravityAuthInstructions
                          : t.providers.oauthDescription}
                      </p>

                      {isAuthUrlModalProvider && antigravityAuthUrl && (
                        <div className="group space-y-2 text-left">
                          <label className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em] pl-1">
                            {t.providers.antigravityCallbackLabel}
                          </label>
                          <div className="relative">
                            <div className="w-full font-mono text-[10px] text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-3.5 rounded-xl border border-[var(--glass-border)] truncate leading-relaxed shadow-inner pr-12">
                              {antigravityAuthUrl}
                            </div>
                            <button
                              onClick={() =>
                                handleCopyValue(antigravityAuthUrl)
                              }
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)]/5 transition-all active:scale-90"
                              title={t.common.copy}
                            >
                              {copied ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        {!isAuthUrlModalProvider && (
                          <button
                            onClick={onClose}
                            className="flex-1 h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase border border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all"
                          >
                            {t.common.cancel}
                          </button>
                        )}
                        <button
                          onClick={handleOAuthConnect}
                          disabled={isLoading}
                          className="flex-[2] h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase glass-btn glass-btn-primary flex items-center justify-center gap-2"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span>
                              {isAuthUrlModalProvider
                                ? t.providers.antigravityAuthOpen
                                : t.providers.connectOAuth}
                            </span>
                          )}
                          {isAuthUrlModalProvider && !isLoading && (
                            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              ) : provider.authType === "oauth-project" ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2.5 px-1 text-left">
                      {t.providers.projectIdLabel} ({t.providers.optional})
                    </label>
                    <input
                      type="text"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder={t.providers.projectIdPlaceholder}
                      className="glass-input w-full"
                    />
                    <p className="text-[10px] text-[var(--text-dim)] mt-2 px-1 italic opacity-60 text-left">
                      {t.providers.projectIdDescription}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01]">
                    <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed mb-6 text-left">
                      {t.providers.oauthDescription}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="flex-1 h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase border border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        onClick={handleOAuthProjectConnect}
                        disabled={isLoading}
                        className="flex-[2] h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase glass-btn glass-btn-primary flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t.providers.connectOAuth
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : provider.authType === "import" ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01]">
                    <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed mb-6 text-left">
                      {t.providers.importDescription}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="flex-1 h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase border border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        onClick={handleImport}
                        disabled={isLoading}
                        className="flex-[2] h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase glass-btn glass-btn-primary flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t.providers.importFromIDE
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {isCustomProvider && (
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2.5 px-1 text-left">
                        {t.providers.endpointLabel}
                      </label>
                      <input
                        type="text"
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        placeholder={t.providers.endpointPlaceholder}
                        className="glass-input w-full"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2.5 px-1 text-left">
                      {t.providers.apiKeyLabel}
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={t.providers.apiKeyPlaceholder}
                      className="glass-input w-full"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase border border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      onClick={handleApiKeySubmit}
                      disabled={
                        isLoading ||
                        !apiKey.trim() ||
                        (isCustomProvider && !endpoint.trim())
                      }
                      className="flex-[2] h-11 rounded-xl font-bold text-[10px] tracking-wider uppercase glass-btn glass-btn-primary flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t.providers.addAccount
                      )}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-shake text-center">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
