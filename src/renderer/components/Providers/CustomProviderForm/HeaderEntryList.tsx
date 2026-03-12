import { memo } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

import { useTranslations } from "../../../stores/settings";

interface HeaderEntryListProps {
  headers?: Record<string, string>;
  onChange: (headers: Record<string, string> | undefined) => void;
}

export const HeaderEntryList = memo(function HeaderEntryList({
  headers,
  onChange,
}: HeaderEntryListProps) {
  const t = useTranslations();

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const next = { ...(headers || {}) };
    if (oldKey !== newKey) {
      delete next[oldKey];
    }
    if (newKey.trim()) {
      next[newKey] = value;
    }
    onChange(Object.keys(next).length > 0 ? next : undefined);
  };

  const addHeader = () => {
    const next = { ...(headers || {}), "": "" };
    onChange(next);
  };

  const removeHeader = (key: string) => {
    const next = { ...(headers || {}) };
    delete next[key];
    onChange(Object.keys(next).length > 0 ? next : undefined);
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest px-1">
        {t.providers.customHeaders} ({t.providers.optional})
      </label>
      <div className="bg-[var(--text-primary)]/[0.02] rounded-2xl border border-[var(--glass-border)] divide-y divide-[var(--glass-border)] overflow-hidden shadow-inner">
        {Object.entries(headers || {}).map(([key, value], headerIndex) => (
          <div
            key={headerIndex}
            className="flex items-center gap-3 p-3 hover:bg-[var(--text-primary)]/[0.03] transition-all group"
          >
            <input
              type="text"
              value={key}
              onChange={(e) => updateHeader(key, e.target.value, value)}
              placeholder={
                headerIndex === 0
                  ? "Authorization"
                  : t.providers.customHeaderKeyPlaceholder
              }
              className="flex-1 glass-input bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm"
            />
            <ArrowRight className="w-4 h-4 text-[var(--text-primary)]/20 group-hover:text-[var(--text-primary)]/50" />
            <input
              type="text"
              value={value}
              onChange={(e) => updateHeader(key, key, e.target.value)}
              placeholder={
                headerIndex === 0
                  ? "Bearer sk-"
                  : t.providers.customHeaderValuePlaceholder
              }
              className="flex-1 glass-input bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm"
            />
            <button
              onClick={() => removeHeader(key)}
              className="p-2 text-red-500/40 hover:text-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={addHeader}
          className="w-full py-3 bg-[var(--text-primary)]/[0.02] hover:bg-[var(--accent-primary)]/10 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold border-t border-[var(--glass-border)] active:scale-[0.98] group shadow-inner"
        >
          <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
          {t.providers.customAddHeader}
        </button>
      </div>
    </div>
  );
});
