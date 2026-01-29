import { useState, useEffect } from "react";
import { useTranslations } from "../../stores/settings";
import Claude from "@lobehub/icons/es/Claude";
import OpenAI from "@lobehub/icons/es/OpenAI";
import Gemini from "@lobehub/icons/es/Gemini";
import GithubCopilot from "@lobehub/icons/es/GithubCopilot";
import Qwen from "@lobehub/icons/es/Qwen";
import { Trash2, Edit2, X, Plus } from "lucide-react";

import {
  AntigravityIcon,
  IFlowIcon,
  KiroIcon,
  CustomIcon,
} from "../icons/ProviderIcons";
import { useProvidersStore, TokenAccount } from "../../stores/providers";
import { CustomProviderForm } from "./CustomProviderForm";

interface OpenAICompatProvider {
  name: string;
  "base-url": string;
  "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
  models?: { name: string; alias?: string }[];
}

interface Account {
  id: string;
  email: string;
  nickname?: string;
  status: "online" | "offline";
  lastUsed: string;
  filePath?: string;
}

interface Provider {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: "teal" | "magenta" | "indigo";
  description: string;
  authType: "oauth" | "apikey" | "import" | "oauth-project";
  accounts: Account[];
}

interface AddAccountModalProps {
  provider: Omit<Provider, "accounts">;
  onClose: () => void;
  onAdd: (account: Omit<Account, "id" | "status" | "lastUsed">) => void;
}

interface CopilotAuthInfo {
  status: "ok" | "error";
  url: string;
  state: string;
  user_code: string;
  verification_uri: string;
}

const allProviders: Omit<Provider, "accounts">[] = [
  {
    id: "claude",
    name: "Claude Code",
    icon: <Claude.Color size={24} />,
    color: "magenta",
    description: "Claude 4, Claude 3.5 Sonnet, Claude 3 Opus",
    authType: "oauth",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    icon: <Gemini.Color size={24} />,
    color: "indigo",
    description: "Gemini 2.5 Pro/Flash, Gemini 1.5",
    authType: "oauth",
  },
  {
    id: "codex",
    name: "Codex (OpenAI)",
    icon: <OpenAI size={24} />,
    color: "teal",
    description: "GPT-4o, o1, o3, ChatGPT Plus",
    authType: "oauth",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    icon: <AntigravityIcon />,
    color: "magenta",
    description: "Claude 4 Sonnet, Gemini 2.5 Pro",
    authType: "oauth",
  },
  {
    id: "qwen",
    name: "Qwen Code",
    icon: <Qwen.Color size={24} />,
    color: "indigo",
    description: "Qwen 3, Qwen 2.5 Coder",
    authType: "oauth",
  },
  {
    id: "iflow",
    name: "iFlow",
    icon: <IFlowIcon />,
    color: "teal",
    description: "Claude 4 Sonnet, Gemini 2.5 Pro",
    authType: "oauth",
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    icon: <GithubCopilot size={24} />,
    color: "teal",
    description: "GPT-4o, Claude 3.5, Gemini 2.0",
    authType: "oauth",
  },
  {
    id: "kiro",
    name: "Kiro",
    icon: <KiroIcon />,
    color: "indigo",
    description: "Claude Sonnet 4, Amazon Nova",
    authType: "oauth",
  },
  {
    id: "custom",
    name: "Custom Provider",
    icon: <CustomIcon />,
    color: "indigo",
    description: "Custom OpenAI-compatible endpoint",
    authType: "apikey",
  },
];

function AddAccountModal({ provider, onClose, onAdd }: AddAccountModalProps) {
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
                <button
                  onClick={handleOAuthConnect}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
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
                <button
                  onClick={handleOAuthProjectConnect}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
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
          ) : provider.authType === "import" ? (
            <div className="space-y-4">
              <div className="glass-card p-4 bg-white/5 border-white/10">
                <p className="text-sm text-[var(--text-primary)]/90 leading-relaxed mb-4">
                  {t.providers.importDescription}
                </p>
                <button
                  onClick={handleImport}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
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
              <button
                onClick={handleApiKeySubmit}
                disabled={
                  isLoading ||
                  !apiKey.trim() ||
                  (isCustomProvider && !endpoint.trim())
                }
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-blue-500/20 group"
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
}

