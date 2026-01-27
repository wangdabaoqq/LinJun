import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "../../stores/settings";
import Claude from "@lobehub/icons/es/Claude";
import OpenAI from "@lobehub/icons/es/OpenAI";
import Gemini from "@lobehub/icons/es/Gemini";
import GithubCopilot from "@lobehub/icons/es/GithubCopilot";
import Qwen from "@lobehub/icons/es/Qwen";
import VertexAI from "@lobehub/icons/es/VertexAI";

import {
  AntigravityIcon,
  IFlowIcon,
  KiroIcon,
  CustomIcon,
} from "../icons/ProviderIcons";

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
  badge?: string;
  accounts: Account[];
}

interface AddAccountModalProps {
  provider: Omit<Provider, "accounts">;
  onClose: () => void;
  onAdd: (account: Omit<Account, "id" | "status" | "lastUsed">) => void;
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
    badge: "Plus",
  },
  {
    id: "kiro",
    name: "Kiro",
    icon: <KiroIcon />,
    color: "indigo",
    description: "Claude Sonnet 4, Amazon Nova",
    authType: "import",
  },
  {
    id: "vertex",
    name: "Vertex AI",
    icon: <VertexAI.Color size={24} />,
    color: "teal",
    description: "Gemini, Claude, Llama via Google Cloud",
    authType: "oauth",
    badge: "Plus",
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
  const isImportProvider = provider.authType === "import";

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
      <div
        className={`relative glass-card glass-card-${provider.color} p-6 w-full max-w-[420px] animate-scale-in`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[var(--accent-${provider.color})]/10 text-[var(--accent-${provider.color})]`}
            >
              {provider.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {t.providers.addAccountTo}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {provider.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-soft hover:bg-muted text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
            aria-label={t.providers.dismiss}
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
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
            <div className="glass-card p-4 bg-soft">
              <p className="text-sm text-[var(--text-muted)] mb-3">
                {t.providers.oauthDescription}
              </p>
              <button
                onClick={handleOAuthConnect}
                disabled={isLoading}
                className={`glass-btn glass-btn-${provider.color} w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">◌</span>
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
              <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                {t.providers.projectIdLabel} ({t.providers.optional})
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder={t.providers.projectIdPlaceholder}
                className="glass-input w-full"
              />
              <p className="text-xs text-[var(--text-dim)] mt-1.5">
                {t.providers.projectIdDescription}
              </p>
            </div>
            <div className="glass-card p-4 bg-soft">
              <p className="text-sm text-[var(--text-muted)] mb-3">
                {t.providers.oauthDescription}
              </p>
              <button
                onClick={handleOAuthProjectConnect}
                disabled={isLoading}
                className={`glass-btn glass-btn-${provider.color} w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">◌</span>
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
            <div className="glass-card p-4 bg-soft">
              <p className="text-sm text-[var(--text-muted)] mb-3">
                {t.providers.importDescription}
              </p>
              <button
                onClick={handleImport}
                disabled={isLoading}
                className={`glass-btn glass-btn-${provider.color} w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">◌</span>
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
          <div className="space-y-4">
            {isCustomProvider && (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
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
              <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
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
            <button
              onClick={handleApiKeySubmit}
              disabled={
                isLoading ||
                !apiKey.trim() ||
                (isCustomProvider && !endpoint.trim())
              }
              className={`glass-btn glass-btn-${provider.color} w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">◌</span>
                  {t.providers.validating}
                </>
              ) : (
                <>
                  <span>+</span>
                  {t.providers.addAccount}
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--accent-magenta)]/10 border border-[var(--accent-magenta)]/30">
            <p className="text-sm text-[var(--accent-magenta)]">{error}</p>
          </div>
        )}

        <p className="text-xs text-[var(--text-dim)] mt-4 text-center">
          {provider.badge && (
            <span className="text-[var(--accent-magenta)]">
              {t.providers.plusRequired}
            </span>
          )}
        </p>
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
        onClick={onClose}
      />
      <div className="relative glass-card p-6 w-full max-w-[600px] max-h-[80vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {t.providers.addProvider}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-soft hover:bg-muted text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {allProviders.map((provider) => {
            return (
              <div
                key={provider.id}
                className={`group glass-card glass-card-hover p-4 cursor-pointer glass-card-${provider.color} transition-all duration-200 hover:scale-[1.02]`}
                onClick={() => onSelectProvider(provider)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-[var(--accent-${provider.color})]/10 text-[var(--accent-${provider.color})] group-hover:scale-110 transition-transform`}
                  >
                    {provider.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                        {provider.name}
                      </h3>
                      {provider.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[var(--accent-magenta)]/15 text-[var(--accent-magenta)] border border-[var(--accent-magenta)]/20 font-medium">
                          {provider.badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                          provider.authType === "oauth" ||
                          provider.authType === "oauth-project"
                            ? "bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]"
                            : provider.authType === "import"
                              ? "bg-[var(--accent-secondary)]/12 text-[var(--accent-secondary)]"
                              : "bg-[var(--accent-tertiary)]/12 text-[var(--accent-tertiary)]"
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
            /^(claude|gemini|codex|antigravity|qwen|iflow|github-copilot|kiro|vertex)-/i,
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
                  {provider.name}
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full bg-[var(--accent-${provider.color})]/20 text-[var(--accent-${provider.color})] border border-[var(--accent-${provider.color})]/30`}
                >
                  {provider.accounts.length}
                </span>
                {provider.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--accent-magenta)]/20 text-[var(--accent-magenta)] border border-[var(--accent-magenta)]/30">
                    {provider.badge}
                  </span>
                )}
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

                <div className="flex items-center gap-4">
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
              className="glass-btn glass-btn-teal text-xs py-1.5 w-full transition-all duration-300 hover:brightness-110 active:scale-[0.98] shadow-sm hover:shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onAddAccount(provider.id);
              }}
            >
              + {t.providers.addAccount}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Providers() {
  const t = useTranslations();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAccountProvider, setAddAccountProvider] = useState<Omit<
    Provider,
    "accounts"
  > | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  interface TokenAccount {
    id: string;
    provider: string;
    email: string;
    status: "online" | "offline";
    lastUsed: string;
    filePath: string;
  }

  const loadAccounts = useCallback(async () => {
    if (!window.electronAPI?.providers) return;

    try {
      const result = await window.electronAPI.providers.getAccounts();
      if (result?.success) {
        const accountsByProvider = new Map<string, Account[]>();

        (result.accounts as TokenAccount[]).forEach((acc) => {
          const accounts = accountsByProvider.get(acc.provider) || [];
          const lastUsedDate = new Date(acc.lastUsed);
          const now = new Date();
          const diffMs = now.getTime() - lastUsedDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          let lastUsedText = t.quota.justNow;
          if (diffDays > 0) {
            lastUsedText = t.quota.daysAgo.replace(
              "{days}",
              diffDays.toString(),
            );
          } else if (diffHours > 0) {
            lastUsedText = t.quota.hoursAgo.replace(
              "{hours}",
              diffHours.toString(),
            );
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

        setProviders(loadedProviders);
      }
    } catch (error) {
      console.error("[Providers] Failed to load accounts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

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
            loadAccounts();
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
            loadAccounts();
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

    if (providerInfo.id === "claude") {
      console.log("[Auth] Using Claude API OAuth");
      try {
        const result = await window.electronAPI.claude?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts();
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
            loadAccounts();
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

    const cliProviderMap: Record<string, string> = {
      codex: "codex",
      iflow: "iflow",
      copilot: "github-copilot",
      kiro: "kiro",
      vertex: "vertex",
    };

    const cliArg = cliProviderMap[providerInfo.id];

    if (cliArg) {
      console.log("[Auth] Using CLI login:", cliArg);
      window.electronAPI.api.cliLogin(cliArg).then((result) => {
        console.log("[Auth] CLI login completed:", result);
        if (result?.success) {
          loadAccounts();
        } else if (result?.error) {
          setAuthError(result.error);
        }
        setIsAuthenticating(false);
      });

      setTimeout(() => {
        setIsAuthenticating(false);
      }, 1500);
    } else {
      try {
        console.log("[Auth] Using OAuth for:", providerInfo.id);
        const result = await window.electronAPI.api.startAuth(
          providerInfo.id as Parameters<
            typeof window.electronAPI.api.startAuth
          >[0],
        );

        console.log("[Auth] Result:", result);

        if (result?.success) {
          await loadAccounts();
        } else {
          setAuthError(result?.error || "Authentication failed");
        }
      } catch (err) {
        console.error("[Auth] Error:", err);
        setAuthError(String(err));
      } finally {
        setIsAuthenticating(false);
      }
    }
  };

  const handleSelectProvider = async (
    providerInfo: Omit<Provider, "accounts">,
  ) => {
    setShowAddModal(false);
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

  const handleAccountAdded = async (
    accountData: Omit<
      Account,
      "id" | "status" | "lastUsed" | "quotaUsed" | "quotaLimit"
    >,
  ) => {
    if (!addAccountProvider) return;

    setAddAccountProvider(null);
    await loadAccounts();
  };

  const handleRemoveAccount = async (providerId: string, accountId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    const account = provider?.accounts.find((a) => a.id === accountId);

    if (account?.filePath && window.electronAPI?.providers) {
      try {
        const result = await window.electronAPI.providers.removeAccount(
          account.filePath,
        );
        if (result?.success) {
          await loadAccounts();
        } else {
          console.error("[Providers] Failed to remove account:", result?.error);
        }
      } catch (error) {
        console.error("[Providers] Error removing account:", error);
      }
    } else {
      setProviders((prev) =>
        prev
          .map((p) =>
            p.id === providerId
              ? { ...p, accounts: p.accounts.filter((a) => a.id !== accountId) }
              : p,
          )
          .filter((p) => p.accounts.length > 0),
      );
    }
  };

  const providersWithAccounts = providers.filter((p) => p.accounts.length > 0);

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
            className="glass-btn p-2.5"
            onClick={() => loadAccounts()}
            disabled={isLoading}
            title={t.quota.refresh}
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
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
            className="glass-btn glass-btn-teal"
            onClick={() => setShowAddModal(true)}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <>
                <span className="animate-spin inline-block mr-2">◌</span>
                {t.providers.connecting}
              </>
            ) : (
              `+ ${t.providers.addProvider}`
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
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4 text-[var(--text-dim)]">◈</div>
          <p className="text-[var(--text-muted)]">{t.providers.noProviders}</p>
          <button
            className="glass-btn glass-btn-teal mt-4"
            onClick={() => setShowAddModal(true)}
          >
            + {t.providers.addProvider}
          </button>
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
    </div>
  );
}
