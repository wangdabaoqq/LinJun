import { useCallback, useEffect, useMemo, useState } from "react";
import log from "@renderer/utils/logger";

import { useTranslations } from "../../../stores/settings";
import {
  AmpcodeCompatProvider,
  ClaudeCompatProvider,
  CodexCompatProvider,
  CustomProviderDisplay,
  GeminiCompatProvider,
  OpenAICompatProvider,
} from "../types";

interface ImportStatus {
  type: "success" | "error";
  message: string;
}

interface CompatApi<T> {
  getAll: () => Promise<{ success: boolean; entries: T[] } | undefined>;
  save: (entries: T[]) => Promise<{ success: boolean } | undefined>;
}

interface CompatEntry {
  name?: string;
  "api-key"?: string;
  "base-url"?: string;
}

function getCompatApi(
  type: "claude" | "gemini" | "codex",
): CompatApi<CompatEntry> | undefined {
  const api = window.electronAPI;
  if (type === "claude") return api?.claudeCompat as CompatApi<CompatEntry>;
  if (type === "gemini") return api?.geminiCompat as CompatApi<CompatEntry>;
  return api?.codexCompat as CompatApi<CompatEntry>;
}

function matchesCompatEntry(
  entry: CompatEntry,
  target: CompatEntry,
  fallbackName: string,
): boolean {
  const targetName = target.name || "";
  const targetKey = target["api-key"] || "";
  const targetBaseUrl = target["base-url"] || "";

  if (targetName && entry.name) {
    return entry.name === targetName;
  }
  if (targetKey) {
    const entryBaseUrl = entry["base-url"] || "";
    if (targetBaseUrl) {
      return entry["api-key"] === targetKey && entryBaseUrl === targetBaseUrl;
    }
    return entry["api-key"] === targetKey;
  }
  return entry.name === fallbackName;
}

async function deleteCompatEntries(
  type: "claude" | "gemini" | "codex",
  provider: CustomProviderDisplay,
): Promise<boolean> {
  const api = getCompatApi(type);
  if (!api) return false;

  const current = await api.getAll();
  if (!current?.success || !current.entries) return false;

  const target = provider.rawData as CompatEntry;
  const filtered = current.entries.filter(
    (entry) => !matchesCompatEntry(entry, target, provider.name),
  );
  const result = await api.save(filtered);
  return result?.success || false;
}

async function copyCompatEntry<T extends CompatEntry>(
  type: "claude" | "gemini" | "codex",
  rawData: T,
  newName: string,
): Promise<boolean> {
  const api = getCompatApi(type);
  if (!api) return false;

  const current = await api.getAll();
  if (!current?.success || !current.entries) return false;

  const newEntry = { ...rawData, name: newName } as unknown as CompatEntry;
  const result = await api.save([...current.entries, newEntry]);
  return result?.success || false;
}

interface UseCustomProvidersResult {
  customProviders: CustomProviderDisplay[];
  showCustomProviderForm: boolean;
  editingCustomProvider: CustomProviderDisplay | null;
  deleteConfirmProvider: CustomProviderDisplay | null;
  showImportModal: boolean;
  importStatus: ImportStatus | null;
  copiedProvider: string | null;
  pendingCustomToggles: Record<string, boolean>;
  isDeletingCustomProvider: boolean;
  isImporting: boolean;
  openaiProviders: OpenAICompatProvider[];
  claudeProviders: ClaudeCompatProvider[];
  geminiProviders: GeminiCompatProvider[];
  codexProviders: CodexCompatProvider[];
  ampcodeProvider: AmpcodeCompatProvider | null;
  showAmpcodeSettings: boolean;
  ampcodeMappedKeyCount: number;
  setShowCustomProviderForm: (show: boolean) => void;
  setEditingCustomProvider: (provider: CustomProviderDisplay | null) => void;
  setDeleteConfirmProvider: (provider: CustomProviderDisplay | null) => void;
  setShowImportModal: (show: boolean) => void;
  setImportStatus: (status: ImportStatus | null) => void;
  setShowAmpcodeSettings: (show: boolean) => void;
  loadCustomProviders: () => Promise<void>;
  handleDeleteCustomProvider: (
    provider: CustomProviderDisplay,
  ) => Promise<void>;
  handleCopyCustomProvider: (provider: CustomProviderDisplay) => Promise<void>;
  handleToggleCustomProviderEnabled: (
    provider: CustomProviderDisplay,
    enabled: boolean,
  ) => Promise<void>;
  handleImportClick: () => void;
  handleImportConfirm: (
    data: {
      "openai-compatibility"?: OpenAICompatProvider[];
      "claude-api-key"?: ClaudeCompatProvider[];
      "gemini-api-key"?: GeminiCompatProvider[];
      "codex-api-key"?: CodexCompatProvider[];
    },
    strategy: "overwrite" | "skip",
  ) => Promise<void>;
}

function buildCopyName(baseName: string, existingNames: string[]): string {
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
}

