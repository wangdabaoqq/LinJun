import { useState } from "react";
import { Trash2, Plus, Globe, Eye, EyeOff } from "lucide-react";
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

function ApiKeyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="glass-input w-full font-mono text-sm border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
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
          className="group p-4 rounded-2xl bg-[var(--text-primary)]/[0.02] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all space-y-3 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={() => onRemove(index)}
              disabled={apiKeys.length <= 1}
              className="p-1.5 text-red-500 hover:scale-110 transition-all disabled:hidden"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <ApiKeyInput
              value={key["api-key"]}
              onChange={(val) => onUpdate(index, "api-key", val)}
              placeholder={t.providers.customApiKeyPlaceholder}
            />
            <div className="flex items-center gap-2 bg-[var(--text-primary)]/[0.05] rounded-xl px-3 py-1.5 border border-[var(--glass-border)]">
              <Globe className="w-3.5 h-3.5 text-[var(--accent-primary)] opacity-50" />
              <input
                type="text"
                value={key["proxy-url"] || ""}
                onChange={(e) => onUpdate(index, "proxy-url", e.target.value)}
                placeholder={t.providers.customProxyUrlPlaceholder}
                className="bg-transparent border-none outline-none flex-1 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-dim)]"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="w-full py-4 border border-dashed border-[var(--glass-border)] rounded-2xl text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border-hover)] hover:bg-[var(--text-primary)]/5 transition-all duration-300 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-[0.98] group bg-[var(--text-primary)]/[0.01]"
      >
        <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
        {t.providers.customAddApiKey}
      </button>
    </div>
  );
}