function AddProviderModal({
  onClose,
  onSelectProvider,
}: {
  onClose: () => void;
  onSelectProvider: (provider: Omit<Provider, "accounts">) => void;
}) {
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
}

function ProviderCard({
  provider,
  onAddAccount,
  onRemoveAccount,
}: {
  provider: Provider;
  onAddAccount: (providerId: string) => void;
  onRemoveAccount: (providerId: string, accountId: string) => void;
}) {
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
}

export function Providers() {
  const t = useTranslations();
  const providerAccounts = useProvidersStore((state) => state.accounts);
  const isLoading = useProvidersStore((state) => state.isLoading);
  const loadAccounts = useProvidersStore((state) => state.loadAccounts);
  const removeAccountLocal = useProvidersStore(
    (state) => state.removeAccountLocal,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAccountProvider, setAddAccountProvider] = useState<Omit<
    Provider,
    "accounts"
  > | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copilotAuthInfo, setCopilotAuthInfo] =
    useState<CopilotAuthInfo | null>(null);
  const [copilotAuthError, setCopilotAuthError] = useState<string | null>(null);
  const [copilotCopied, setCopilotCopied] = useState(false);
  const [customProviders, setCustomProviders] = useState<
    OpenAICompatProvider[]
  >([]);
  const [showCustomProviderForm, setShowCustomProviderForm] = useState(false);
  const [editingCustomProvider, setEditingCustomProvider] =
    useState<OpenAICompatProvider | null>(null);

  useEffect(() => {
    loadAccounts();
    loadCustomProviders();
  }, [loadAccounts]);

  const loadCustomProviders = async () => {
    try {
      const result = await window.electronAPI?.openaiCompat?.getAll();
      if (result?.success) {
        setCustomProviders(result.providers || []);
      }
    } catch (err) {
      console.error("[Providers] Failed to load custom providers:", err);
    }
  };

  const handleDeleteCustomProvider = async (name: string) => {
    if (!confirm(t.providers.customDeleteConfirm.replace("{name}", name))) {
      return;
    }
    try {
      const result = await window.electronAPI?.openaiCompat?.delete(name);
      if (result?.success) {
        setCustomProviders(result.providers || []);
      }
    } catch (err) {
      console.error("[Providers] Failed to delete custom provider:", err);
    }
  };

  const triggerAuth = async (providerInfo: Omit<Provider, "accounts">) => {
    if (!window.electronAPI) {
      setAuthError(
        "Electron API not available. Please run in Electron environment.",
      );
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);
    console.log("[Auth] Starting authentication for:", providerInfo.id);

    if (providerInfo.id === "qwen") {
      console.log("[Auth] Using Qwen API OAuth");
      try {
        const result = await window.electronAPI.qwen?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get Qwen authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        console.error("[Auth] Qwen OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "antigravity") {
      console.log("[Auth] Using Antigravity API OAuth");
      try {
        const result = await window.electronAPI.antigravity?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get Antigravity authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        console.error("[Auth] Antigravity OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "iflow") {
      console.log("[Auth] Using iFlow API OAuth");
      try {
        const result = await window.electronAPI.iflow?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get iFlow authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        console.error("[Auth] iFlow OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "claude") {
      console.log("[Auth] Using Claude API OAuth");
      try {
        const result = await window.electronAPI.claude?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get Claude authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        console.error("[Auth] Claude OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "gemini") {
      console.log("[Auth] Using Gemini API OAuth");
      try {
        const result = await window.electronAPI.gemini?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get Gemini authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        console.error("[Auth] Gemini OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "codex") {
      console.log("[Auth] Using Codex API OAuth");
      try {
        const result = await window.electronAPI.codex?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get Codex authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        console.error("[Auth] Codex OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "copilot") {
      console.log("[Auth] Using Copilot device login");
      try {
        const result = await window.electronAPI.copilot?.getAuthUrl();
        if (result?.status === "ok") {
          setCopilotAuthInfo(result);
        } else {
          setCopilotAuthError(t.providers.copilotDeviceError);
        }
      } catch (err) {
        console.error("[Auth] Copilot login error:", err);
        setCopilotAuthError(String(err));
      } finally {
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "kiro") {
      console.log("[Auth] Using Kiro import");
      try {
        const result = await window.electronAPI.kiro?.importToken();
        if (result?.success) {
          loadAccounts({ force: true });
          setIsAuthenticating(false);
        } else {
          setAuthError(result?.error || "Failed to import Kiro token");
          setIsAuthenticating(false);
        }
      } catch (err) {
        console.error("[Auth] Kiro import error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    try {
      console.log("[Auth] Using OAuth for:", providerInfo.id);
      const result = await window.electronAPI.api.startAuth(
        providerInfo.id as Parameters<
          typeof window.electronAPI.api.startAuth
        >[0],
      );

      console.log("[Auth] Result:", result);

      if (result?.success) {
        await loadAccounts({ force: true });
      } else {
        setAuthError(result?.error || "Authentication failed");
      }
    } catch (err) {
      console.error("[Auth] Error:", err);
      setAuthError(String(err));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSelectProvider = async (
    providerInfo: Omit<Provider, "accounts">,
  ) => {
    setShowAddModal(false);
    if (providerInfo.id === "custom") {
      setEditingCustomProvider(null);
      setShowCustomProviderForm(true);
      return;
    }
    if (
      providerInfo.authType === "apikey" ||
      providerInfo.authType === "import" ||
      providerInfo.authType === "oauth-project"
    ) {
      setAddAccountProvider(providerInfo);
    } else {
      await triggerAuth(providerInfo);
    }
  };

  const handleAddAccount = async (providerId: string) => {
    const providerInfo = allProviders.find((p) => p.id === providerId);
    if (providerInfo) {
      if (
        providerInfo.authType === "apikey" ||
        providerInfo.authType === "import" ||
        providerInfo.authType === "oauth-project"
      ) {
        setAddAccountProvider(providerInfo);
      } else {
        await triggerAuth(providerInfo);
      }
    }
  };

  const handleAccountAdded = async () => {
    if (!addAccountProvider) return;

    setAddAccountProvider(null);
    await loadAccounts({ force: true });
  };

  const handleRemoveAccount = async (providerId: string, accountId: string) => {
    const account = providerAccounts.find(
      (acc) => acc.provider === providerId && acc.id === accountId,
    );

    if (account?.filePath && window.electronAPI?.providers) {
      try {
        const result = await window.electronAPI.providers.removeAccount(
          account.filePath,
        );
        if (result?.success) {
          await loadAccounts({ force: true });
        } else {
          console.error("[Providers] Failed to remove account:", result?.error);
        }
      } catch (error) {
        console.error("[Providers] Error removing account:", error);
      }
    } else {
      removeAccountLocal(providerId, accountId);
    }
  };

  const accountsByProvider = new Map<string, Account[]>();

  (providerAccounts as TokenAccount[]).forEach((acc) => {
    const accounts = accountsByProvider.get(acc.provider) || [];
    const lastUsedDate = new Date(acc.lastUsed);
    const now = new Date();
    const diffMs = now.getTime() - lastUsedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let lastUsedText = t.quota.justNow;
    if (diffDays > 0) {
      lastUsedText = t.quota.daysAgo.replace("{days}", diffDays.toString());
    } else if (diffHours > 0) {
      lastUsedText = t.quota.hoursAgo.replace("{hours}", diffHours.toString());
    } else if (diffMins > 0) {
      lastUsedText = t.quota.minutesAgo.replace(
        "{minutes}",
        diffMins.toString(),
      );
    }

    accounts.push({
      id: acc.id,
      email: acc.email,
      status: acc.status,
      lastUsed: lastUsedText,
      filePath: acc.filePath,
    });
    accountsByProvider.set(acc.provider, accounts);
  });

  const loadedProviders: Provider[] = [];
  accountsByProvider.forEach((accounts, providerId) => {
    const providerMeta = allProviders.find((p) => p.id === providerId);
    if (providerMeta) {
      loadedProviders.push({
        ...providerMeta,
        accounts,
      });
    }
  });

  const providersWithAccounts = loadedProviders.filter(
    (p) => p.accounts.length > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {t.providers.title}
          </h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {t.providers.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="glass-btn p-2.5 active:scale-90 transition-all duration-300 group hover:bg-white/10"
            onClick={() => loadAccounts({ force: true })}
            disabled={isLoading}
            title={t.quota.refresh}
          >
            <svg
              className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            className="glass-btn glass-btn-teal flex items-center justify-center gap-2 group active:scale-95 transition-all duration-300 hover:brightness-110 shadow-lg hover:shadow-teal-500/20"
            onClick={() => setShowAddModal(true)}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <>
                <span className="animate-spin inline-block mr-2">◌</span>
                {t.providers.connecting}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                <span>{t.providers.addProvider}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {authError && (
        <div className="p-4 rounded-lg bg-[var(--accent-magenta)]/10 border border-[var(--accent-magenta)]/30">
          <p className="text-sm text-[var(--accent-magenta)]">{authError}</p>
          <button
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] mt-2"
            onClick={() => setAuthError(null)}
          >
            {t.providers.dismiss || "Dismiss"}
          </button>
        </div>
      )}

      {providersWithAccounts.length > 0 ? (
        <div className="space-y-4">
          {providersWithAccounts.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onAddAccount={handleAddAccount}
              onRemoveAccount={handleRemoveAccount}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center flex flex-col items-center">
          <div className="text-4xl mb-4 text-[var(--text-dim)]">◈</div>
          <p className="text-[var(--text-muted)]">{t.providers.noProviders}</p>
          <button
            className="glass-btn glass-btn-teal mt-6 flex items-center justify-center gap-2 group active:scale-95 transition-all px-6 py-2.5"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
            <span>{t.providers.addProvider}</span>
          </button>
        </div>
      )}

      {customProviders.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
            {t.providers.customManage}
          </h3>
          <div className="space-y-3">
            {customProviders.map((cp) => (
              <div
                key={cp.name}
                className="glass-card p-4 flex items-center justify-between group hover:border-[var(--accent-indigo)]/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-[var(--accent-indigo)]/10 text-[var(--accent-indigo)]">
                    <CustomIcon />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)]">
                      {cp.name}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                      {cp["base-url"]}
                    </p>
                    <p className="text-xs text-[var(--text-dim)]">
                      {cp["api-key-entries"].length} API keys
                      {cp.models &&
                        cp.models.length > 0 &&
                        ` • ${cp.models.length} models`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingCustomProvider(cp);
                      setShowCustomProviderForm(true);
                    }}
                    className="glass-btn p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title={t.providers.customEdit}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomProvider(cp.name)}
                    className="p-2 text-red-500/70 hover:text-red-500 hover:scale-110 transition-all"
                    title={t.providers.customDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddProviderModal
          onClose={() => setShowAddModal(false)}
          onSelectProvider={handleSelectProvider}
        />
      )}

      {addAccountProvider && (
        <AddAccountModal
          provider={addAccountProvider}
          onClose={() => setAddAccountProvider(null)}
          onAdd={handleAccountAdded}
        />
      )}

      {showCustomProviderForm && (
        <CustomProviderForm
          onClose={() => {
            setShowCustomProviderForm(false);
            setEditingCustomProvider(null);
          }}
          onSaved={() => {
            setShowCustomProviderForm(false);
            setEditingCustomProvider(null);
            loadCustomProviders();
          }}
          editProvider={editingCustomProvider || undefined}
        />
      )}

      {copilotAuthInfo && (
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
                onClick={() => {
                  setCopilotAuthInfo(null);
                  setCopilotCopied(false);
                  setCopilotAuthError(null);
                }}
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
                    {copilotAuthInfo.user_code}
                  </div>
                  <button
                    className="glass-btn text-xs py-2 px-4 font-bold bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 rounded-xl transition-all active:scale-95"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          copilotAuthInfo.user_code,
                        );
                        setCopilotCopied(true);
                        setTimeout(() => setCopilotCopied(false), 2000);
                      } catch (error) {
                        console.error(
                          "[Providers] Failed to copy code:",
                          error,
                        );
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
                      copilotAuthInfo.url || copilotAuthInfo.verification_uri,
                    )
                  }
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                  {t.providers.copilotDeviceOpen}
                </button>
              </div>

              {copilotAuthError && (
                <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-100 text-xs font-bold animate-shake">
                  {copilotAuthError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