export function useCustomProviders(): UseCustomProvidersResult {
  const t = useTranslations();

  const [customProviders, setCustomProviders] = useState<
    CustomProviderDisplay[]
  >([]);
  const [showCustomProviderForm, setShowCustomProviderForm] = useState(false);
  const [editingCustomProvider, setEditingCustomProvider] =
    useState<CustomProviderDisplay | null>(null);
  const [deleteConfirmProvider, setDeleteConfirmProvider] =
    useState<CustomProviderDisplay | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null);
  const [pendingCustomToggles, setPendingCustomToggles] = useState<
    Record<string, boolean>
  >({});
  const [isDeletingCustomProvider, setIsDeletingCustomProvider] =
    useState(false);
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
  const [showAmpcodeSettings, setShowAmpcodeSettings] = useState(false);

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
    void loadCustomProviders();
  }, [loadCustomProviders]);

  const ampcodeMappedKeyCount = useMemo(() => {
    const mappings = ampcodeProvider?.["upstream-api-keys"] || [];
    return mappings.reduce(
      (count, mapping) => count + (mapping["api-keys"]?.length || 0),
      0,
    );
  }, [ampcodeProvider]);

  const handleDeleteCustomProvider = useCallback(
    async (provider: CustomProviderDisplay) => {
      if (isDeletingCustomProvider) {
        return;
      }

      setIsDeletingCustomProvider(true);
      try {
        let success = false;
        if (!provider.enabled) {
          const result = await window.electronAPI?.customProviders?.removeDraft(
            {
              type: provider.type,
              rawData: provider.rawData,
            },
          );
          success = result?.success || false;
        } else if (provider.type === "openai") {
          const result = await window.electronAPI?.openaiCompat?.delete(
            provider.name,
          );
          success = result?.success || false;
        } else if (
          provider.type === "claude" ||
          provider.type === "gemini" ||
          provider.type === "codex"
        ) {
          success = await deleteCompatEntries(provider.type, provider);
        }

        if (success) {
          setDeleteConfirmProvider(null);
          await loadCustomProviders();
        }
      } catch (err) {
        log.error("[Providers] Failed to delete custom provider:", err);
      } finally {
        setIsDeletingCustomProvider(false);
      }
    },
    [isDeletingCustomProvider, loadCustomProviders],
  );

  const handleCopyCustomProvider = useCallback(
    async (cp: CustomProviderDisplay) => {
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
        } else if (
          cp.type === "claude" ||
          cp.type === "gemini" ||
          cp.type === "codex"
        ) {
          const copied = await copyCompatEntry(
            cp.type,
            cp.rawData as CompatEntry,
            newName,
          );
          if (!copied) {
            log.error(`[Providers] Failed to copy ${cp.type} provider`);
            return;
          }
        }

        setCopiedProvider(copiedKey);
        setTimeout(() => setCopiedProvider(null), 2000);
        await loadCustomProviders();
      } catch (error) {
        log.error("[Providers] Failed to copy provider config:", error);
      }
    },
    [customProviders, loadCustomProviders],
  );

  const handleToggleCustomProviderEnabled = useCallback(
    async (provider: CustomProviderDisplay, enabled: boolean) => {
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
    },
    [loadCustomProviders],
  );

  const handleImportClick = useCallback(() => {
    setImportStatus(null);
    setShowImportModal(true);
  }, []);

  const handleImportConfirm = useCallback(
    async (
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
          const summary = result.summary || {
            added: 0,
            updated: 0,
            skipped: 0,
          };
          const summaryText = t.providers.customImportSummary
            .replace("{added}", summary.added.toString())
            .replace("{updated}", summary.updated.toString())
            .replace("{skipped}", summary.skipped.toString());
          setImportStatus({
            type: "success",
            message: `${t.providers.customImportSuccess} ${summaryText}`,
          });
          setShowImportModal(false);
          await loadCustomProviders();
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
    },
    [
      loadCustomProviders,
      t.providers.customImportFailed,
      t.providers.customImportSuccess,
      t.providers.customImportSummary,
    ],
  );

  return {
    customProviders,
    showCustomProviderForm,
    editingCustomProvider,
    deleteConfirmProvider,
    showImportModal,
    importStatus,
    copiedProvider,
    pendingCustomToggles,
    isDeletingCustomProvider,
    isImporting,
    openaiProviders,
    claudeProviders,
    geminiProviders,
    codexProviders,
    ampcodeProvider,
    showAmpcodeSettings,
    ampcodeMappedKeyCount,
    setShowCustomProviderForm,
    setEditingCustomProvider,
    setDeleteConfirmProvider,
    setShowImportModal,
    setImportStatus,
    setShowAmpcodeSettings,
    loadCustomProviders,
    handleDeleteCustomProvider,
    handleCopyCustomProvider,
    handleToggleCustomProviderEnabled,
    handleImportClick,
    handleImportConfirm,
  };
}
