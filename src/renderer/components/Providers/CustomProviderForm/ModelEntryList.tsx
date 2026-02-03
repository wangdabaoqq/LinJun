import { Trash2, ArrowRight, Plus } from "lucide-react";
import { useTranslations } from "../../../stores/settings";
import { ModelEntry } from "./types";

interface ModelEntryListProps {
  models: ModelEntry[];
  onUpdate: (index: number, field: keyof ModelEntry, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  accentColor?: string;
}

const ModelMappingRow = ({
  model,
  onNameChange,
  onAliasChange,
  onRemove,
  accentColor = "var(--accent-primary)",
}: {
  model: ModelEntry;
  onNameChange: (val: string) => void;
  onAliasChange: (val: string) => void;
  onRemove: () => void;
  accentColor?: string;
}) => {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[var(--text-primary)]/[0.03] transition-all group">
      <div className="flex-1 relative">
        <input
          type="text"
          value={model.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t.providers.customModelNamePlaceholder}
          className="glass-input w-full bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50"
        />
      </div>
      <div className="flex-none opacity-20 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4 text-[var(--text-primary)]" />
      </div>
      <div className="flex-1 relative">
        <input
          type="text"
          value={model.alias || ""}
          onChange={(e) => onAliasChange(e.target.value)}
          placeholder={t.providers.customModelAliasPlaceholder}
          className="glass-input w-full bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] font-bold text-sm placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)]/50"
          style={{ color: accentColor }}
        />
      </div>
      <button
        onClick={onRemove}
        className="p-2 text-red-500/40 hover:text-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export function ModelEntryList({
  models,
  onUpdate,
  onAdd,
  onRemove,
  accentColor = "var(--accent-primary)",
}: ModelEntryListProps) {
  const t = useTranslations();

  return (
    <div className="bg-[var(--text-primary)]/[0.02] rounded-2xl border border-[var(--glass-border)] overflow-hidden shadow-inner">
      <div className="divide-y divide-[var(--glass-border)]">
        {models.map((model, index) => (
          <ModelMappingRow
            key={index}
            model={model}
            onNameChange={(val) => onUpdate(index, "name", val)}
            onAliasChange={(val) => onUpdate(index, "alias", val)}
            onRemove={() => onRemove(index)}
            accentColor={accentColor}
          />
        ))}
      </div>
      <button
        onClick={onAdd}
        className="w-full py-3 bg-[var(--text-primary)]/[0.02] hover:bg-[var(--accent-primary)]/10 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold border-t border-[var(--glass-border)] active:scale-[0.98] group shadow-inner"
      >
        <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
        {t.providers.customAddModel}
      </button>
    </div>
  );
}
