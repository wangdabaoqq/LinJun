import { useState, useEffect, useCallback, useMemo } from "react";
import log from "@renderer/utils/logger";
import {
  Trash2,
  Edit2,
  Plus,
  RotateCw,
  Loader2,
  Settings,
  Users,
  ShieldCheck,
  ChevronDown,
  Upload,
  Check,
  Copy,
} from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { useProvidersStore, TokenAccount } from "../../stores/providers";
import { CustomProviderForm } from "./CustomProviderForm/index";
import { CustomProviderImportModal } from "./CustomProviderImportModal";
import { ConfirmModal } from "../ui/ConfirmModal";
import { getCustomProviderIcon } from "../icons/ProviderIcons";

import {
  Provider,
  OpenAICompatProvider,
  Account,
  CustomProviderType,
  CustomProviderDisplay,
  ClaudeCompatProvider,
  GeminiCompatProvider,
  CodexCompatProvider,
  AmpcodeCompatProvider,
} from "./types";
import { allProviders } from "./providerDefinitions";
import { useProviderAuth } from "./hooks/useProviderAuth";
import { AddAccountModal } from "./AddAccountModal";
import { AddProviderModal } from "./AddProviderModal";
import { ProviderCard } from "./ProviderCard";
import { CopilotAuthModal } from "./CopilotAuthModal";
import { AmpcodeSettingsModal } from "./AmpcodeSettingsModal";

