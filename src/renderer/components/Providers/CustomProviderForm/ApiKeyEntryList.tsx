import { Trash2, Plus, Globe } from "lucide-react";
import { useTranslations } from "../../../stores/settings";
import { OpenAIApiKeyEntry } from "./types";

interface ApiKeyEntryListProps {
  apiKeys: OpenAIApiKeyEntry[];
  onUpdate: (
    index: number,
    field: keyof OpenAIApiKeyEntry,
    value: string,
  ) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function ApiKeyEntryList({
  apiKeys,
  onUpdate,
  onAdd,
  onRemove,
}: ApiKeyEntryListProps) {
  const t = useTranslations();

  return (
    <div className="space-y-3">
      {apiKeys.map((key, index) => (
        <div
          key={index}
          className="group p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--glass-border)] hover:border-[var(--accent-primary)]/30 transition-all space-y-3 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onRemove(index)}
              disabled={apiKeys.length <= 1}
              className="p-1.5 text-red-500 hover:scale-110 transition-all disabled:hidden"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="password"
              value={key["api-key"]}
              onChange={(e) => onUpdate(index, "api-key", e.target.value)}
              placeholder={t.providers.customApiKeyPlaceholder}
              className="glass-input w-full font-mono text-sm border border-white/10 bg-[var(--bg-deep)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            <div className="flex items-center gap-2 bg-[var(--bg-deep)]/60 rounded-xl px-3 py-1.5 border border-white/10">
              <Globe className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <input
                type="text"
                value={key["proxy-url"] || ""}
                onChange={(e) => onUpdate(index, "proxy-url", e.target.value)}
                placeholder={t.providers.customProxyUrlPlaceholder}
                className="bg-transparent border-none outline-none flex-1 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="w-full py-3 border-2 border-dashed border-[var(--glass-border)] rounded-2xl text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/60 hover:bg-[var(--accent-primary)]/25 hover:border-solid transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold active:scale-[0.98] group shadow-sm hover:shadow-[0_0_15px_rgba(var(--accent-primary-rgb),0.1)]"
      >
        <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
        {t.providers.customAddApiKey}
      </button>
    </div>
  );
}
