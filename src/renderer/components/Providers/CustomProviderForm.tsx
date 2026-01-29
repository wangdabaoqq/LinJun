import { useState } from "react";
import { useTranslations } from "../../stores/settings";
import {
  Trash2,
  Plus,
  Globe,
  Key,
  Box,
  Save,
  X,
  Zap,
  ArrowRight,
} from "lucide-react";

type ProtocolType = "openai" | "claude" | "gemini" | "codex";

interface ModelEntry {
  name: string;
  alias?: string;
}

interface OpenAIApiKeyEntry {
  "api-key": string;
  "proxy-url"?: string;
}

interface ClaudeApiKeyEntry {
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  models?: ModelEntry[];
}

interface GeminiApiKeyEntry {
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  headers?: Record<string, string>;
  models?: ModelEntry[];
}

interface CodexApiKeyEntry {
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  models?: ModelEntry[];
}

interface OpenAIProviderData {
  name: string;
  "base-url": string;
  prefix?: string;
  "api-key-entries": OpenAIApiKeyEntry[];
  models?: ModelEntry[];
}

interface CustomProviderFormProps {
  onClose: () => void;
  onSaved: () => void;
  editProvider?: OpenAIProviderData;
  editClaudeProvider?: ClaudeApiKeyEntry[];
  editGeminiProvider?: GeminiApiKeyEntry[];
  editCodexProvider?: CodexApiKeyEntry[];
  initialProtocol?: ProtocolType;
}

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
  const [error, setError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<ProtocolType>(
    editCodexProvider
      ? "codex"
      : editGeminiProvider
        ? "gemini"
        : editClaudeProvider
          ? "claude"
          : editProvider
            ? "openai"
            : initialProtocol,
  );

  const [name, setName] = useState(editProvider?.name || "");
  const [baseUrl, setBaseUrl] = useState(editProvider?.["base-url"] || "");
  const [openaiPrefix, setOpenaiPrefix] = useState(editProvider?.prefix || "");
  const [openaiApiKeys, setOpenaiApiKeys] = useState<OpenAIApiKeyEntry[]>(
    editProvider?.["api-key-entries"] || [{ "api-key": "" }],
  );
  const [openaiModels, setOpenaiModels] = useState<ModelEntry[]>(
    editProvider?.models || [],
  );

  const [claudeEntry, setClaudeEntry] = useState<ClaudeApiKeyEntry>(
    editClaudeProvider?.[0] || {
      "api-key": "",
      "base-url": "https://api.anthropic.com",
    },
  );

  const [geminiEntry, setGeminiEntry] = useState<GeminiApiKeyEntry>(
    editGeminiProvider?.[0] || {
      "api-key": "",
      "base-url": "https://generativelanguage.googleapis.com",
    },
  );

  const [codexEntry, setCodexEntry] = useState<CodexApiKeyEntry>(
    editCodexProvider?.[0] || { "api-key": "" },
  );

  const isEditingOpenai = !!editProvider;
  const isEditingClaude = !!editClaudeProvider;
  const isEditingGemini = !!editGeminiProvider;
  const isEditingCodex = !!editCodexProvider;
  const isEditing =
    isEditingOpenai || isEditingClaude || isEditingGemini || isEditingCodex;

  const addOpenaiApiKey = () => {
    setOpenaiApiKeys([...openaiApiKeys, { "api-key": "" }]);
  };

  const updateOpenaiApiKey = (
    index: number,
    field: keyof OpenAIApiKeyEntry,
    value: string,
  ) => {
    const newKeys = [...openaiApiKeys];
    newKeys[index] = { ...newKeys[index], [field]: value || undefined };
    setOpenaiApiKeys(newKeys);
  };

  const removeOpenaiApiKey = (index: number) => {
    if (openaiApiKeys.length > 1) {
      setOpenaiApiKeys(openaiApiKeys.filter((_, i) => i !== index));
    }
  };

  const addOpenaiModel = () => {
    setOpenaiModels([...openaiModels, { name: "" }]);
  };

  const updateOpenaiModel = (
    index: number,
    field: keyof ModelEntry,
    value: string,
  ) => {
    const newModels = [...openaiModels];
    newModels[index] = { ...newModels[index], [field]: value || undefined };
    setOpenaiModels(newModels);
  };

  const removeOpenaiModel = (index: number) => {
    setOpenaiModels(openaiModels.filter((_, i) => i !== index));
  };

  const updateClaudeField = (
    field: keyof ClaudeApiKeyEntry,
    value: string | ModelEntry[] | undefined,
  ) => {
    if (field === "models") {
      setClaudeEntry({ ...claudeEntry, models: value as ModelEntry[] });
    } else {
      setClaudeEntry({ ...claudeEntry, [field]: value || undefined });
    }
  };

  const addClaudeModel = () => {
    const newModels = [...(claudeEntry.models || []), { name: "" }];
    updateClaudeField("models", newModels);
  };

  const updateClaudeModel = (
    modelIndex: number,
    field: keyof ModelEntry,
    value: string,
  ) => {
    const newModels = [...(claudeEntry.models || [])];
    newModels[modelIndex] = {
      ...newModels[modelIndex],
      [field]: value || undefined,
    };
    updateClaudeField("models", newModels);
  };

  const removeClaudeModel = (modelIndex: number) => {
    const newModels = (claudeEntry.models || []).filter(
      (_, i) => i !== modelIndex,
    );
    updateClaudeField("models", newModels.length > 0 ? newModels : undefined);
  };

  const updateGeminiField = (
    field: keyof GeminiApiKeyEntry,
    value: string | Record<string, string> | ModelEntry[] | undefined,
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
    } else {
      setGeminiEntry({ ...geminiEntry, [field]: value || undefined });
    }
  };

  const updateGeminiHeader = (
    oldKey: string,
    newKey: string,
    value: string,
  ) => {
    const headers = { ...(geminiEntry.headers || {}) };
    if (oldKey !== newKey) {
      delete headers[oldKey];
    }
    if (newKey.trim()) {
      headers[newKey] = value;
    }
    updateGeminiField(
      "headers",
      Object.keys(headers).length > 0 ? headers : undefined,
    );
  };

  const addGeminiHeader = () => {
    const headers = { ...(geminiEntry.headers || {}), "": "" };
    updateGeminiField("headers", headers);
  };

  const removeGeminiHeader = (key: string) => {
    const headers = { ...(geminiEntry.headers || {}) };
    delete headers[key];
    updateGeminiField(
      "headers",
      Object.keys(headers).length > 0 ? headers : undefined,
    );
  };

  const addGeminiModel = () => {
    const newModels = [...(geminiEntry.models || []), { name: "" }];
    updateGeminiField("models", newModels);
  };

  const updateGeminiModel = (
    modelIndex: number,
    field: keyof ModelEntry,
    value: string,
  ) => {
    const newModels = [...(geminiEntry.models || [])];
    newModels[modelIndex] = {
      ...newModels[modelIndex],
      [field]: value || undefined,
    };
    updateGeminiField("models", newModels);
  };

  const removeGeminiModel = (modelIndex: number) => {
    const newModels = (geminiEntry.models || []).filter(
      (_, i) => i !== modelIndex,
    );
    updateGeminiField("models", newModels.length > 0 ? newModels : undefined);
  };

  const updateCodexField = (
    field: keyof CodexApiKeyEntry,
    value: string | ModelEntry[] | undefined,
  ) => {
    if (field === "models") {
      setCodexEntry({
        ...codexEntry,
        models: value as ModelEntry[] | undefined,
      });
    } else {
      setCodexEntry({ ...codexEntry, [field]: value || undefined });
    }
  };

  const addCodexModel = () => {
    const newModels = [...(codexEntry.models || []), { name: "" }];
    updateCodexField("models", newModels);
  };

  const updateCodexModel = (
    modelIndex: number,
    field: keyof ModelEntry,
    value: string,
  ) => {
    const newModels = [...(codexEntry.models || [])];
    newModels[modelIndex] = {
      ...newModels[modelIndex],
      [field]: value || undefined,
    };
    updateCodexField("models", newModels);
  };

  const removeCodexModel = (modelIndex: number) => {
    const newModels = (codexEntry.models || []).filter(
      (_, i) => i !== modelIndex,
    );
    updateCodexField("models", newModels.length > 0 ? newModels : undefined);
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

      setIsLoading(true);

      const providerData: OpenAIProviderData = {
        name: name.trim(),
        "base-url": baseUrl.trim(),
        ...(openaiPrefix.trim() ? { prefix: openaiPrefix.trim() } : {}),
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
          result = await window.electronAPI?.openaiCompat.update(
            editProvider.name,
            providerData,
          );
        } else {
          result = await window.electronAPI?.openaiCompat.add(providerData);
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

      setIsLoading(true);

      const cleaned = {
        "api-key": claudeEntry["api-key"].trim(),
        "base-url":
          claudeEntry["base-url"]?.trim() || "https://api.anthropic.com",
        ...(claudeEntry["proxy-url"]?.trim()
          ? { "proxy-url": claudeEntry["proxy-url"].trim() }
          : {}),
        ...(claudeEntry.prefix?.trim()
          ? { prefix: claudeEntry.prefix.trim() }
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
        const result = await window.electronAPI?.claudeCompat?.save([cleaned]);
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

      setIsLoading(true);

      const cleaned = {
        "api-key": geminiEntry["api-key"].trim(),
        ...(geminiEntry["base-url"]?.trim()
          ? { "base-url": geminiEntry["base-url"].trim() }
          : {}),
        ...(geminiEntry["proxy-url"]?.trim()
          ? { "proxy-url": geminiEntry["proxy-url"].trim() }
          : {}),
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
        const result = await window.electronAPI?.geminiCompat?.save([cleaned]);
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

      setIsLoading(true);

      const cleaned = {
        "api-key": codexEntry["api-key"].trim(),
        ...(codexEntry["base-url"]?.trim()
          ? { "base-url": codexEntry["base-url"].trim() }
          : {}),
        ...(codexEntry["proxy-url"]?.trim()
          ? { "proxy-url": codexEntry["proxy-url"].trim() }
          : {}),
        ...(codexEntry.prefix?.trim()
          ? { prefix: codexEntry.prefix.trim() }
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
        const result = await window.electronAPI?.codexCompat?.save([cleaned]);
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

  const ModelMappingRow = ({
    model,
    onNameChange,
    onAliasChange,
    onRemove,
    accentColor = "var(--accent-primary)",
  }: {
    model: ModelEntry;
    onNameChange: (val: string) => void;
    onAliasChange: (val: string) => void;
    onRemove: () => void;
    accentColor?: string;
  }) => (
    <div className="flex items-center gap-3 p-3 hover:bg-[var(--bg-primary)]/40 transition-all group">
      <div className="flex-1 relative">
        <input
          type="text"
          value={model.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t.providers.customModelNamePlaceholder}
          className="glass-input w-full bg-[var(--bg-deep)] border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/50"
        />
      </div>
      <div className="flex-none opacity-20 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4 text-[var(--text-primary)]" />
      </div>
      <div className="flex-1 relative">
        <input
          type="text"
          value={model.alias || ""}
          onChange={(e) => onAliasChange(e.target.value)}
          placeholder={t.providers.customModelAliasPlaceholder}
          className="glass-input w-full bg-[var(--bg-deep)] border-[var(--glass-border)] font-bold text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/50"
          style={{ color: accentColor }}
        />
      </div>
      <button
        onClick={onRemove}
        className="p-2 text-red-500/40 hover:text-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      />

      <div className="relative w-full max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden animate-scale-in shadow-[0_0_60px_-15px_rgba(0,0,0,0.3)] border border-[var(--glass-border)] rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] z-0" />
        <div className="absolute inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-2xl z-0" />

        <div className="relative z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white shadow-lg">
              <Zap className="w-6 h-6 fill-white/20" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {isEditing
                  ? t.providers.customEdit
                  : t.providers.customProvider}
              </h2>
              <p className="text-xs text-[var(--text-primary)]/80 mt-0.5 font-bold">
                {t.providers.customProviderDesc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {!isEditing && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                <Box className="w-3.5 h-3.5" />
                {t.providers.customProtocol}
              </label>
              <div className="relative grid grid-cols-4 gap-1 p-1.5 bg-[var(--bg-deep)] rounded-2xl border border-[var(--glass-border)] shadow-inner">
                <div
                  className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] shadow-lg shadow-blue-500/20 transition-all duration-300 ease-out"
                  style={{
                    width: "calc(25% - 6px)",
                    left:
                      protocol === "openai"
                        ? "6px"
                        : protocol === "claude"
                          ? "calc(25% + 2px)"
                          : protocol === "gemini"
                            ? "calc(50% + 2px)"
                            : "calc(75% - 2px)",
                  }}
                />
                <button
                  onClick={() => setProtocol("openai")}
                  className={`relative z-10 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    protocol === "openai"
                      ? "text-white"
                      : "text-[var(--text-primary)]/70 hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span>OpenAI</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-all duration-300 ${
                      protocol === "openai"
                        ? "bg-black/20 text-white"
                        : "bg-[var(--bg-primary)]/50"
                    }`}
                  >
                    {t.providers.customCompatible}
                  </span>
                </button>
                <button
                  onClick={() => setProtocol("claude")}
                  className={`relative z-10 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    protocol === "claude"
                      ? "text-white"
                      : "text-[var(--text-primary)]/70 hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span>Claude</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-all duration-300 ${
                      protocol === "claude"
                        ? "bg-black/20 text-white"
                        : "bg-[var(--bg-primary)]/50"
                    }`}
                  >
                    {t.providers.customCompatible}
                  </span>
                </button>
                <button
                  onClick={() => setProtocol("gemini")}
                  className={`relative z-10 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    protocol === "gemini"
                      ? "text-white"
                      : "text-[var(--text-primary)]/70 hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span>Gemini</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-all duration-300 ${
                      protocol === "gemini"
                        ? "bg-black/20 text-white"
                        : "bg-[var(--bg-primary)]/50"
                    }`}
                  >
                    {t.providers.customCompatible}
                  </span>
                </button>
                <button
                  onClick={() => setProtocol("codex")}
                  className={`relative z-10 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    protocol === "codex"
                      ? "text-white"
                      : "text-[var(--text-primary)]/70 hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span>Codex</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-all duration-300 ${
                      protocol === "codex"
                        ? "bg-black/20 text-white"
                        : "bg-[var(--bg-primary)]/50"
                    }`}
                  >
                    {t.providers.customCompatible}
                  </span>
                </button>
              </div>
            </div>
          )}

          <div key={protocol} className="space-y-8 animate-slide-fade-in">
            {protocol === "openai" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                      {t.providers.customProviderName} *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.providers.customProviderNamePlaceholder}
                      className="glass-input w-full bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/50 transition-all"
                      disabled={isEditingOpenai}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                      <Globe className="w-3.5 h-3.5" />
                      {t.providers.customBaseUrl} *
                    </label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder={t.providers.customBaseUrlPlaceholder}
                      className="glass-input w-full font-mono text-sm bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Box className="w-3.5 h-3.5" />
                    {t.providers.customPrefix} ({t.providers.optional})
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={openaiPrefix}
                      onChange={(e) => setOpenaiPrefix(e.target.value)}
                      placeholder={t.providers.customPrefixPlaceholder}
                      className="glass-input w-full font-mono text-sm bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/50 transition-all"
                    />
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
                      {t.providers.customPrefixHint}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Key className="w-3.5 h-3.5" />
                    {t.providers.customApiKeys} *
                  </label>
                  <div className="space-y-3">
                    {openaiApiKeys.map((key, index) => (
                      <div
                        key={index}
                        className="group p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--glass-border)] hover:border-[var(--accent-primary)]/30 transition-all space-y-3 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => removeOpenaiApiKey(index)}
                            disabled={openaiApiKeys.length <= 1}
                            className="p-1.5 text-red-500 hover:scale-110 transition-all disabled:hidden"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-col gap-3">
                          <input
                            type="password"
                            value={key["api-key"]}
                            onChange={(e) =>
                              updateOpenaiApiKey(
                                index,
                                "api-key",
                                e.target.value,
                              )
                            }
                            placeholder={t.providers.customApiKeyPlaceholder}
                            className="glass-input w-full font-mono text-sm border border-white/10 bg-[var(--bg-deep)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                          />
                          <div className="flex items-center gap-2 bg-[var(--bg-deep)]/60 rounded-xl px-3 py-1.5 border border-white/10">
                            <Globe className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                            <input
                              type="text"
                              value={key["proxy-url"] || ""}
                              onChange={(e) =>
                                updateOpenaiApiKey(
                                  index,
                                  "proxy-url",
                                  e.target.value,
                                )
                              }
                              placeholder={
                                t.providers.customProxyUrlPlaceholder
                              }
                              className="bg-transparent border-none outline-none flex-1 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addOpenaiApiKey}
                      className="w-full py-3 border-2 border-dashed border-[var(--glass-border)] rounded-2xl text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/60 hover:bg-[var(--accent-primary)]/25 hover:border-solid transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold active:scale-[0.98] group shadow-sm hover:shadow-[0_0_15px_rgba(var(--accent-primary-rgb),0.1)]"
                    >
                      <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                      {t.providers.customAddApiKey}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Box className="w-3.5 h-3.5" />
                    {t.providers.customModels}
                  </label>
                  <div className="bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--glass-border)] overflow-hidden shadow-inner">
                    <div className="divide-y divide-[var(--glass-border)]">
                      {openaiModels.map((model, index) => (
                        <ModelMappingRow
                          key={index}
                          model={model}
                          onNameChange={(val) =>
                            updateOpenaiModel(index, "name", val)
                          }
                          onAliasChange={(val) =>
                            updateOpenaiModel(index, "alias", val)
                          }
                          onRemove={() => removeOpenaiModel(index)}
                        />
                      ))}
                    </div>
                    <button
                      onClick={addOpenaiModel}
                      className="w-full py-3 bg-[var(--bg-primary)]/20 hover:bg-[var(--accent-primary)]/25 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold border-t border-[var(--glass-border)] active:scale-[0.98] group shadow-inner hover:shadow-lg"
                    >
                      <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                      {t.providers.customAddModel}
                    </button>
                  </div>
                </div>
              </>
            ) : protocol === "claude" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Key className="w-3.5 h-3.5" />
                    API Key *
                  </label>
                  <input
                    type="password"
                    value={claudeEntry["api-key"]}
                    onChange={(e) =>
                      updateClaudeField("api-key", e.target.value)
                    }
                    placeholder={t.providers.customApiKeyPlaceholder}
                    className="glass-input w-full font-mono text-sm bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                      <Globe className="w-3.5 h-3.5" />
                      {t.providers.customBaseUrl} ({t.providers.optional})
                    </label>
                    <input
                      type="text"
                      value={claudeEntry["base-url"] || ""}
                      onChange={(e) =>
                        updateClaudeField("base-url", e.target.value)
                      }
                      placeholder="https://api.anthropic.com"
                      className="glass-input w-full font-mono text-xs bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                      {t.providers.customProxyUrl} ({t.providers.optional})
                    </label>
                    <input
                      type="text"
                      value={claudeEntry["proxy-url"] || ""}
                      onChange={(e) =>
                        updateClaudeField("proxy-url", e.target.value)
                      }
                      placeholder={t.providers.customProxyUrlPlaceholder}
                      className="glass-input w-full font-mono text-xs bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Box className="w-3.5 h-3.5" />
                    {t.providers.customPrefix} ({t.providers.optional})
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={claudeEntry.prefix || ""}
                      onChange={(e) =>
                        updateClaudeField("prefix", e.target.value)
                      }
                      placeholder={t.providers.customPrefixPlaceholder}
                      className="glass-input w-full font-mono text-sm bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/50 transition-all"
                    />
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
                      {t.providers.customPrefixHint}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Box className="w-3.5 h-3.5" />
                    {t.providers.customModels} ({t.providers.optional})
                  </label>
                  <div className="bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--glass-border)] divide-y divide-[var(--glass-border)] overflow-hidden shadow-inner">
                    {(claudeEntry.models || []).map((model, modelIndex) => (
                      <ModelMappingRow
                        key={modelIndex}
                        model={model}
                        onNameChange={(val) =>
                          updateClaudeModel(modelIndex, "name", val)
                        }
                        onAliasChange={(val) =>
                          updateClaudeModel(modelIndex, "alias", val)
                        }
                        onRemove={() => removeClaudeModel(modelIndex)}
                        accentColor="var(--accent-primary)"
                      />
                    ))}
                    <button
                      onClick={addClaudeModel}
                      className="w-full py-3 bg-[var(--bg-primary)]/20 hover:bg-[var(--accent-primary)]/25 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold border-t border-[var(--glass-border)] active:scale-[0.98] group shadow-inner hover:shadow-lg"
                    >
                      <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                      {t.providers.customAddModel}
                    </button>
                  </div>
                </div>
              </div>
            ) : protocol === "gemini" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Key className="w-3.5 h-3.5" />
                    API Key *
                  </label>
                  <input
                    type="password"
                    value={geminiEntry["api-key"]}
                    onChange={(e) =>
                      updateGeminiField("api-key", e.target.value)
                    }
                    placeholder={t.providers.customApiKeyPlaceholder}
                    className="glass-input w-full font-mono text-sm bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                      <Globe className="w-3.5 h-3.5" />
                      {t.providers.customBaseUrl} ({t.providers.optional})
                    </label>
                    <input
                      type="text"
                      value={geminiEntry["base-url"] || ""}
                      onChange={(e) =>
                        updateGeminiField("base-url", e.target.value)
                      }
                      placeholder="https://generativelanguage.googleapis.com"
                      className="glass-input w-full font-mono text-xs bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                      {t.providers.customProxyUrl} ({t.providers.optional})
                    </label>
                    <input
                      type="text"
                      value={geminiEntry["proxy-url"] || ""}
                      onChange={(e) =>
                        updateGeminiField("proxy-url", e.target.value)
                      }
                      placeholder={t.providers.customProxyUrlPlaceholder}
                      className="glass-input w-full font-mono text-xs bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Box className="w-3.5 h-3.5" />
                    {t.providers.customPrefix} ({t.providers.optional})
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={geminiEntry.prefix || ""}
                      onChange={(e) =>
                        updateGeminiField("prefix", e.target.value)
                      }
                      placeholder={t.providers.customPrefixPlaceholder}
                      className="glass-input w-full font-mono text-sm bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/50 transition-all"
                    />
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
                      {t.providers.customPrefixHint}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Box className="w-3.5 h-3.5" />
                    {t.providers.customHeaders} ({t.providers.optional})
                  </label>
                  <div className="bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--glass-border)] divide-y divide-[var(--glass-border)] overflow-hidden shadow-inner">
                    {Object.entries(geminiEntry.headers || {}).map(
                      ([key, value], headerIndex) => (
                        <div
                          key={headerIndex}
                          className="flex items-center gap-3 p-3 hover:bg-[var(--bg-primary)]/40 transition-all group"
                        >
                          <input
                            type="text"
                            value={key}
                            onChange={(e) =>
                              updateGeminiHeader(key, e.target.value, value)
                            }
                            placeholder={t.providers.customHeaderKeyPlaceholder}
                            className="flex-1 glass-input bg-[var(--bg-deep)] border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm"
                          />
                          <ArrowRight className="w-4 h-4 text-[var(--text-primary)]/20 group-hover:text-[var(--text-primary)]/50" />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                              updateGeminiHeader(key, key, e.target.value)
                            }
                            placeholder={
                              t.providers.customHeaderValuePlaceholder
                            }
                            className="flex-1 glass-input bg-[var(--bg-deep)] border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm"
                          />
                          <button
                            onClick={() => removeGeminiHeader(key)}
                            className="p-2 text-red-500/40 hover:text-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ),
                    )}
                    <button
                      onClick={addGeminiHeader}
                      className="w-full py-3 bg-[var(--bg-primary)]/20 hover:bg-[var(--accent-primary)]/25 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold border-t border-[var(--glass-border)] active:scale-[0.98] group shadow-inner hover:shadow-lg"
                    >
                      <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                      {t.providers.customAddHeader}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Box className="w-3.5 h-3.5" />
                    {t.providers.customModels} ({t.providers.optional})
                  </label>
                  <div className="bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--glass-border)] divide-y divide-[var(--glass-border)] overflow-hidden shadow-inner">
                    {(geminiEntry.models || []).map((model, modelIndex) => (
                      <ModelMappingRow
                        key={modelIndex}
                        model={model}
                        onNameChange={(val) =>
                          updateGeminiModel(modelIndex, "name", val)
                        }
                        onAliasChange={(val) =>
                          updateGeminiModel(modelIndex, "alias", val)
                        }
                        onRemove={() => removeGeminiModel(modelIndex)}
                        accentColor="var(--accent-primary)"
                      />
                    ))}
                    <button
                      onClick={addGeminiModel}
                      className="w-full py-3 bg-[var(--bg-primary)]/20 hover:bg-[var(--accent-primary)]/25 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold border-t border-[var(--glass-border)] active:scale-[0.98] group shadow-inner hover:shadow-lg"
                    >
                      <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                      {t.providers.customAddModel}
                    </button>
                  </div>
                </div>
              </div>
            ) : protocol === "codex" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Key className="w-3.5 h-3.5" />
                    API Key *
                  </label>
                  <input
                    type="password"
                    value={codexEntry["api-key"]}
                    onChange={(e) =>
                      updateCodexField("api-key", e.target.value)
                    }
                    placeholder={t.providers.customApiKeyPlaceholder}
                    className="glass-input w-full font-mono text-sm bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                      <Globe className="w-3.5 h-3.5" />
                      {t.providers.customBaseUrl} ({t.providers.optional})
                    </label>
                    <input
                      type="text"
                      value={codexEntry["base-url"] || ""}
                      onChange={(e) =>
                        updateCodexField("base-url", e.target.value)
                      }
                      placeholder="https://api.example.com"
                      className="glass-input w-full font-mono text-xs bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                      {t.providers.customProxyUrl} ({t.providers.optional})
                    </label>
                    <input
                      type="text"
                      value={codexEntry["proxy-url"] || ""}
                      onChange={(e) =>
                        updateCodexField("proxy-url", e.target.value)
                      }
                      placeholder={t.providers.customProxyUrlPlaceholder}
                      className="glass-input w-full font-mono text-xs bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Box className="w-3.5 h-3.5" />
                    {t.providers.customPrefix} ({t.providers.optional})
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={codexEntry.prefix || ""}
                      onChange={(e) =>
                        updateCodexField("prefix", e.target.value)
                      }
                      placeholder={t.providers.customPrefixPlaceholder}
                      className="glass-input w-full font-mono text-sm bg-[var(--bg-deep)] border border-white/10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/50 transition-all"
                    />
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
                      {t.providers.customPrefixHint}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
                    <Box className="w-3.5 h-3.5" />
                    {t.providers.customModels} ({t.providers.optional})
                  </label>
                  <div className="bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--glass-border)] divide-y divide-[var(--glass-border)] overflow-hidden shadow-inner">
                    {(codexEntry.models || []).map((model, modelIndex) => (
                      <ModelMappingRow
                        key={modelIndex}
                        model={model}
                        onNameChange={(val) =>
                          updateCodexModel(modelIndex, "name", val)
                        }
                        onAliasChange={(val) =>
                          updateCodexModel(modelIndex, "alias", val)
                        }
                        onRemove={() => removeCodexModel(modelIndex)}
                        accentColor="var(--accent-primary)"
                      />
                    ))}
                    <button
                      onClick={addCodexModel}
                      className="w-full py-3 bg-[var(--bg-primary)]/20 hover:bg-[var(--accent-primary)]/25 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold border-t border-[var(--glass-border)] active:scale-[0.98] group shadow-inner hover:shadow-lg"
                    >
                      <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                      {t.providers.customAddModel}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 p-6 border-t border-[var(--glass-border)] bg-[var(--bg-secondary)]/30 flex flex-col gap-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-100 text-xs flex items-center gap-3 animate-shake font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-primary)]/40 text-[var(--text-primary)] transition-all active:scale-95 border border-[var(--glass-border)]"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-[2] py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-xl active:scale-[0.98] bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-blue-500/20"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.providers.customSaving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t.providers.customSave}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
}
