import { memo, useState } from "react";
import {
  Globe,
  Box,
  Key,
  Eye,
  EyeOff,
  User,
  Activity,
  Download,
} from "lucide-react";
import { useTranslations } from "../../../stores/settings";
import { ClaudeApiKeyEntry, ModelEntry } from "./types";
import { ModelEntryList } from "./ModelEntryList";
import { HeaderEntryList } from "./HeaderEntryList";

interface ClaudeProtocolFormProps {
  entry: ClaudeApiKeyEntry;
  isFetchingModels?: boolean;
  onFetchModels: () => Promise<void>;
  onUpdate: (
    field: keyof ClaudeApiKeyEntry,
    value: string | boolean | ModelEntry[] | Record<string, string> | undefined,
  ) => void;
}

export const ClaudeProtocolForm = memo(function ClaudeProtocolForm({
  entry,
  isFetchingModels,
  onFetchModels,
  onUpdate,
}: ClaudeProtocolFormProps) {
  const t = useTranslations();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSystemToken, setShowSystemToken] = useState(false);

  const updateModel = (
    modelIndex: number,
    field: keyof ModelEntry,
    value: string,
  ) => {
    const newModels = [...(entry.models || [])];
    newModels[modelIndex] = {
      ...newModels[modelIndex],
      [field]: value || undefined,
    };
    onUpdate("models", newModels);
  };

  const addModel = () => {
    const newModels = [...(entry.models || []), { name: "" }];
    onUpdate("models", newModels);
  };

  const removeModel = (modelIndex: number) => {
    const newModels = (entry.models || []).filter((_, i) => i !== modelIndex);
    onUpdate("models", newModels.length > 0 ? newModels : undefined);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
          {t.providers.customProviderName}
        </label>
        <input
          type="text"
          value={entry.name || ""}
          onChange={(e) => onUpdate("name", e.target.value)}
          placeholder={t.providers.customProviderNamePlaceholder}
          className="glass-input w-full bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)]"
        />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
          <Key className="w-3.5 h-3.5" />
          API Key *
        </label>
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            value={entry["api-key"]}
            onChange={(e) => onUpdate("api-key", e.target.value)}
            placeholder={t.providers.customApiKeyPlaceholder}
            className="glass-input w-full font-mono text-sm bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] pr-10"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
          >
            {showApiKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
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
              entry["enable-usage-query"]
                ? "bg-[var(--accent-primary)]"
                : "bg-[var(--text-primary)]/20"
            }`}
            onClick={() =>
              onUpdate("enable-usage-query", !entry["enable-usage-query"])
            }
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                entry["enable-usage-query"] ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </div>
        </label>
      </div>

      {entry["enable-usage-query"] && (
        <>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
              <Key className="w-3.5 h-3.5" />
              {t.providers.customSystemToken} *
            </label>
            <div className="relative">
              <input
                type={showSystemToken ? "text" : "password"}
                value={entry["system-access-token"] || ""}
                onChange={(e) =>
                  onUpdate("system-access-token", e.target.value)
                }
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
              <User className="w-3.5 h-3.5" />
              {t.providers.customNewApiUser} *
            </label>
            <input
              type="text"
              value={entry["new-api-user"] || ""}
              onChange={(e) => onUpdate("new-api-user", e.target.value)}
              placeholder={t.providers.customNewApiUserPlaceholder}
              className="glass-input w-full font-mono text-sm bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)]"
            />
          </div>
        </>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
            <Globe className="w-3.5 h-3.5" />
            {t.providers.customBaseUrl} *
          </label>
          <input
            type="text"
            value={entry["base-url"] || ""}
            onChange={(e) => onUpdate("base-url", e.target.value)}
            placeholder="https://api.anthropic.com"
            className="glass-input w-full font-mono text-xs bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)]"
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
            填写兼容 Claude API 的服务端点地址，不要以斜杠结尾
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
            {t.providers.customProxyUrl} ({t.providers.optional})
          </label>
          <input
            type="text"
            value={entry["proxy-url"] || ""}
            onChange={(e) => onUpdate("proxy-url", e.target.value)}
            placeholder={t.providers.customProxyUrlPlaceholder}
            className="glass-input w-full font-mono text-xs bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)]"
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
            value={entry.prefix || ""}
            onChange={(e) => onUpdate("prefix", e.target.value)}
            placeholder={t.providers.customPrefixPlaceholder}
            className="glass-input w-full font-mono text-sm bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50 transition-all"
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
            {t.providers.customPrefixHint}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <HeaderEntryList
          headers={entry.headers}
          onChange={(headers) => onUpdate("headers", headers)}
        />

        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
          <Box className="w-3.5 h-3.5" />
          {t.providers.customModels} ({t.providers.optional})
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
          models={entry.models || []}
          onUpdate={updateModel}
          onAdd={addModel}
          onRemove={removeModel}
          accentColor="var(--accent-primary)"
        />
      </div>
    </div>
  );
});