export function Providers() {
  const t = useTranslations();
  const providerAccounts = useProvidersStore((state) => state.accounts);
  const isLoading = useProvidersStore((state) => state.isLoading);
  const loadAccounts = useProvidersStore((state) => state.loadAccounts);
  const removeAccountLocal = useProvidersStore(
    (state) => state.removeAccountLocal,
  );

  const {
    isAuthenticating,
    authError,
    setAuthError,
    copilotAuthInfo,
    setCopilotAuthInfo,
    copilotAuthError,
    setCopilotAuthError,
    triggerAuth,
  } = useProviderAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [addAccountProvider, setAddAccountProvider] = useState<Omit<
    Provider,
    "accounts"
  > | null>(null);
  const [customProviders, setCustomProviders] = useState<
    CustomProviderDisplay[]
  >([]);
  const [showCustomProviderForm, setShowCustomProviderForm] = useState(false);
  const [editingCustomProvider, setEditingCustomProvider] =
    useState<CustomProviderDisplay | null>(null);
  const [deleteConfirmProvider, setDeleteConfirmProvider] =
    useState<CustomProviderDisplay | null>(null);
  const [removeConfirmAccount, setRemoveConfirmAccount] = useState<{
    providerId: string;
    accountId: string;
  } | null>(null);

  const [officialExpanded, setOfficialExpanded] = useState(false);
  const [routingExpanded, setRoutingExpanded] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAmpcodeSettings, setShowAmpcodeSettings] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null);
  const [pendingAccountToggles, setPendingAccountToggles] = useState<
    Record<string, boolean>
  >({});
  const [pendingCustomToggles, setPendingCustomToggles] = useState<
    Record<string, boolean>
  >({});
  const [isDeletingCustomProvider, setIsDeletingCustomProvider] =
    useState(false);
  const [isRemovingAccount, setIsRemovingAccount] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [openaiProviders, setOpenaiProviders] = useState<
    OpenAICompatProvider[]
  >([]);
  const [claudeProviders, setClaudeProviders] = useState<
    ClaudeCompatProvider[]
  >([]);
  const [geminiProviders, setGeminiProviders] = useState<
    GeminiCompatProvider[]
  >([]);
  const [codexProviders, setCodexProviders] = useState<CodexCompatProvider[]>(
    [],
  );
  const [ampcodeProvider, setAmpcodeProvider] =
    useState<AmpcodeCompatProvider | null>(null);

  const loadCustomProviders = useCallback(async () => {
    try {
      const allCustomProviders: CustomProviderDisplay[] = [];

      const customResult = await window.electronAPI?.customProviders?.getAll();
      if (customResult?.success) {
        const active = customResult.active || {};
        const drafts = customResult.drafts || {};

        const activeOpenai =
          (active["openai-compatibility"] as OpenAICompatProvider[]) || [];
        const activeClaude =
          (active["claude-api-key"] as ClaudeCompatProvider[]) || [];
        const activeGemini =
          (active["gemini-api-key"] as GeminiCompatProvider[]) || [];
        const activeCodex =
          (active["codex-api-key"] as CodexCompatProvider[]) || [];

        const draftOpenai =
          (drafts["openai-compatibility"] as OpenAICompatProvider[]) || [];
        const draftClaude =
          (drafts["claude-api-key"] as ClaudeCompatProvider[]) || [];
        const draftGemini =
          (drafts["gemini-api-key"] as GeminiCompatProvider[]) || [];
        const draftCodex =
          (drafts["codex-api-key"] as CodexCompatProvider[]) || [];

        setOpenaiProviders(activeOpenai);
        setClaudeProviders(activeClaude);
        setGeminiProviders(activeGemini);
        setCodexProviders(activeCodex);

        activeOpenai.forEach((provider, idx) => {
          allCustomProviders.push({
            id: `active-openai-${idx}-${provider.name}`,
            type: "openai",
            name: provider.name,
            baseUrl: provider["base-url"],
            keysCount: provider["api-key-entries"]?.length || 0,
            modelsCount: provider.models?.length || 0,
            enabled: true,
            rawData: provider,
          });
        });

        draftOpenai.forEach((provider, idx) => {
          allCustomProviders.push({
            id: `draft-openai-${idx}-${provider.name}`,
            type: "openai",
            name: provider.name,
            baseUrl: provider["base-url"],
            keysCount: provider["api-key-entries"]?.length || 0,
            modelsCount: provider.models?.length || 0,
            enabled: false,
            rawData: provider,
          });
        });

        activeClaude.forEach((entry, idx) => {
          allCustomProviders.push({
            id: `active-claude-${idx}`,
            type: "claude",
            name: entry.name || `Claude #${idx + 1}`,
            baseUrl: entry["base-url"] || "https://api.anthropic.com",
            keysCount: 1,
            modelsCount: entry.models?.length || 0,
            enabled: true,
            rawData: entry,
          });
        });

        draftClaude.forEach((entry, idx) => {
          allCustomProviders.push({
            id: `draft-claude-${idx}`,
            type: "claude",
            name: entry.name || `Claude Draft #${idx + 1}`,
            baseUrl: entry["base-url"] || "https://api.anthropic.com",
            keysCount: 1,
            modelsCount: entry.models?.length || 0,
            enabled: false,
            rawData: entry,
          });
        });

        activeGemini.forEach((entry, idx) => {
          allCustomProviders.push({
            id: `active-gemini-${idx}`,
            type: "gemini",
            name: entry.name || `Gemini #${idx + 1}`,
            baseUrl:
              entry["base-url"] || "https://generativelanguage.googleapis.com",
            keysCount: 1,
            modelsCount: entry.models?.length || 0,
            enabled: true,
            rawData: entry,
          });
        });

        draftGemini.forEach((entry, idx) => {
          allCustomProviders.push({
            id: `draft-gemini-${idx}`,
            type: "gemini",
            name: entry.name || `Gemini Draft #${idx + 1}`,
            baseUrl:
              entry["base-url"] || "https://generativelanguage.googleapis.com",
            keysCount: 1,
            modelsCount: entry.models?.length || 0,
            enabled: false,
            rawData: entry,
          });
        });

        activeCodex.forEach((entry, idx) => {
          allCustomProviders.push({
            id: `active-codex-${idx}`,
            type: "codex",
            name: entry.name || `Codex #${idx + 1}`,
            baseUrl: entry["base-url"] || "https://api.openai.com/v1",
            keysCount: 1,
            modelsCount: entry.models?.length || 0,
            enabled: true,
            rawData: entry,
          });
        });

        draftCodex.forEach((entry, idx) => {
          allCustomProviders.push({
            id: `draft-codex-${idx}`,
            type: "codex",
            name: entry.name || `Codex Draft #${idx + 1}`,
            baseUrl: entry["base-url"] || "https://api.openai.com/v1",
            keysCount: 1,
            modelsCount: entry.models?.length || 0,
            enabled: false,
            rawData: entry,
          });
        });
      } else {
        setOpenaiProviders([]);
        setClaudeProviders([]);
        setGeminiProviders([]);
        setCodexProviders([]);
      }

      const ampcodeResult = await window.electronAPI?.ampcodeCompat?.getAll();
      if (ampcodeResult?.success && ampcodeResult.provider) {
        setAmpcodeProvider(ampcodeResult.provider);
      } else {
        setAmpcodeProvider(null);
      }

      setCustomProviders(allCustomProviders);
    } catch (err) {
      log.error("[Providers] Failed to load custom providers:", err);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    loadCustomProviders();
  }, [loadAccounts, loadCustomProviders]);

  const stats = useMemo(() => {
    const totalProviders = new Set(providerAccounts.map((a) => a.provider))
      .size;
    const totalAccounts = providerAccounts.length;
    const activeAccounts = providerAccounts.filter(
      (a) => a.status === "online",
    ).length;
    const customCount = customProviders.length;

    return { totalProviders, totalAccounts, activeAccounts, customCount };
  }, [providerAccounts, customProviders]);

  const ampcodeMappedKeyCount = useMemo(() => {
    const mappings = ampcodeProvider?.["upstream-api-keys"] || [];
    return mappings.reduce((count, mapping) => {
      return count + (mapping["api-keys"]?.length || 0);
    }, 0);
  }, [ampcodeProvider]);

  const handleDeleteCustomProvider = async (
    provider: CustomProviderDisplay,
  ) => {
    if (isDeletingCustomProvider) {
      return;
    }

    setIsDeletingCustomProvider(true);
    try {
      let success = false;
      if (!provider.enabled) {
        const result = await window.electronAPI?.customProviders?.removeDraft({
          type: provider.type,
          rawData: provider.rawData,
        });
        success = result?.success || false;
      } else if (provider.type === "openai") {
        const result = await window.electronAPI?.openaiCompat?.delete(
          provider.name,
        );
        success = result?.success || false;
      } else if (provider.type === "claude") {
        const current = await window.electronAPI?.claudeCompat?.getAll();
        if (current?.success && current.entries) {
          const target = provider.rawData as ClaudeCompatProvider;
          const targetName = target.name || "";
          const targetKey = target["api-key"] || "";
          const targetBaseUrl = target["base-url"] || "";
          const filtered = current.entries.filter(
            (entry: ClaudeCompatProvider) => {
              if (targetName && entry.name) {
                return entry.name !== targetName;
              }
              if (targetKey) {
                const entryBaseUrl = entry["base-url"] || "";
                if (targetBaseUrl) {
                  return !(
                    entry["api-key"] === targetKey &&
                    entryBaseUrl === targetBaseUrl
                  );
                }
                return entry["api-key"] !== targetKey;
              }
              return entry.name !== provider.name;
            },
          );
          const result = await window.electronAPI?.claudeCompat?.save(filtered);
          success = result?.success || false;
        }
      } else if (provider.type === "gemini") {
        const current = await window.electronAPI?.geminiCompat?.getAll();
        if (current?.success && current.entries) {
          const target = provider.rawData as GeminiCompatProvider;
          const targetName = target.name || "";
          const targetKey = target["api-key"] || "";
          const targetBaseUrl = target["base-url"] || "";
          const filtered = current.entries.filter(
            (entry: GeminiCompatProvider) => {
              if (targetName && entry.name) {
                return entry.name !== targetName;
              }
              if (targetKey) {
                const entryBaseUrl = entry["base-url"] || "";
                if (targetBaseUrl) {
                  return !(
                    entry["api-key"] === targetKey &&
                    entryBaseUrl === targetBaseUrl
                  );
                }
                return entry["api-key"] !== targetKey;
              }
              return entry.name !== provider.name;
            },
          );
          const result = await window.electronAPI?.geminiCompat?.save(filtered);
          success = result?.success || false;
        }
      } else if (provider.type === "codex") {
        const current = await window.electronAPI?.codexCompat?.getAll();
        if (current?.success && current.entries) {
          const target = provider.rawData as CodexCompatProvider;
          const targetName = target.name || "";
          const targetKey = target["api-key"] || "";
          const targetBaseUrl = target["base-url"] || "";
          const filtered = current.entries.filter(
            (entry: CodexCompatProvider) => {
              if (targetName && entry.name) {
                return entry.name !== targetName;
              }
              if (targetKey) {
                const entryBaseUrl = entry["base-url"] || "";
                if (targetBaseUrl) {
                  return !(
                    entry["api-key"] === targetKey &&
                    entryBaseUrl === targetBaseUrl
                  );
                }
                return entry["api-key"] !== targetKey;
              }
              return entry.name !== provider.name;
            },
          );
          const result = await window.electronAPI?.codexCompat?.save(filtered);
          success = result?.success || false;
        }
      }
      if (success) {
        setDeleteConfirmProvider(null);
        loadCustomProviders();
      }
    } catch (err) {
      log.error("[Providers] Failed to delete custom provider:", err);
    } finally {
      setIsDeletingCustomProvider(false);
    }
  };

  const buildCopyName = (baseName: string, existingNames: string[]) => {
    const trimmedNames = new Set(
      existingNames.map((name) => name.trim()).filter(Boolean),
    );
    const copyBase = `${baseName} Copy`;
    if (!trimmedNames.has(copyBase)) return copyBase;

    let index = 2;
    let candidate = `${copyBase} ${index}`;
    while (trimmedNames.has(candidate)) {
      index += 1;
      candidate = `${copyBase} ${index}`;
    }
    return candidate;
  };

  const handleCopyCustomProvider = async (cp: CustomProviderDisplay) => {
    try {
      const existingNames = customProviders
        .filter((provider) => provider.type === cp.type)
        .map((provider) => provider.name);
      const newName = buildCopyName(cp.name, existingNames);
      const copiedKey = cp.id;

      if (cp.type === "openai") {
        const providerData = {
          ...(cp.rawData as OpenAICompatProvider),
          name: newName,
        };
        const result =
          await window.electronAPI?.openaiCompat?.add(providerData);
        if (!result?.success) {
          log.error(
            "[Providers] Failed to copy OpenAI provider:",
            result?.error,
          );
          return;
        }
      } else if (cp.type === "claude") {
        const current = await window.electronAPI?.claudeCompat?.getAll();
        if (!current?.success || !current.entries) {
          log.error("[Providers] Failed to load Claude providers");
          return;
        }
        const newEntry: ClaudeCompatProvider = {
          ...(cp.rawData as ClaudeCompatProvider),
          name: newName,
        };
        const result = await window.electronAPI?.claudeCompat?.save([
          ...current.entries,
          newEntry,
        ]);
        if (!result?.success) {
          log.error(
            "[Providers] Failed to copy Claude provider:",
            result?.error,
          );
          return;
        }
      } else if (cp.type === "gemini") {
        const current = await window.electronAPI?.geminiCompat?.getAll();
        if (!current?.success || !current.entries) {
          log.error("[Providers] Failed to load Gemini providers");
          return;
        }
        const newEntry: GeminiCompatProvider = {
          ...(cp.rawData as GeminiCompatProvider),
          name: newName,
        };
        const result = await window.electronAPI?.geminiCompat?.save([
          ...current.entries,
          newEntry,
        ]);
        if (!result?.success) {
          log.error(
            "[Providers] Failed to copy Gemini provider:",
            result?.error,
          );
          return;
        }
      } else if (cp.type === "codex") {
        const current = await window.electronAPI?.codexCompat?.getAll();
        if (!current?.success || !current.entries) {
          log.error("[Providers] Failed to load Codex providers");
          return;
        }
        const newEntry: CodexCompatProvider = {
          ...(cp.rawData as CodexCompatProvider),
          name: newName,
        };
        const result = await window.electronAPI?.codexCompat?.save([
          ...current.entries,
          newEntry,
        ]);
        if (!result?.success) {
          log.error(
            "[Providers] Failed to copy Codex provider:",
            result?.error,
          );
          return;
        }
      }

      setCopiedProvider(copiedKey);
      setTimeout(() => setCopiedProvider(null), 2000);
      loadCustomProviders();
    } catch (error) {
      log.error("[Providers] Failed to copy provider config:", error);
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
    if (providerInfo.id === "ampcode") {
      setShowAmpcodeSettings(true);
      return;
    }
    if (
      providerInfo.authType === "apikey" ||
      providerInfo.authType === "import" ||
      providerInfo.authType === "oauth-project" ||
      providerInfo.id === "antigravity" ||
      providerInfo.id === "codex" ||
      providerInfo.id === "claude" ||
      providerInfo.id === "gemini" ||
      providerInfo.id === "qwen" ||
      providerInfo.id === "iflow" ||
      providerInfo.id === "kiro"
    ) {
      setAddAccountProvider(providerInfo);
    } else {
      await triggerAuth(providerInfo);
    }
  };

  const handleImportClick = () => {
    setImportStatus(null);
    setShowImportModal(true);
  };

  const handleImportConfirm = async (
    data: {
      "openai-compatibility"?: OpenAICompatProvider[];
      "claude-api-key"?: ClaudeCompatProvider[];
      "gemini-api-key"?: GeminiCompatProvider[];
      "codex-api-key"?: CodexCompatProvider[];
    },
    strategy: "overwrite" | "skip",
  ) => {
    setIsImporting(true);
    setImportStatus(null);
    try {
      const result = await window.electronAPI?.customProviders?.import(
        data,
        strategy,
      );

      if (result?.success) {
        const summary = result.summary || { added: 0, updated: 0, skipped: 0 };
        const summaryText = t.providers.customImportSummary
          .replace("{added}", summary.added.toString())
          .replace("{updated}", summary.updated.toString())
          .replace("{skipped}", summary.skipped.toString());
        setImportStatus({
          type: "success",
          message: `${t.providers.customImportSuccess} ${summaryText}`,
        });
        setShowImportModal(false);
        loadCustomProviders();
      } else {
        setImportStatus({
          type: "error",
          message: result?.error || t.providers.customImportFailed,
        });
      }
    } catch (err) {
      setImportStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : t.providers.customImportFailed,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAccountAdded = async () => {
    if (!addAccountProvider) return;

    setAddAccountProvider(null);
    await loadAccounts({ force: true });
  };

  const handleRemoveAccount = (providerId: string, accountId: string) => {
    setRemoveConfirmAccount({ providerId, accountId });
  };

  const performRemoveAccount = async (
    providerId: string,
    accountId: string,
  ) => {
    if (isRemovingAccount) {
      return;
    }

    setIsRemovingAccount(true);
    const account = providerAccounts.find(
      (acc) => acc.provider === providerId && acc.id === accountId,
    );

    try {
      if (account?.filePath && window.electronAPI?.providers) {
        const result = await window.electronAPI.providers.removeAccount(
          account.filePath,
        );
        if (result?.success) {
          await loadAccounts({ force: true });
          setRemoveConfirmAccount(null);
        } else {
          log.error("[Providers] Failed to remove account:", result?.error);
        }
      } else {
        removeAccountLocal(providerId, accountId);
        setRemoveConfirmAccount(null);
      }
    } catch (error) {
      log.error("[Providers] Error removing account:", error);
    } finally {
      setIsRemovingAccount(false);
    }
  };

  const handleToggleAccountEnabled = async (
    providerId: string,
    accountId: string,
    enabled: boolean,
  ) => {
    const account = providerAccounts.find(
      (acc) => acc.provider === providerId && acc.id === accountId,
    );

    if (!account?.filePath) {
      return;
    }

    const pendingKey = `${providerId}:${accountId}`;
    setPendingAccountToggles((prev) => ({ ...prev, [pendingKey]: true }));

    try {
      const result = await window.electronAPI?.providers?.setAccountEnabled(
        account.filePath,
        enabled,
      );
      if (result?.success) {
        await loadAccounts({ force: true });
      } else {
        log.error("[Providers] Failed to toggle account state:", result?.error);
      }
    } catch (error) {
      log.error("[Providers] Failed to toggle account state:", error);
    } finally {
      setPendingAccountToggles((prev) => {
        const next = { ...prev };
        delete next[pendingKey];
        return next;
      });
    }
  };

  const handleToggleCustomProviderEnabled = async (
    provider: CustomProviderDisplay,
    enabled: boolean,
  ) => {
    setPendingCustomToggles((prev) => ({ ...prev, [provider.id]: true }));

    try {
      const result = await window.electronAPI?.customProviders?.setEnabled(
        {
          type: provider.type,
          rawData: provider.rawData,
        },
        enabled,
      );

      if (result?.success) {
        await loadCustomProviders();
      } else {
        log.error(
          "[Providers] Failed to toggle custom provider state:",
          result?.error,
        );
      }
    } catch (error) {
      log.error("[Providers] Failed to toggle custom provider state:", error);
    } finally {
      setPendingCustomToggles((prev) => {
        const next = { ...prev };
        delete next[provider.id];
        return next;
      });
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
      enabled: acc.enabled,
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
    <div className="flex flex-col h-full bg-transparent overflow-hidden p-6">
      <div className="shrink-0 mb-8">
        <div className="flex items-center justify-between mb-10">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {t.providers.title}
            </h2>
            <p className="text-[var(--text-muted)] text-sm font-medium">
              {t.providers.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="p-2.5 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors group glass-card border-none bg-transparent hover:bg-[var(--text-primary)]/5"
              onClick={() => loadAccounts({ force: true })}
              disabled={isLoading}
            >
              <RotateCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
              />
            </button>
            <button
              className="glass-btn glass-btn-primary h-11 px-6 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-[1.02]"
              onClick={() => setShowAddModal(true)}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 stroke-[2.5px]" />
              )}
              <span>
                {isAuthenticating
                  ? t.providers.connecting
                  : t.providers.addProvider}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
          {[
            {
              label: t.providers.officialAccounts,
              value: stats.totalProviders,
              icon: ShieldCheck,
              color: "text-[var(--accent-primary)]",
            },
            {
              label: t.providers.connected,
              value: stats.totalAccounts,
              icon: Users,
              color: "text-neon-teal",
            },
            {
              label: t.status.online,
              value: stats.activeAccounts,
              icon: RotateCw,
              color: "text-neon-green",
            },
            {
              label: t.providers.customProvider,
              value: stats.customCount,
              icon: Settings,
              color: "text-neon-purple",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="glass-card flex flex-col gap-3 p-4 border-none bg-[var(--text-primary)]/[0.02] hover:bg-[var(--text-primary)]/[0.04] transition-all hover:shadow-soft-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  {stat.label}
                </span>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color} opacity-80`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  {stat.value.toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 -mr-2">
        <div className="space-y-12 pb-12">
          {importStatus && (
            <div
              className={`p-4 rounded-xl border text-sm font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
                importStatus.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              }`}
            >
              <span>{importStatus.message}</span>
              <button
                onClick={() => setImportStatus(null)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          )}
          {authError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span>{authError}</span>
              <button
                onClick={() => setAuthError(null)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          )}

          <section>
            <div
              className="flex items-center gap-4 mb-6 cursor-pointer group/section"
              onClick={() => setOfficialExpanded(!officialExpanded)}
            >
              <h3 className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-30 group-hover/section:opacity-60 transition-opacity">
                {t.providers.officialAccounts}
              </h3>
              <div className="h-px flex-1 bg-[var(--text-primary)]/5" />
              <div
                className={`p-1 rounded-lg hover:bg-[var(--text-primary)]/5 transition-all text-[var(--text-dim)] ${officialExpanded ? "rotate-180" : ""}`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {providersWithAccounts.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  isExpanded={officialExpanded}
                  onRemoveAccount={handleRemoveAccount}
                  onToggleAccountEnabled={handleToggleAccountEnabled}
                  pendingToggleAccountIds={pendingAccountToggles}
                />
              ))}
            </div>
          </section>

          <section>
            <div
              className="flex items-center gap-4 mb-6 cursor-pointer group/section"
              onClick={() => setRoutingExpanded(!routingExpanded)}
            >
              <h3 className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-30 group-hover/section:opacity-60 transition-opacity">
                {t.providers.routingProtocol}
              </h3>
              <div className="h-px flex-1 bg-[var(--text-primary)]/5" />
              <div
                className={`p-1 rounded-lg hover:bg-[var(--text-primary)]/5 transition-all text-[var(--text-dim)] ${routingExpanded ? "rotate-180" : ""}`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="group/card relative flex flex-col p-6 rounded-3xl glass-card transition-all duration-300 border border-[rgba(255,255,255,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {getCustomProviderIcon("ampcode")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-[var(--text-primary)] leading-tight">
                          {t.providers.ampcodeSettingsTitle}
                        </h4>
                        <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded bg-[var(--text-primary)]/5 text-[var(--text-dim)]">
                          {t.providers.protocol}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[var(--text-dim)] mt-1 tracking-tighter opacity-70">
                        {ampcodeProvider?.["upstream-url"] ||
                          "https://ampcode.com"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        ampcodeProvider
                          ? "text-emerald-500"
                          : "text-[var(--text-dim)]"
                      }`}
                    >
                      {ampcodeProvider
                        ? t.providers.ampcodeConfigured
                        : t.providers.ampcodeNotConfigured}
                    </span>
                    <button
                      onClick={() => setShowAmpcodeSettings(true)}
                      className="px-4 py-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] rounded-full text-xs text-[var(--text-primary)] font-bold tracking-wider transition-all duration-200"
                    >
                      {t.providers.ampcodeConfigure}
                    </button>
                  </div>
                </div>

                {routingExpanded && (
                  <div className="flex items-center gap-6 mt-6 pt-5 border-t border-[var(--text-primary)]/5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                        Keys
                      </p>
                      <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                        {ampcodeMappedKeyCount +
                          (ampcodeProvider?.["upstream-api-key"] ? 1 : 0)}
                      </p>
                    </div>
                    <div className="w-px h-6 bg-[var(--text-primary)]/5" />
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                        Models
                      </p>
                      <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                        {ampcodeProvider?.["model-mappings"]?.length || 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <div
              className="flex items-center gap-4 mb-6 cursor-pointer group/section"
              onClick={() => setCustomExpanded(!customExpanded)}
            >
              <h3 className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-30 group-hover/section:opacity-60 transition-opacity">
                {t.providers.customManage}
              </h3>
              <div className="h-px flex-1 bg-[var(--text-primary)]/5" />
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  handleImportClick();
                }}
                disabled={isImporting}
                className="glass-btn h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"
              >
                {isImporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3 stroke-[2.5px]" />
                )}
                {isImporting
                  ? t.providers.customImporting
                  : t.providers.customImport}
              </button>
              <div
                className={`p-1 rounded-lg hover:bg-[var(--text-primary)]/5 transition-all text-[var(--text-dim)] ${customExpanded ? "rotate-180" : ""}`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
            {customProviders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {customProviders.map((cp) => (
                  <div
                    key={cp.id}
                    className="group/card relative flex flex-col p-6 rounded-3xl glass-card transition-all duration-300 border border-[rgba(255,255,255,0.04)]"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">
                          {getCustomProviderIcon(cp.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-[var(--text-primary)] leading-tight">
                              {cp.name}
                            </h4>
                            <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded bg-[var(--text-primary)]/5 text-[var(--text-dim)]">
                              {cp.type}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-[var(--text-dim)] mt-1 tracking-tighter opacity-70">
                            {cp.baseUrl}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              cp.enabled
                                ? "text-emerald-500"
                                : "text-[var(--text-dim)]"
                            }`}
                          >
                            {cp.enabled
                              ? t.providers.enabledState
                              : t.providers.disabledState}
                          </span>
                          <button
                            role="switch"
                            aria-checked={cp.enabled}
                            onClick={() =>
                              handleToggleCustomProviderEnabled(cp, !cp.enabled)
                            }
                            disabled={!!pendingCustomToggles[cp.id]}
                            className={`relative w-8 h-4 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                              cp.enabled
                                ? "toggle-track-active"
                                : "toggle-track"
                            } ${pendingCustomToggles[cp.id] ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
                            title={
                              cp.enabled
                                ? t.providers.disableProvider
                                : t.providers.enableProvider
                            }
                          >
                            <div
                              className={`toggle-knob absolute top-0.5 left-0.5 w-3 h-3 rounded-full flex items-center justify-center pointer-events-none transition-transform duration-200 ${
                                cp.enabled ? "translate-x-4" : "translate-x-0"
                              }`}
                            >
                              {pendingCustomToggles[cp.id] && (
                                <Loader2 className="w-2 h-2 text-[var(--accent-primary)] animate-spin" />
                              )}
                            </div>
                          </button>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-300">
                          {cp.enabled && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCustomProvider(cp);
                                  setShowCustomProviderForm(true);
                                }}
                                className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 rounded-lg transition-all"
                                title={t.common.edit}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  handleCopyCustomProvider(cp);
                                }}
                                className={`p-1.5 rounded-lg transition-all ${
                                  copiedProvider === cp.id
                                    ? "text-emerald-500"
                                    : "text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5"
                                }`}
                                title={
                                  copiedProvider === cp.id
                                    ? t.common.copied
                                    : t.common.copy
                                }
                              >
                                {copiedProvider === cp.id ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteConfirmProvider(cp)}
                            className="p-1.5 text-[var(--text-dim)] hover:text-neon-red hover:bg-neon-red/5 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {customExpanded && (
                      <div className="flex items-center gap-6 mt-auto animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                            Keys
                          </p>
                          <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                            {cp.keysCount}
                          </p>
                        </div>
                        <div className="w-px h-6 bg-[var(--text-primary)]/5" />
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                            Models
                          </p>
                          <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                            {cp.modelsCount}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-14 text-center border border-dashed border-[var(--glass-border)] rounded-3xl group hover:border-[var(--glass-border-hover)] transition-colors bg-[var(--text-primary)]/[0.01]">
                <div className="text-4xl mb-4 opacity-10 group-hover:opacity-20 transition-opacity text-[var(--text-primary)]">
                  ◈
                </div>
                <p className="text-[var(--text-dim)] font-bold tracking-tight uppercase text-[10px] mb-6">
                  {t.providers.customNoProviders}
                </p>
                <button
                  className="px-8 py-2.5 rounded-xl border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold tracking-widest hover:bg-[var(--text-primary)]/5 transition-all"
                  onClick={handleImportClick}
                >
                  {t.providers.customImport}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {showImportModal && (
        <CustomProviderImportModal
          isOpen={showImportModal}
          isImporting={isImporting}
          existingProviders={{
            openai: openaiProviders,
            claude: claudeProviders,
            gemini: geminiProviders,
            codex: codexProviders,
          }}
          onClose={() => setShowImportModal(false)}
          onConfirm={handleImportConfirm}
        />
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
          editProvider={
            editingCustomProvider?.type === "openai"
              ? (editingCustomProvider.rawData as OpenAICompatProvider)
              : undefined
          }
          editClaudeProvider={
            editingCustomProvider?.type === "claude"
              ? (editingCustomProvider.rawData as ClaudeCompatProvider)
              : undefined
          }
          editGeminiProvider={
            editingCustomProvider?.type === "gemini"
              ? (editingCustomProvider.rawData as GeminiCompatProvider)
              : undefined
          }
          editCodexProvider={
            editingCustomProvider?.type === "codex"
              ? (editingCustomProvider.rawData as CodexCompatProvider)
              : undefined
          }
        />
      )}
      {showAmpcodeSettings && (
        <AmpcodeSettingsModal
          provider={ampcodeProvider}
          onClose={() => setShowAmpcodeSettings(false)}
          onSaved={() => loadCustomProviders()}
        />
      )}
      {copilotAuthInfo && (
        <CopilotAuthModal
          authInfo={copilotAuthInfo}
          onClose={() => {
            setCopilotAuthInfo(null);
            setCopilotAuthError(null);
          }}
          authError={copilotAuthError}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteConfirmProvider}
        onClose={() => {
          if (!isDeletingCustomProvider) {
            setDeleteConfirmProvider(null);
          }
        }}
        onConfirm={() => {
          if (deleteConfirmProvider) {
            void handleDeleteCustomProvider(deleteConfirmProvider);
          }
        }}
        title={
          deleteConfirmProvider
            ? t.providers.customDeleteConfirm.replace(
                "{name}",
                deleteConfirmProvider.name,
              )
            : ""
        }
        description={t.logs.deleteDesc}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        isLoading={isDeletingCustomProvider}
      />

      <ConfirmModal
        isOpen={!!removeConfirmAccount}
        onClose={() => {
          if (!isRemovingAccount) {
            setRemoveConfirmAccount(null);
          }
        }}
        onConfirm={() => {
          if (removeConfirmAccount)
            void performRemoveAccount(
              removeConfirmAccount.providerId,
              removeConfirmAccount.accountId,
            );
        }}
        title={t.providers.removeAccountConfirm}
        description={t.providers.removeAccountDesc}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        isLoading={isRemovingAccount}
      />
    </div>
  );
}
