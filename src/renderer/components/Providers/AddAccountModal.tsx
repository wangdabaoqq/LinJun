import { useState, memo } from "react";
import { X, Plus, Loader2 } from "lucide-react";

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
  const [nickname, setNickname] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isCustomProvider = provider.id === "custom";

  const handleOAuthConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI?.api.startAuth(
        provider.id as Parameters<typeof window.electronAPI.api.startAuth>[0],
      );
      if (result?.success) {
        onAdd({
          email: `oauth-${provider.id}@pending`,
          nickname: nickname || undefined,
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

  const handleOAuthProjectConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI?.gemini?.getAuthUrl(
        projectId.trim() || undefined,
      );
      if (result?.status === "ok") {
        onAdd({
          email: `oauth-${provider.id}@pending`,
          nickname: nickname || undefined,
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
      onAdd({
        email: `import-${provider.id}@scanning`,
        nickname: nickname || undefined,
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
      const result = await window.electronAPI?.api.validateApiKey(
        provider.id as Parameters<
          typeof window.electronAPI.api.validateApiKey
        >[0],
        apiKey,
      );
      if (result?.valid) {
        onAdd({
          email:
            result.email ||
            (isCustomProvider ? endpoint : `apikey-${Date.now()}@local`),
          nickname: nickname || undefined,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
        onClick={onClose}
      />
      <div className="relative w-full max-w-[420px] overflow-hidden animate-scale-in shadow-soft-xl border border-[var(--glass-border)] rounded-3xl flex flex-col isolation-isolate">
        <div className="absolute inset-0 glass-modal-bg z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 via-transparent to-transparent z-0" />

        <div className="relative z-10 flex items-center justify-between p-8 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-5">
            <div className="text-4xl transition-transform duration-300 group-hover:scale-105">
              {provider.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                {t.providers.addAccountTo}
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mt-1">
                {provider.id === "custom"
                  ? t.providers.customProvider
                  : provider.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 p-8 space-y-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2.5 px-1">
                {t.providers.nickname} ({t.providers.optional})
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t.providers.nicknamePlaceholder}
                className="glass-input w-full"
              />
            </div>

            {provider.authType === "oauth" ? (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01]">
                  <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed mb-6">
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
                      onClick={handleOAuthConnect}
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
            ) : provider.authType === "oauth-project" ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2.5 px-1">
                    {t.providers.projectIdLabel} ({t.providers.optional})
                  </label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder={t.providers.projectIdPlaceholder}
                    className="glass-input w-full"
                  />
                  <p className="text-[10px] text-[var(--text-dim)] mt-2 px-1 italic opacity-60">
                    {t.providers.projectIdDescription}
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01]">
                  <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed mb-6">
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
                  <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed mb-6">
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
                    <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2.5 px-1">
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
                  <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2.5 px-1">
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
        </div>
      </div>
    </div>
  );
});
