import { memo, useState } from "react";
import { Globe, Box, Key, Eye, EyeOff, Activity, Download } from "lucide-react";
import { useTranslations } from "../../../stores/settings";
import { OpenAIApiKeyEntry, ModelEntry } from "./types";
import { ApiKeyEntryList } from "./ApiKeyEntryList";
import { ModelEntryList } from "./ModelEntryList";
import { HeaderEntryList } from "./HeaderEntryList";

interface OpenAIProtocolFormProps {
  name: string;
  baseUrl: string;
  prefix: string;
  apiKeys: OpenAIApiKeyEntry[];
  models: ModelEntry[];
  systemAccessToken: string;
  newApiUser: string;
  enableUsageQuery: boolean;
  headers?: Record<string, string>;
  isFetchingModels?: boolean;
  isEditing: boolean;
  onNameChange: (val: string) => void;
  onBaseUrlChange: (val: string) => void;
  onPrefixChange: (val: string) => void;
  onApiKeysChange: (val: OpenAIApiKeyEntry[]) => void;
  onModelsChange: (val: ModelEntry[]) => void;
  onSystemAccessTokenChange: (val: string) => void;
  onNewApiUserChange: (val: string) => void;
  onEnableUsageQueryChange: (val: boolean) => void;
  onHeadersChange: (val: Record<string, string> | undefined) => void;
  onFetchModels: () => Promise<void>;
}

export const OpenAIProtocolForm = memo(function OpenAIProtocolForm({
  name,
  baseUrl,
  prefix,
  apiKeys,
  models,
  systemAccessToken,
  newApiUser,
  enableUsageQuery,
  headers,
  isFetchingModels,
  isEditing,
  onNameChange,
  onBaseUrlChange,
  onPrefixChange,
  onApiKeysChange,
  onModelsChange,
  onSystemAccessTokenChange,
  onNewApiUserChange,
  onEnableUsageQueryChange,
  onHeadersChange,
  onFetchModels,
}: OpenAIProtocolFormProps) {
  const t = useTranslations();
  const [showSystemToken, setShowSystemToken] = useState(false);

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

      <div className="space-y-2">
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

      <div className="p-4 rounded-xl bg-[var(--text-primary)]/[0.02] border border-[var(--glass-border)]">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
            <div>
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest">
                {t.providers.customEnableUsageQuery}
              </span>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {t.providers.customEnableUsageQueryTip}
              </p>
            </div>
          </div>
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${
              enableUsageQuery
                ? "bg-[var(--accent-primary)]"
                : "bg-[var(--text-primary)]/20"
            }`}
            onClick={() => onEnableUsageQueryChange(!enableUsageQuery)}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                enableUsageQuery ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </div>
        </label>
      </div>

      {enableUsageQuery && (
        <>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
              <Key className="w-3.5 h-3.5" />
              {t.providers.customSystemToken} *
            </label>
            <div className="relative">
              <input
                type={showSystemToken ? "text" : "password"}
                value={systemAccessToken}
                onChange={(e) => onSystemAccessTokenChange(e.target.value)}
                placeholder={t.providers.customSystemTokenPlaceholder}
                className="glass-input w-full font-mono text-sm bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSystemToken(!showSystemToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
              >
                {showSystemToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
              {t.providers.customSystemTokenTip}
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
              <Key className="w-3.5 h-3.5" />
              {t.providers.customNewApiUser} *
            </label>
            <input
              type="text"
              value={newApiUser}
              onChange={(e) => onNewApiUserChange(e.target.value)}
              placeholder={t.providers.customNewApiUserPlaceholder}
              className="glass-input w-full font-mono text-sm bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)]"
            />
          </div>
        </>
      )}

      <div className="space-y-4">
        <HeaderEntryList headers={headers} onChange={onHeadersChange} />

        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
          <Box className="w-3.5 h-3.5" />
          {t.providers.customModels}
        </label>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void onFetchModels()}
            disabled={isFetchingModels}
            className="px-3 py-2 rounded-xl border border-[var(--glass-border)] text-[11px] font-bold text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              {isFetchingModels ? (
                <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isFetchingModels
                ? t.providers.customFetchingModels
                : t.providers.customFetchModels}
            </span>
          </button>
        </div>
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
