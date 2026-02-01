import { useState } from "react";
import { useTranslations } from "../../../stores/settings";
import { Zap, X, Box, Save } from "lucide-react";
import {
  CustomProviderFormProps,
  ProtocolType,
  OpenAIApiKeyEntry,
  ModelEntry,
  ClaudeApiKeyEntry,
  GeminiApiKeyEntry,
  CodexApiKeyEntry,
  OpenAIProviderData,
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
                {["openai", "claude", "gemini", "codex"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setProtocol(p as ProtocolType)}
                    className={`relative z-10 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      protocol === p
                        ? "text-white"
                        : "text-[var(--text-primary)]/70 hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span>
                      {p.charAt(0).toUpperCase() +
                        p.slice(1).replace("openai", "OpenAI")}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full transition-all duration-300 ${
                        protocol === p
                          ? "bg-black/20 text-white"
                          : "bg-[var(--bg-primary)]/50"
                      }`}
                    >
                      {t.providers.customCompatible}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div key={protocol} className="space-y-8 animate-slide-fade-in">
            {protocol === "openai" ? (
              <OpenAIProtocolForm
                name={name}
                baseUrl={baseUrl}
                prefix={openaiPrefix}
                apiKeys={openaiApiKeys}
                models={openaiModels}
                isEditing={isEditingOpenai}
                onNameChange={setName}
                onBaseUrlChange={setBaseUrl}
                onPrefixChange={setOpenaiPrefix}
                onApiKeysChange={setOpenaiApiKeys}
                onModelsChange={setOpenaiModels}
              />
            ) : protocol === "claude" ? (
              <ClaudeProtocolForm
                entry={claudeEntry}
                onUpdate={updateClaudeField}
              />
            ) : protocol === "gemini" ? (
              <GeminiProtocolForm
                entry={geminiEntry}
                onUpdate={updateGeminiField}
              />
            ) : protocol === "codex" ? (
              <CodexProtocolForm
                entry={codexEntry}
                onUpdate={updateCodexField}
              />
            ) : null}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-shake">
              {error}
            </div>
          )}
        </div>

        <div className="relative z-10 p-6 border-t border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-xl flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50 transition-all border border-transparent hover:border-[var(--glass-border)]"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
