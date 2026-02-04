import { useState } from "react";
import { Zap, X, Box, Save } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);

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

      const providerData: OpenAICompatProvider = {
        name: name.trim(),
        "base-url": baseUrl.trim(),
        ...(openaiPrefix.trim() ? { prefix: openaiPrefix.trim() } : {}),
        ...(systemAccessToken.trim()
          ? { "system-access-token": systemAccessToken.trim() }
          : {}),
        ...(newApiUser.trim() ? { "new-api-user": newApiUser.trim() } : {}),
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

      setIsLoading(true);

      const cleaned = {
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
                isEditing={isEditingOpenai}
                onNameChange={setName}
                onBaseUrlChange={setBaseUrl}
                onPrefixChange={setOpenaiPrefix}
                onApiKeysChange={setOpenaiApiKeys}
                onModelsChange={setOpenaiModels}
                onSystemAccessTokenChange={setSystemAccessToken}
                onNewApiUserChange={setNewApiUser}
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
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-shake">
              {error}
            </div>
          )}
        </div>

        <div className="relative z-10 p-8 border-t border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01] backdrop-blur-2xl flex justify-end gap-4">
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
  );
}
