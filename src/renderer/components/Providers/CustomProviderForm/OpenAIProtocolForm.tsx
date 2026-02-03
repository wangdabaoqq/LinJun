import { memo } from "react";
import { Globe, Box, Key } from "lucide-react";
import { useTranslations } from "../../../stores/settings";
import { OpenAIApiKeyEntry, ModelEntry } from "./types";
import { ApiKeyEntryList } from "./ApiKeyEntryList";
import { ModelEntryList } from "./ModelEntryList";

interface OpenAIProtocolFormProps {
  name: string;
  baseUrl: string;
  prefix: string;
  apiKeys: OpenAIApiKeyEntry[];
  models: ModelEntry[];
  isEditing: boolean;
  onNameChange: (val: string) => void;
  onBaseUrlChange: (val: string) => void;
  onPrefixChange: (val: string) => void;
  onApiKeysChange: (val: OpenAIApiKeyEntry[]) => void;
  onModelsChange: (val: ModelEntry[]) => void;
}

export const OpenAIProtocolForm = memo(function OpenAIProtocolForm({
  name,
  baseUrl,
  prefix,
  apiKeys,
  models,
  isEditing,
  onNameChange,
  onBaseUrlChange,
  onPrefixChange,
  onApiKeysChange,
  onModelsChange,
}: OpenAIProtocolFormProps) {
  const t = useTranslations();

  const updateApiKey = (
    index: number,
    field: keyof OpenAIApiKeyEntry,
    value: string,
  ) => {
    const newKeys = [...apiKeys];
    newKeys[index] = { ...newKeys[index], [field]: value || undefined };
    onApiKeysChange(newKeys);
  };

  const addApiKey = () => {
    onApiKeysChange([...apiKeys, { "api-key": "" }]);
  };

  const removeApiKey = (index: number) => {
    if (apiKeys.length > 1) {
      onApiKeysChange(apiKeys.filter((_, i) => i !== index));
    }
  };

  const updateModel = (
    index: number,
    field: keyof ModelEntry,
    value: string,
  ) => {
    const newModels = [...models];
    newModels[index] = { ...newModels[index], [field]: value || undefined };
    onModelsChange(newModels);
  };

  const addModel = () => {
    onModelsChange([...models, { name: "" }]);
  };

  const removeModel = (index: number) => {
    onModelsChange(models.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
            {t.providers.customProviderName} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t.providers.customProviderNamePlaceholder}
            className="glass-input w-full bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50 transition-all"
            disabled={isEditing}
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
            onChange={(e) => onBaseUrlChange(e.target.value)}
            placeholder={t.providers.customBaseUrlPlaceholder}
            className="glass-input w-full font-mono text-sm bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50 transition-all"
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
            value={prefix}
            onChange={(e) => onPrefixChange(e.target.value)}
            placeholder={t.providers.customPrefixPlaceholder}
            className="glass-input w-full font-mono text-sm bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50 transition-all"
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
        <ApiKeyEntryList
          apiKeys={apiKeys}
          onUpdate={updateApiKey}
          onAdd={addApiKey}
          onRemove={removeApiKey}
        />
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
          <Box className="w-3.5 h-3.5" />
          {t.providers.customModels}
        </label>
        <ModelEntryList
          models={models}
          onUpdate={updateModel}
          onAdd={addModel}
          onRemove={removeModel}
        />
      </div>
    </>
  );
});
