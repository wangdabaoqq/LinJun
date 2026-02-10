import { memo } from "react";
import {
  Globe,
  Key,
  Plus,
  Trash2,
  Box,
  ArrowRight,
  Activity,
  ShieldCheck,
} from "lucide-react";

import { useTranslations } from "../../../stores/settings";
import {
  AmpcodeApiKeyMappingEntry,
  AmpcodeModelMappingEntry,
  AmpcodeProvider,
} from "./types";

interface AmpcodeProtocolFormProps {
  entry: AmpcodeProvider;
  onUpdate: (
    field: keyof AmpcodeProvider,
    value:
      | string
      | boolean
      | AmpcodeApiKeyMappingEntry[]
      | AmpcodeModelMappingEntry[]
      | undefined,
  ) => void;
}

export const AmpcodeProtocolForm = memo(function AmpcodeProtocolForm({
  entry,
  onUpdate,
}: AmpcodeProtocolFormProps) {
  const t = useTranslations();

  const upstreamMappings = entry["upstream-api-keys"] || [];
  const modelMappings = entry["model-mappings"] || [];

  const updateUpstreamMapping = (
    index: number,
    field: keyof AmpcodeApiKeyMappingEntry,
    value: string,
  ) => {
    const next = [...upstreamMappings];
    if (!next[index]) {
      return;
    }

    if (field === "api-keys") {
      next[index] = {
        ...next[index],
        "api-keys": value
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      };
    } else {
      next[index] = {
        ...next[index],
        "upstream-api-key": value,
      };
    }

    onUpdate("upstream-api-keys", next);
  };

  const addUpstreamMapping = () => {
    onUpdate("upstream-api-keys", [
      ...upstreamMappings,
      { "upstream-api-key": "", "api-keys": [] },
    ]);
  };

  const removeUpstreamMapping = (index: number) => {
    const next = upstreamMappings.filter((_, i) => i !== index);
    onUpdate("upstream-api-keys", next.length > 0 ? next : undefined);
  };

  const updateModelMapping = (
    index: number,
    field: keyof AmpcodeModelMappingEntry,
    value: string,
  ) => {
    const next = [...modelMappings];
    if (!next[index]) {
      return;
    }

    next[index] = {
      ...next[index],
      [field]: value,
    };

    onUpdate("model-mappings", next);
  };

  const addModelMapping = () => {
    onUpdate("model-mappings", [...modelMappings, { from: "", to: "" }]);
  };

  const removeModelMapping = (index: number) => {
    const next = modelMappings.filter((_, i) => i !== index);
    onUpdate("model-mappings", next.length > 0 ? next : undefined);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
            <Globe className="w-3.5 h-3.5" />
            {t.providers.customAmpcodeUpstreamUrl} *
          </label>
          <input
            type="text"
            value={entry["upstream-url"] || ""}
            onChange={(e) => onUpdate("upstream-url", e.target.value)}
            placeholder="https://ampcode.com"
            className="glass-input w-full font-mono text-sm bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
            <Key className="w-3.5 h-3.5" />
            {t.providers.customAmpcodeUpstreamApiKey} ({t.providers.optional})
          </label>
          <input
            type="text"
            value={entry["upstream-api-key"] || ""}
            onChange={(e) => onUpdate("upstream-api-key", e.target.value)}
            placeholder="amp_upstream_key"
            className="glass-input w-full font-mono text-sm bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[var(--text-primary)]/[0.02] border border-[var(--glass-border)] hover:bg-[var(--text-primary)]/[0.04] transition-colors">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest">
                  {t.providers.customAmpcodeRestrictLocalhost}
                </span>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Only allow management from localhost
                </p>
              </div>
            </div>
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                entry["restrict-management-to-localhost"]
                  ? "bg-[var(--accent-primary)]"
                  : "bg-[var(--text-primary)]/20"
              }`}
              onClick={() =>
                onUpdate(
                  "restrict-management-to-localhost",
                  !entry["restrict-management-to-localhost"],
                )
              }
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                  entry["restrict-management-to-localhost"]
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </div>
          </label>
        </div>

        <div className="p-4 rounded-xl bg-[var(--text-primary)]/[0.02] border border-[var(--glass-border)] hover:bg-[var(--text-primary)]/[0.04] transition-colors">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest">
                  {t.providers.customAmpcodeForceModelMappings}
                </span>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Enforce defined model mappings
                </p>
              </div>
            </div>
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                entry["force-model-mappings"]
                  ? "bg-[var(--accent-primary)]"
                  : "bg-[var(--text-primary)]/20"
              }`}
              onClick={() =>
                onUpdate("force-model-mappings", !entry["force-model-mappings"])
              }
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                  entry["force-model-mappings"]
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
          <Key className="w-3.5 h-3.5" />
          {t.providers.customAmpcodeUpstreamApiKeysMap}
        </label>
        <div className="bg-[var(--text-primary)]/[0.02] rounded-2xl border border-[var(--glass-border)] overflow-hidden shadow-inner">
          <div className="divide-y divide-[var(--glass-border)]">
            {upstreamMappings.map((item, index) => (
              <div
                key={`upstream-${index}`}
                className="p-4 hover:bg-[var(--text-primary)]/[0.03] transition-all group space-y-3"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Mapping #{index + 1}
                  </div>
                  <button
                    onClick={() => removeUpstreamMapping(index)}
                    className="text-xs text-red-500/40 hover:text-red-500 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t.common.delete}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide">
                      Upstream Key
                    </label>
                    <input
                      type="text"
                      value={item["upstream-api-key"]}
                      onChange={(e) =>
                        updateUpstreamMapping(
                          index,
                          "upstream-api-key",
                          e.target.value,
                        )
                      }
                      placeholder={
                        t.providers.customAmpcodeUpstreamApiKeyPlaceholder
                      }
                      className="glass-input w-full font-mono text-sm bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide">
                      Client Keys (One per line)
                    </label>
                    <textarea
                      value={(item["api-keys"] || []).join("\n")}
                      onChange={(e) =>
                        updateUpstreamMapping(index, "api-keys", e.target.value)
                      }
                      rows={3}
                      placeholder={
                        t.providers.customAmpcodeClientApiKeysPlaceholder
                      }
                      className="glass-input w-full font-mono text-xs bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50 resize-y min-h-[60px]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addUpstreamMapping}
            className="w-full py-3 bg-[var(--text-primary)]/[0.02] hover:bg-[var(--accent-primary)]/10 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold border-t border-[var(--glass-border)] active:scale-[0.98] group shadow-inner"
          >
            <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
            {t.providers.customAmpcodeAddUpstreamMap}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
          <Box className="w-3.5 h-3.5" />
          {t.providers.customAmpcodeModelMappings}
        </label>
        <div className="bg-[var(--text-primary)]/[0.02] rounded-2xl border border-[var(--glass-border)] overflow-hidden shadow-inner">
          <div className="divide-y divide-[var(--glass-border)]">
            {modelMappings.map((item, index) => (
              <div
                key={`mapping-${index}`}
                className="flex items-center gap-3 p-3 hover:bg-[var(--text-primary)]/[0.03] transition-all group"
              >
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={item.from}
                    onChange={(e) =>
                      updateModelMapping(index, "from", e.target.value)
                    }
                    placeholder={t.providers.customAmpcodeFromModelPlaceholder}
                    className="glass-input w-full bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50"
                  />
                </div>
                <div className="flex-none opacity-20 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-[var(--text-primary)]" />
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={item.to}
                    onChange={(e) =>
                      updateModelMapping(index, "to", e.target.value)
                    }
                    placeholder={t.providers.customAmpcodeToModelPlaceholder}
                    className="glass-input w-full bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50"
                  />
                </div>
                <button
                  onClick={() => removeModelMapping(index)}
                  className="p-2 text-red-500/40 hover:text-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addModelMapping}
            className="w-full py-3 bg-[var(--text-primary)]/[0.02] hover:bg-[var(--accent-primary)]/10 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold border-t border-[var(--glass-border)] active:scale-[0.98] group shadow-inner"
          >
            <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
            {t.providers.customAmpcodeAddModelMapping}
          </button>
        </div>
      </div>
    </div>
  );
});
