import { useMemo, useState } from "react";
import { Zap, X, Box, Save, XCircle, Search, Check } from "lucide-react";

import { useTranslations } from "../../../stores/settings";
import {
  CustomProviderFormProps,
  ProtocolType,
  OpenAIApiKeyEntry,
  ModelEntry,
  ClaudeApiKeyEntry,
  GeminiApiKeyEntry,
  CodexApiKeyEntry,
  OpenAICompatProvider,
  ClaudeCompatProvider,
  GeminiCompatProvider,
  CodexCompatProvider,
} from "./types";
import { OpenAIProtocolForm } from "./OpenAIProtocolForm";
import { ClaudeProtocolForm } from "./ClaudeProtocolForm";
import { GeminiProtocolForm } from "./GeminiProtocolForm";
import { CodexProtocolForm } from "./CodexProtocolForm";

export function CustomProviderForm({
  onClose,
  onSaved,
  editProvider,
  editClaudeProvider,
  editGeminiProvider,
  editCodexProvider,
  initialProtocol = "openai",
}: CustomProviderFormProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    latency?: number;
    serviceType?: "new-api" | "openrouter" | "custom";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelPickerProtocol, setModelPickerProtocol] =
    useState<ProtocolType | null>(null);
  const [modelPickerCandidates, setModelPickerCandidates] = useState<string[]>(
    [],
  );
  const [modelPickerSelected, setModelPickerSelected] = useState<string[]>([]);
  const [modelPickerSearch, setModelPickerSearch] = useState("");

  const initialProtocolValue = editCodexProvider
    ? "codex"
    : editGeminiProvider
      ? "gemini"
      : editClaudeProvider
        ? "claude"
        : editProvider
          ? "openai"
          : initialProtocol;

  const [protocol, setProtocol] = useState<ProtocolType>(initialProtocolValue);

  const [name, setName] = useState(
    editProvider?.name ||
      editClaudeProvider?.name ||
      editGeminiProvider?.name ||
      editCodexProvider?.name ||
      "",
  );
  const [baseUrl, setBaseUrl] = useState(
    editProvider?.["base-url"] ||
      editClaudeProvider?.["base-url"] ||
      editGeminiProvider?.["base-url"] ||
      editCodexProvider?.["base-url"] ||
      "",
  );
  const [openaiPrefix, setOpenaiPrefix] = useState(
    editProvider?.prefix ||
      editClaudeProvider?.prefix ||
      editGeminiProvider?.prefix ||
      editCodexProvider?.prefix ||
      "",
  );
  const [systemAccessToken, setSystemAccessToken] = useState(
    editProvider?.["system-access-token"] || "",
  );
  const [newApiUser, setNewApiUser] = useState(
    editProvider?.["new-api-user"] || "",
  );
  const [enableUsageQuery, setEnableUsageQuery] = useState(
    editProvider?.["enable-usage-query"] || false,
  );
  const [openaiApiKeys, setOpenaiApiKeys] = useState<OpenAIApiKeyEntry[]>(
    editProvider?.["api-key-entries"] || [{ "api-key": "" }],
  );
  const [openaiModels, setOpenaiModels] = useState<ModelEntry[]>(
    editProvider?.models ||
      editClaudeProvider?.models ||
      editGeminiProvider?.models ||
      editCodexProvider?.models ||
      [],
  );
  const [openaiHeaders, setOpenaiHeaders] = useState<
    Record<string, string> | undefined
  >(editProvider?.headers);

  const [claudeEntry, setClaudeEntry] = useState<ClaudeApiKeyEntry>(
    editClaudeProvider || {
      "api-key": "",
      "base-url": "https://api.anthropic.com",
    },
  );

  const [geminiEntry, setGeminiEntry] = useState<GeminiApiKeyEntry>(
    editGeminiProvider || {
      "api-key": "",
      "base-url": "https://generativelanguage.googleapis.com",
    },
  );

  const [codexEntry, setCodexEntry] = useState<CodexApiKeyEntry>(
    editCodexProvider || { "api-key": "" },
  );

  const isEditingOpenai = !!editProvider;
  const isEditingClaude = !!editClaudeProvider;
  const isEditingGemini = !!editGeminiProvider;
  const isEditingCodex = !!editCodexProvider;
  const isEditing =
    isEditingOpenai || isEditingClaude || isEditingGemini || isEditingCodex;
  const originalName =
    editProvider?.name ||
    editClaudeProvider?.name ||
    editGeminiProvider?.name ||
    editCodexProvider?.name ||
    "";
  const originalClaudeKey = editClaudeProvider?.["api-key"] || "";
  const originalGeminiKey = editGeminiProvider?.["api-key"] || "";
  const originalCodexKey = editCodexProvider?.["api-key"] || "";
  const originalClaudeBaseUrl = editClaudeProvider?.["base-url"] || "";
  const originalGeminiBaseUrl = editGeminiProvider?.["base-url"] || "";
  const originalCodexBaseUrl = editCodexProvider?.["base-url"] || "";

  const updateClaudeField = (
    field: keyof ClaudeApiKeyEntry,
    value: string | boolean | ModelEntry[] | Record<string, string> | undefined,
  ) => {
    if (field === "models") {
      setClaudeEntry({ ...claudeEntry, models: value as ModelEntry[] });
    } else if (field === "enable-usage-query") {
      setClaudeEntry({
        ...claudeEntry,
        "enable-usage-query": value as boolean,
      });
    } else {
      setClaudeEntry({ ...claudeEntry, [field]: value || undefined });
    }
  };

  const updateGeminiField = (
    field: keyof GeminiApiKeyEntry,
    value: string | boolean | Record<string, string> | ModelEntry[] | undefined,
  ) => {
    if (field === "headers") {
      setGeminiEntry({
        ...geminiEntry,
        headers: value as Record<string, string> | undefined,
      });
    } else if (field === "models") {
      setGeminiEntry({
        ...geminiEntry,
        models: value as ModelEntry[] | undefined,
      });
    } else if (field === "enable-usage-query") {
      setGeminiEntry({
        ...geminiEntry,
        "enable-usage-query": value as boolean,
      });
    } else {
      setGeminiEntry({ ...geminiEntry, [field]: value || undefined });
    }
  };

  const updateCodexField = (
    field: keyof CodexApiKeyEntry,
    value: string | boolean | ModelEntry[] | Record<string, string> | undefined,
  ) => {
    if (field === "models") {
      setCodexEntry({
        ...codexEntry,
        models: value as ModelEntry[] | undefined,
      });
    } else if (field === "enable-usage-query") {
      setCodexEntry({
        ...codexEntry,
        "enable-usage-query": value as boolean,
      });
    } else {
      setCodexEntry({ ...codexEntry, [field]: value || undefined });
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    setError(null);

    let testBaseUrl = "";
    let testApiKey = "";
    let testHeaders: Record<string, string> | undefined;

    if (protocol === "openai") {
      testBaseUrl = baseUrl.trim();
      const firstKey = openaiApiKeys.find((k) => k["api-key"].trim());
      testApiKey = firstKey?.["api-key"].trim() || "";
      testHeaders = openaiHeaders;
    } else if (protocol === "claude") {
      testBaseUrl = claudeEntry["base-url"]?.trim() || "";
      testApiKey = claudeEntry["api-key"].trim();
      testHeaders = claudeEntry.headers;
    } else if (protocol === "gemini") {
      testBaseUrl = geminiEntry["base-url"]?.trim() || "";
      testApiKey = geminiEntry["api-key"].trim();
      testHeaders = geminiEntry.headers;
    } else if (protocol === "codex") {
      testBaseUrl = codexEntry["base-url"]?.trim() || "";
      testApiKey = codexEntry["api-key"].trim();
      testHeaders = codexEntry.headers;
    }

    if (!testBaseUrl) {
      setError(t.providers.customUrlRequired);
      return;
    }

    const normalizedHeaders = Object.fromEntries(
      Object.entries(testHeaders || {}).filter(
        ([key, value]) => key.trim().length > 0 && value.trim().length > 0,
      ),
    );
    const hasAuthorizationHeader = Object.entries(normalizedHeaders).some(
      ([key, value]) =>
        key.trim().toLowerCase() === "authorization" && value.trim().length > 0,
    );

    if (!testApiKey && !hasAuthorizationHeader) {
      setError(t.providers.customApiKeyOrAuthHeaderRequired);
      return;
    }

    setIsTesting(true);

    try {
      const result = await window.electronAPI?.customProvider?.testConnection({
        protocol,
        baseUrl: testBaseUrl,
        apiKey: testApiKey,
        headers: normalizedHeaders,
      });

      setTestResult(result || { success: false, error: "No response" });
    } catch (err) {
      setTestResult({ success: false, error: String(err) });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (protocol === "openai") {
      if (!name.trim()) {
        setError(t.providers.customNameRequired);
        return;
      }
      if (!baseUrl.trim()) {
        setError(t.providers.customUrlRequired);
        return;
      }
      const validKeys = openaiApiKeys.filter((k) => k["api-key"].trim());
      if (validKeys.length === 0) {
        setError(t.providers.customApiKeyRequired);
        return;
      }

      if (enableUsageQuery && !systemAccessToken.trim()) {
        setError(t.providers.customSystemTokenRequired);
        return;
      }
      if (enableUsageQuery && !newApiUser.trim()) {
        setError(t.providers.customNewApiUserRequired);
        return;
      }

      setIsLoading(true);

      const providerData: OpenAICompatProvider = {
        name: name.trim(),
        "base-url": baseUrl.trim(),
        ...(openaiPrefix.trim() ? { prefix: openaiPrefix.trim() } : {}),
        ...(systemAccessToken.trim()
          ? { "system-access-token": systemAccessToken.trim() }
          : {}),
        ...(newApiUser.trim() ? { "new-api-user": newApiUser.trim() } : {}),
        "enable-usage-query": enableUsageQuery,
        ...(openaiHeaders &&
        Object.keys(openaiHeaders).filter((k) => k.trim()).length > 0
          ? {
              headers: Object.fromEntries(
                Object.entries(openaiHeaders).filter(([k]) => k.trim()),
              ),
            }
          : {}),
        "api-key-entries": validKeys.map((k) => ({
          "api-key": k["api-key"].trim(),
          ...(k["proxy-url"]?.trim()
            ? { "proxy-url": k["proxy-url"].trim() }
            : {}),
        })),
        ...(openaiModels.filter((m) => m.name.trim()).length > 0
          ? {
              models: openaiModels
                .filter((m) => m.name.trim())
                .map((m) => ({
                  name: m.name.trim(),
                  ...(m.alias?.trim() ? { alias: m.alias.trim() } : {}),
                })),
            }
          : {}),
      };

      try {
        let result;
        if (isEditingOpenai && editProvider) {
          result = await window.electronAPI?.openaiCompat?.update(
            editProvider.name,
            providerData,
          );
        } else {
          result = await window.electronAPI?.openaiCompat?.add(providerData);
        }

        if (result?.success) {
          onSaved();
        } else {
          setError(result?.error || "Failed to save provider");
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    } else if (protocol === "claude") {
      if (!claudeEntry["api-key"].trim()) {
        setError(t.providers.customApiKeyRequired);
        return;
      }
      if (!claudeEntry["base-url"]?.trim()) {
        setError(t.providers.customUrlRequired);
        return;
      }

      if (claudeEntry["enable-usage-query"]) {
        if (!claudeEntry["system-access-token"]?.trim()) {
          setError(t.providers.customSystemTokenRequired);
          return;
        }
        if (!claudeEntry["new-api-user"]?.trim()) {
          setError(t.providers.customNewApiUserRequired);
          return;
        }
      }

      setIsLoading(true);

      const cleaned: ClaudeCompatProvider = {
        ...(claudeEntry.name?.trim() ? { name: claudeEntry.name.trim() } : {}),
        "api-key": claudeEntry["api-key"].trim(),
        "base-url":
          claudeEntry["base-url"]?.trim() || "https://api.anthropic.com",
        ...(claudeEntry["proxy-url"]?.trim()
          ? { "proxy-url": claudeEntry["proxy-url"].trim() }
          : {}),
        ...(claudeEntry["system-access-token"]?.trim()
          ? { "system-access-token": claudeEntry["system-access-token"].trim() }
          : {}),
        ...(claudeEntry["new-api-user"]?.trim()
          ? { "new-api-user": claudeEntry["new-api-user"].trim() }
          : {}),
        "enable-usage-query": claudeEntry["enable-usage-query"] || false,
        ...(claudeEntry.prefix?.trim()
          ? { prefix: claudeEntry.prefix.trim() }
          : {}),
        ...(claudeEntry.headers &&
        Object.keys(claudeEntry.headers).filter((k) => k.trim()).length > 0
          ? {
              headers: Object.fromEntries(
                Object.entries(claudeEntry.headers).filter(([k]) => k.trim()),
              ),
            }
          : {}),
        ...(claudeEntry.models &&
        claudeEntry.models.filter((m) => m.name.trim()).length > 0
          ? {
              models: claudeEntry.models
                .filter((m) => m.name.trim())
                .map((m) => ({
                  name: m.name.trim(),
                  ...(m.alias?.trim() ? { alias: m.alias.trim() } : {}),
                })),
            }
          : {}),
      };

      try {
        const existingResult = await window.electronAPI?.claudeCompat?.getAll();
        const existingEntries: ClaudeApiKeyEntry[] =
          existingResult?.entries || [];
        const matchEntry = (entry: ClaudeApiKeyEntry) => {
          if (originalName) {
            return entry.name === originalName;
          }
          if (originalClaudeKey) {
            const entryBaseUrl = entry["base-url"] || "";
            if (originalClaudeBaseUrl) {
              return (
                entry["api-key"] === originalClaudeKey &&
                entryBaseUrl === originalClaudeBaseUrl
              );
            }
            return entry["api-key"] === originalClaudeKey;
          }
          return false;
        };
        const hasConflict = existingEntries.some((entry: ClaudeApiKeyEntry) => {
          if (cleaned.name?.trim() && entry.name) {
            return entry.name === cleaned.name?.trim();
          }
          const entryBaseUrl = entry["base-url"] || "";
          const cleanedBaseUrl = cleaned["base-url"] || "";
          return (
            entry["api-key"] === cleaned["api-key"] &&
            entryBaseUrl === cleanedBaseUrl
          );
        });

        let updatedEntries: ClaudeApiKeyEntry[] = [];
        if (isEditingClaude && protocol === initialProtocolValue) {
          let replaced = false;
          updatedEntries = existingEntries.map((entry: ClaudeApiKeyEntry) => {
            if (!replaced && matchEntry(entry)) {
              replaced = true;
              return cleaned;
            }
            return entry;
          });
          if (!replaced) {
            updatedEntries = [...existingEntries, cleaned];
          }
        } else {
          if (hasConflict) {
            setError(t.providers.customProviderExists);
            setIsLoading(false);
            return;
          }
          updatedEntries = [...existingEntries, cleaned];
        }

        const result =
          await window.electronAPI?.claudeCompat?.save(updatedEntries);
        if (result?.success) {
          onSaved();
        } else {
          setError(result?.error || "Failed to save Claude API configuration");
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    } else if (protocol === "gemini") {
      if (!geminiEntry["api-key"].trim()) {
        setError(t.providers.customApiKeyRequired);
        return;
      }
      if (!geminiEntry["base-url"]?.trim()) {
        setError(t.providers.customUrlRequired);
        return;
      }

      if (geminiEntry["enable-usage-query"]) {
        if (!geminiEntry["system-access-token"]?.trim()) {
          setError(t.providers.customSystemTokenRequired);
          return;
        }
        if (!geminiEntry["new-api-user"]?.trim()) {
          setError(t.providers.customNewApiUserRequired);
          return;
        }
      }

      setIsLoading(true);

      const cleaned: GeminiCompatProvider = {
        ...(geminiEntry.name?.trim() ? { name: geminiEntry.name.trim() } : {}),
        "api-key": geminiEntry["api-key"].trim(),
        ...(geminiEntry["base-url"]?.trim()
          ? { "base-url": geminiEntry["base-url"].trim() }
          : {}),
        ...(geminiEntry["proxy-url"]?.trim()
          ? { "proxy-url": geminiEntry["proxy-url"].trim() }
          : {}),
        ...(geminiEntry["system-access-token"]?.trim()
          ? { "system-access-token": geminiEntry["system-access-token"].trim() }
          : {}),
        ...(geminiEntry["new-api-user"]?.trim()
          ? { "new-api-user": geminiEntry["new-api-user"].trim() }
          : {}),
        "enable-usage-query": geminiEntry["enable-usage-query"] || false,
        ...(geminiEntry.prefix?.trim()
          ? { prefix: geminiEntry.prefix.trim() }
          : {}),
        ...(geminiEntry.headers &&
        Object.keys(geminiEntry.headers).filter((k) => k.trim()).length > 0
          ? {
              headers: Object.fromEntries(
                Object.entries(geminiEntry.headers).filter(([k]) => k.trim()),
              ),
            }
          : {}),
        ...(geminiEntry.models &&
        geminiEntry.models.filter((m) => m.name.trim()).length > 0
          ? {
              models: geminiEntry.models
                .filter((m) => m.name.trim())
                .map((m) => ({
                  name: m.name.trim(),
                  ...(m.alias?.trim() ? { alias: m.alias.trim() } : {}),
                })),
            }
          : {}),
      };

      try {
        const existingResult = await window.electronAPI?.geminiCompat?.getAll();
        const existingEntries: GeminiApiKeyEntry[] =
          existingResult?.entries || [];
        const matchEntry = (entry: GeminiApiKeyEntry) => {
          if (originalName) {
            return entry.name === originalName;
          }
          if (originalGeminiKey) {
            const entryBaseUrl = entry["base-url"] || "";
            if (originalGeminiBaseUrl) {
              return (
                entry["api-key"] === originalGeminiKey &&
                entryBaseUrl === originalGeminiBaseUrl
              );
            }
            return entry["api-key"] === originalGeminiKey;
          }
          return false;
        };
        const hasConflict = existingEntries.some((entry: GeminiApiKeyEntry) => {
          if (cleaned.name?.trim() && entry.name) {
            return entry.name === cleaned.name?.trim();
          }
          const entryBaseUrl = entry["base-url"] || "";
          const cleanedBaseUrl = cleaned["base-url"] || "";
          return (
            entry["api-key"] === cleaned["api-key"] &&
            entryBaseUrl === cleanedBaseUrl
          );
        });

        let updatedEntries: GeminiApiKeyEntry[] = [];
        if (isEditingGemini && protocol === initialProtocolValue) {
          let replaced = false;
          updatedEntries = existingEntries.map((entry: GeminiApiKeyEntry) => {
            if (!replaced && matchEntry(entry)) {
              replaced = true;
              return cleaned;
            }
            return entry;
          });
          if (!replaced) {
            updatedEntries = [...existingEntries, cleaned];
          }
        } else {
          if (hasConflict) {
            setError(t.providers.customProviderExists);
            setIsLoading(false);
            return;
          }
          updatedEntries = [...existingEntries, cleaned];
        }

        const result =
          await window.electronAPI?.geminiCompat?.save(updatedEntries);
        if (result?.success) {
          onSaved();
        } else {
          setError(result?.error || "Failed to save Gemini API configuration");
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    } else if (protocol === "codex") {
      if (!codexEntry["api-key"].trim()) {
        setError(t.providers.customApiKeyRequired);
        return;
      }
      if (!codexEntry["base-url"]?.trim()) {
        setError(t.providers.customUrlRequired);
        return;
      }

      if (codexEntry["enable-usage-query"]) {
        if (!codexEntry["system-access-token"]?.trim()) {
          setError(t.providers.customSystemTokenRequired);
          return;
        }
        if (!codexEntry["new-api-user"]?.trim()) {
          setError(t.providers.customNewApiUserRequired);
          return;
        }
      }

      setIsLoading(true);

      const cleaned: CodexCompatProvider = {
        ...(codexEntry.name?.trim() ? { name: codexEntry.name.trim() } : {}),
        "api-key": codexEntry["api-key"].trim(),
        ...(codexEntry["base-url"]?.trim()
          ? { "base-url": codexEntry["base-url"].trim() }
          : {}),
        ...(codexEntry["proxy-url"]?.trim()
          ? { "proxy-url": codexEntry["proxy-url"].trim() }
          : {}),
        ...(codexEntry["system-access-token"]?.trim()
          ? { "system-access-token": codexEntry["system-access-token"].trim() }
          : {}),
        ...(codexEntry["new-api-user"]?.trim()
          ? { "new-api-user": codexEntry["new-api-user"].trim() }
          : {}),
        "enable-usage-query": codexEntry["enable-usage-query"] || false,
        ...(codexEntry.prefix?.trim()
          ? { prefix: codexEntry.prefix.trim() }
          : {}),
        ...(codexEntry.headers &&
        Object.keys(codexEntry.headers).filter((k) => k.trim()).length > 0
          ? {
              headers: Object.fromEntries(
                Object.entries(codexEntry.headers).filter(([k]) => k.trim()),
              ),
            }
          : {}),
        ...(codexEntry.models &&
        codexEntry.models.filter((m) => m.name.trim()).length > 0
          ? {
              models: codexEntry.models
                .filter((m) => m.name.trim())
                .map((m) => ({
                  name: m.name.trim(),
                  ...(m.alias?.trim() ? { alias: m.alias.trim() } : {}),
                })),
            }
          : {}),
      };

      try {
        const existingResult = await window.electronAPI?.codexCompat?.getAll();
        const existingEntries: CodexApiKeyEntry[] =
          existingResult?.entries || [];
        const matchEntry = (entry: CodexApiKeyEntry) => {
          if (originalName) {
            return entry.name === originalName;
          }
          if (originalCodexKey) {
            const entryBaseUrl = entry["base-url"] || "";
            if (originalCodexBaseUrl) {
              return (
                entry["api-key"] === originalCodexKey &&
                entryBaseUrl === originalCodexBaseUrl
              );
            }
            return entry["api-key"] === originalCodexKey;
          }
          return false;
        };
        const hasConflict = existingEntries.some((entry: CodexApiKeyEntry) => {
          if (cleaned.name?.trim() && entry.name) {
            return entry.name === cleaned.name?.trim();
          }
          const entryBaseUrl = entry["base-url"] || "";
          const cleanedBaseUrl = cleaned["base-url"] || "";
          return (
            entry["api-key"] === cleaned["api-key"] &&
            entryBaseUrl === cleanedBaseUrl
          );
        });

        let updatedEntries: CodexApiKeyEntry[] = [];
        if (isEditingCodex && protocol === initialProtocolValue) {
          let replaced = false;
          updatedEntries = existingEntries.map((entry: CodexApiKeyEntry) => {
            if (!replaced && matchEntry(entry)) {
              replaced = true;
              return cleaned;
            }
            return entry;
          });
          if (!replaced) {
            updatedEntries = [...existingEntries, cleaned];
          }
        } else {
          if (hasConflict) {
            setError(t.providers.customProviderExists);
            setIsLoading(false);
            return;
          }
          updatedEntries = [...existingEntries, cleaned];
        }

        const result =
          await window.electronAPI?.codexCompat?.save(updatedEntries);
        if (result?.success) {
          onSaved();
        } else {
          setError(result?.error || "Failed to save Codex API configuration");
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFetchModels = async (
    baseUrlRaw: string,
    apiKeyRaw: string,
    headers?: Record<string, string>,
  ) => {
    const baseUrlTrimmed = baseUrlRaw.trim();
    const apiKeyTrimmed = apiKeyRaw.trim();

    if (!baseUrlTrimmed) {
      setError(t.providers.customUrlRequired);
      return;
    }

    const normalizedHeaders = Object.fromEntries(
      Object.entries(headers || {}).filter(
        ([key, value]) => key.trim().length > 0 && value.trim().length > 0,
      ),
    );

    const hasAuthorizationHeader = Object.entries(normalizedHeaders).some(
      ([key, value]) =>
        key.trim().toLowerCase() === "authorization" && value.trim().length > 0,
    );

    if (!apiKeyTrimmed && !hasAuthorizationHeader) {
      setError(t.providers.customApiKeyOrAuthHeaderRequired);
      return;
    }

    setError(null);
    setIsFetchingModels(true);

    try {
      const result = await window.electronAPI?.customProvider?.fetchModels({
        baseUrl: baseUrlTrimmed,
        apiKey: apiKeyTrimmed,
        headers: normalizedHeaders,
      });

      if (!result?.success) {
        setError(result?.error || t.providers.customFetchModelsFailed);
        return;
      }

      const models = (result.models || [])
        .map((item) => (typeof item?.id === "string" ? item.id.trim() : ""))
        .filter((item) => item.length > 0);

      const uniqueModels = Array.from(new Set(models)).map((name) => ({
        name,
      }));

      const candidateNames = uniqueModels.map((item) => item.name);
      setModelPickerProtocol(protocol);
      setModelPickerCandidates(candidateNames);

      const existingNames =
        protocol === "openai"
          ? openaiModels.map((item) => item.name)
          : protocol === "claude"
            ? (claudeEntry.models || []).map((item) => item.name)
            : protocol === "gemini"
              ? (geminiEntry.models || []).map((item) => item.name)
              : (codexEntry.models || []).map((item) => item.name);

      const preselected = candidateNames.filter((name) =>
        existingNames.includes(name),
      );

      setModelPickerSelected(preselected.length > 0 ? preselected : []);
      setModelPickerSearch("");
      setShowModelPicker(true);
    } catch (error) {
      const message = String(error);
      if (
        message.includes(
          "No handler registered for 'customProvider:fetchModels'",
        )
      ) {
        setError(t.providers.customFetchModelsNeedRestart);
      } else {
        setError(message);
      }
    } finally {
      setIsFetchingModels(false);
    }
  };

  const filteredModelPickerCandidates = useMemo(() => {
    const keyword = modelPickerSearch.trim().toLowerCase();
    if (!keyword) {
      return modelPickerCandidates;
    }
    return modelPickerCandidates.filter((item) =>
      item.toLowerCase().includes(keyword),
    );
  }, [modelPickerCandidates, modelPickerSearch]);

  const handleApplyModelPicker = () => {
    if (!modelPickerProtocol) return;
    if (modelPickerSelected.length === 0) {
      setError(t.providers.customModelPickerNeedSelection);
      return;
    }

    const existing =
      modelPickerProtocol === "openai"
        ? openaiModels
        : modelPickerProtocol === "claude"
          ? claudeEntry.models || []
          : modelPickerProtocol === "gemini"
            ? geminiEntry.models || []
            : codexEntry.models || [];

    const aliasMap = new Map(
      existing
        .filter((item) => item.alias?.trim())
        .map((item) => [item.name, item.alias?.trim()]),
    );

    const selectedModels = modelPickerSelected.map((name) => ({
      name,
      ...(aliasMap.get(name) ? { alias: aliasMap.get(name) } : {}),
    }));

    if (modelPickerProtocol === "openai") {
      setOpenaiModels(selectedModels);
    } else if (modelPickerProtocol === "claude") {
      updateClaudeField("models", selectedModels);
    } else if (modelPickerProtocol === "gemini") {
      updateGeminiField("models", selectedModels);
    } else if (modelPickerProtocol === "codex") {
      updateCodexField("models", selectedModels);
    }

    setShowModelPicker(false);
    setModelPickerProtocol(null);
    setModelPickerCandidates([]);
    setModelPickerSelected([]);
    setModelPickerSearch("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      />

      <div className="relative w-full max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden animate-scale-in shadow-soft-xl border border-[var(--glass-border)] rounded-3xl isolation-isolate">
        <div className="absolute inset-0 glass-modal-bg z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 via-transparent to-transparent z-0" />

        <div className="relative z-10 flex items-center justify-between p-8 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-4">
            <div className="text-3xl text-[var(--accent-primary)] transition-transform duration-500 hover:scale-110">
              <Zap className="w-8 h-8 fill-current opacity-20" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                {isEditing
                  ? t.providers.customEdit
                  : t.providers.customProvider}
              </h2>
              <p className="text-[10px] text-[var(--text-dim)] mt-1 font-bold tracking-wider opacity-80">
                {t.providers.customProviderDesc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--text-primary)]/5 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="relative z-10 mx-8 mt-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-shake flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="relative z-10 flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {!isEditing && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em] px-1">
                <Box className="w-3.5 h-3.5" />
                {t.providers.customProtocol}
              </label>
              <div className="relative grid grid-cols-4 gap-1 p-1 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--glass-border)] shadow-inner">
                <div
                  className="absolute top-1 bottom-1 rounded-xl bg-[var(--bg-primary)] shadow-soft-md transition-all duration-300 ease-out"
                  style={{
                    width: "calc(25% - 4px)",
                    left:
                      protocol === "openai"
                        ? "4px"
                        : protocol === "claude"
                          ? "calc(25% + 2px)"
                          : protocol === "gemini"
                            ? "calc(50% + 1px)"
                            : "calc(75% - 1px)",
                  }}
                />
                {["openai", "claude", "gemini", "codex"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setProtocol(p as ProtocolType)}
                    className={`relative z-10 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                      protocol === p
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span>
                      {p === "openai"
                        ? "OpenAI"
                        : p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div key={protocol} className="space-y-10 animate-slide-fade-in">
            {protocol === "openai" ? (
              <OpenAIProtocolForm
                name={name}
                baseUrl={baseUrl}
                prefix={openaiPrefix}
                apiKeys={openaiApiKeys}
                models={openaiModels}
                systemAccessToken={systemAccessToken}
                newApiUser={newApiUser}
                enableUsageQuery={enableUsageQuery}
                headers={openaiHeaders}
                isFetchingModels={isFetchingModels}
                isEditing={isEditingOpenai}
                onNameChange={setName}
                onBaseUrlChange={setBaseUrl}
                onPrefixChange={setOpenaiPrefix}
                onApiKeysChange={setOpenaiApiKeys}
                onModelsChange={setOpenaiModels}
                onSystemAccessTokenChange={setSystemAccessToken}
                onNewApiUserChange={setNewApiUser}
                onEnableUsageQueryChange={setEnableUsageQuery}
                onHeadersChange={setOpenaiHeaders}
                onFetchModels={() =>
                  handleFetchModels(
                    baseUrl,
                    openaiApiKeys.find((k) => k["api-key"].trim())?.[
                      "api-key"
                    ] || "",
                    openaiHeaders,
                  )
                }
              />
            ) : protocol === "claude" ? (
              <ClaudeProtocolForm
                entry={claudeEntry}
                isFetchingModels={isFetchingModels}
                onFetchModels={() =>
                  handleFetchModels(
                    claudeEntry["base-url"] || "",
                    claudeEntry["api-key"] || "",
                    claudeEntry.headers,
                  )
                }
                onUpdate={updateClaudeField}
              />
            ) : protocol === "gemini" ? (
              <GeminiProtocolForm
                entry={geminiEntry}
                isFetchingModels={isFetchingModels}
                onFetchModels={() =>
                  handleFetchModels(
                    geminiEntry["base-url"] || "",
                    geminiEntry["api-key"] || "",
                    geminiEntry.headers,
                  )
                }
                onUpdate={updateGeminiField}
              />
            ) : protocol === "codex" ? (
              <CodexProtocolForm
                entry={codexEntry}
                isFetchingModels={isFetchingModels}
                onFetchModels={() =>
                  handleFetchModels(
                    codexEntry["base-url"] || "",
                    codexEntry["api-key"] || "",
                    codexEntry.headers,
                  )
                }
                onUpdate={updateCodexField}
              />
            ) : null}
          </div>
        </div>

        <div className="relative z-10 p-8 border-t border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01] backdrop-blur-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all flex items-center gap-2 border border-[var(--glass-border)]"
            >
              {isTesting ? (
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isTesting
                ? t.providers.customTesting
                : t.providers.customTestConnection}
            </button>
            {testResult && (
              <div
                className={`flex items-center gap-1.5 text-xs font-bold ${testResult.success ? "text-green-500" : "text-red-500"}`}
              >
                {testResult.success ? (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>{t.providers.customTestSuccess}</span>
                    <span className="text-[var(--text-dim)] font-normal ml-1">
                      (Custom API)
                    </span>
                    {testResult.latency && (
                      <span className="text-[var(--text-dim)] font-normal ml-1">
                        {testResult.latency}ms
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>
                      {testResult.error || t.providers.customTestFailed}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="glass-btn glass-btn-primary px-10 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4 stroke-[2.5px]" />
              )}
              {t.common.save}
            </button>
          </div>
        </div>
      </div>

      {showModelPicker && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-primary)] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--glass-border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {t.providers.customModelPickerTitle}
                </h3>
                <p className="text-[11px] text-[var(--text-dim)] mt-1">
                  {t.providers.customModelPickerSubtitle}
                </p>
              </div>
              <button
                onClick={() => setShowModelPicker(false)}
                className="p-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 border-b border-[var(--glass-border)] flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  value={modelPickerSearch}
                  onChange={(e) => setModelPickerSearch(e.target.value)}
                  placeholder={t.providers.customModelPickerSearchPlaceholder}
                  className="glass-input h-10 w-full pl-10"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setModelPickerSelected(filteredModelPickerCandidates)
                  }
                  className="px-3 h-10 rounded-xl border border-[var(--glass-border)] text-xs font-bold text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                >
                  {t.providers.customModelPickerSelectAll}
                </button>
                <button
                  onClick={() => setModelPickerSelected([])}
                  className="px-3 h-10 rounded-xl border border-[var(--glass-border)] text-xs font-bold text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                >
                  {t.providers.customModelPickerClearAll}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {filteredModelPickerCandidates.length === 0 ? (
                <div className="text-center py-10 text-sm text-[var(--text-dim)]">
                  {t.providers.customModelPickerEmpty}
                </div>
              ) : (
                filteredModelPickerCandidates.map((model) => {
                  const checked = modelPickerSelected.includes(model);
                  return (
                    <label
                      key={model}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--glass-border)] hover:bg-[var(--text-primary)]/[0.03]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setModelPickerSelected((prev) => [...prev, model]);
                          } else {
                            setModelPickerSelected((prev) =>
                              prev.filter((item) => item !== model),
                            );
                          }
                        }}
                      />
                      <span
                        className={`w-4 h-4 rounded-[6px] border flex items-center justify-center transition-colors ${
                          checked
                            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white"
                            : "bg-[var(--bg-secondary)] border-[var(--glass-border)] text-transparent"
                        }`}
                      >
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      <span className="font-mono text-xs text-[var(--text-primary)] break-all">
                        {model}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="px-5 py-4 border-t border-[var(--glass-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-dim)] tabular-nums">
                {modelPickerSelected.length} / {modelPickerCandidates.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModelPicker(false)}
                  className="px-4 h-10 rounded-xl text-xs font-bold text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleApplyModelPicker}
                  className="glass-btn glass-btn-primary px-5 h-10 rounded-xl text-xs font-bold"
                >
                  {t.providers.customModelPickerApply}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
