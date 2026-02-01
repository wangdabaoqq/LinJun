import { memo } from "react";
import { Globe, Box, Key, ArrowRight, Trash2, Plus } from "lucide-react";
import { useTranslations } from "../../../stores/settings";
import { GeminiApiKeyEntry, ModelEntry } from "./types";
import { ModelEntryList } from "./ModelEntryList";

interface GeminiProtocolFormProps {
  entry: GeminiApiKeyEntry;
  onUpdate: (
    field: keyof GeminiApiKeyEntry,
    value: string | Record<string, string> | ModelEntry[] | undefined,
  ) => void;
}

export const GeminiProtocolForm = memo(function GeminiProtocolForm({
  entry,
  onUpdate,
}: GeminiProtocolFormProps) {
  const t = useTranslations();

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const headers = { ...(entry.headers || {}) };
    if (oldKey !== newKey) {
      delete headers[oldKey];
    }
    if (newKey.trim()) {
      headers[newKey] = value;
    }
    onUpdate("headers", Object.keys(headers).length > 0 ? headers : undefined);
  };

  const addHeader = () => {
    const headers = { ...(entry.headers || {}), "": "" };
    onUpdate("headers", headers);
  };

  const removeHeader = (key: string) => {
    const headers = { ...(entry.headers || {}) };
    delete headers[key];
    onUpdate("headers", Object.keys(headers).length > 0 ? headers : undefined);
  };

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
          <Key className="w-3.5 h-3.5" />
          API Key *
        </label>
        <input
          type="password"
          value={entry["api-key"]}
          onChange={(e) => onUpdate("api-key", e.target.value)}
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
            value={entry["base-url"] || ""}
            onChange={(e) => onUpdate("base-url", e.target.value)}
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
            value={entry["proxy-url"] || ""}
            onChange={(e) => onUpdate("proxy-url", e.target.value)}
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
            value={entry.prefix || ""}
            onChange={(e) => onUpdate("prefix", e.target.value)}
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
          {Object.entries(entry.headers || {}).map(
            ([key, value], headerIndex) => (
              <div
                key={headerIndex}
                className="flex items-center gap-3 p-3 hover:bg-[var(--bg-primary)]/40 transition-all group"
              >
                <input
                  type="text"
                  value={key}
                  onChange={(e) => updateHeader(key, e.target.value, value)}
                  placeholder={t.providers.customHeaderKeyPlaceholder}
                  className="flex-1 glass-input bg-[var(--bg-deep)] border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm"
                />
                <ArrowRight className="w-4 h-4 text-[var(--text-primary)]/20 group-hover:text-[var(--text-primary)]/50" />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateHeader(key, key, e.target.value)}
                  placeholder={t.providers.customHeaderValuePlaceholder}
                  className="flex-1 glass-input bg-[var(--bg-deep)] border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm"
                />
                <button
                  onClick={() => removeHeader(key)}
                  className="p-2 text-red-500/40 hover:text-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          )}
          <button
            onClick={addHeader}
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
