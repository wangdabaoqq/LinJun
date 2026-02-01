import { useState, memo } from "react";
import { X, Plus } from "lucide-react";

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
      />
      <div
        className={`relative w-full max-w-[420px] overflow-hidden animate-scale-in shadow-[0_0_60px_-15px_rgba(0,0,0,0.3)] border border-[var(--glass-border)] rounded-2xl flex flex-col`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] z-0" />
        <div className="absolute inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-2xl z-0" />

        <div className="relative z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/30">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[var(--accent-${provider.color})]/10 text-[var(--accent-${provider.color})] shadow-inner`}
            >
              {provider.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {t.providers.addAccountTo}
              </h2>
              <p className="text-xs text-[var(--text-primary)]/70 font-medium">
                {provider.id === "custom"
                  ? t.providers.customProvider
                  : provider.name}
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
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest mb-2 px-1">
              {t.providers.nickname} ({t.providers.optional})
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t.providers.nicknamePlaceholder}
              className="glass-input w-full bg-[var(--bg-deep)] border-white/10 text-[var(--text-primary)]"
            />
          </div>

          {provider.authType === "oauth" ? (
            <div className="space-y-4">
              <div className="glass-card p-4 bg-white/5 border-white/10">
                <p className="text-sm text-[var(--text-primary)]/90 leading-relaxed mb-4">
                  {t.providers.oauthDescription}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-primary)]/40 text-[var(--text-primary)] transition-all active:scale-95 border border-[var(--glass-border)]"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleOAuthConnect}
                    disabled={isLoading}
                    className={`flex-[2] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                      provider.color === "teal"
                        ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white"
                        : provider.color === "magenta"
                          ? "bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-tertiary)] text-white"
                          : "bg-gradient-to-r from-[var(--accent-tertiary)] to-[var(--accent-secondary)] text-white"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t.providers.connecting}
                      </>
                    ) : (
                      <>
                        <span>◎</span>
                        {t.providers.connectOAuth}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : provider.authType === "oauth-project" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest mb-2 px-1">
                  {t.providers.projectIdLabel} ({t.providers.optional})
                </label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder={t.providers.projectIdPlaceholder}
                  className="glass-input w-full bg-[var(--bg-deep)] border-white/10 text-[var(--text-primary)]"
                />
                <p className="text-xs text-[var(--text-primary)]/60 mt-2 px-1">
                  {t.providers.projectIdDescription}
                </p>
              </div>
              <div className="glass-card p-4 bg-white/5 border-white/10">
                <p className="text-sm text-[var(--text-primary)]/90 leading-relaxed mb-4">
                  {t.providers.oauthDescription}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-primary)]/40 text-[var(--text-primary)] transition-all active:scale-95 border border-[var(--glass-border)]"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleOAuthProjectConnect}
                    disabled={isLoading}
                    className={`flex-[2] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                      provider.color === "teal"
                        ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white"
                        : provider.color === "magenta"
                          ? "bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-tertiary)] text-white"
                          : "bg-gradient-to-r from-[var(--accent-tertiary)] to-[var(--accent-secondary)] text-white"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t.providers.connecting}
                      </>
                    ) : (
                      <>
                        <span>◎</span>
                        {t.providers.connectOAuth}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : provider.authType === "import" ? (
            <div className="space-y-4">
              <div className="glass-card p-4 bg-white/5 border-white/10">
                <p className="text-sm text-[var(--text-primary)]/90 leading-relaxed mb-4">
                  {t.providers.importDescription}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-primary)]/40 text-[var(--text-primary)] transition-all active:scale-95 border border-[var(--glass-border)]"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isLoading}
                    className={`flex-[2] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                      provider.color === "teal"
                        ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white"
                        : provider.color === "magenta"
                          ? "bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-tertiary)] text-white"
                          : "bg-gradient-to-r from-[var(--accent-tertiary)] to-[var(--accent-secondary)] text-white"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t.providers.importing}
                      </>
                    ) : (
                      <>
                        <span>↓</span>
                        {t.providers.importFromIDE}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {isCustomProvider && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest mb-2 px-1">
                    {t.providers.endpointLabel}
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder={t.providers.endpointPlaceholder}
                    className="glass-input w-full bg-[var(--bg-deep)] border-white/10 text-[var(--text-primary)]"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest mb-2 px-1">
                  {t.providers.apiKeyLabel}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t.providers.apiKeyPlaceholder}
                  className="glass-input w-full bg-[var(--bg-deep)] border-white/10 text-[var(--text-primary)]"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-primary)]/40 text-[var(--text-primary)] transition-all active:scale-95 border border-[var(--glass-border)]"
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
                  className="flex-[2] py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-blue-500/20 group"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.providers.validating}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                      {t.providers.addAccount}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-100 text-xs font-bold animate-shake">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
