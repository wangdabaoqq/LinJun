import { memo, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Plus, X } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { Modal } from "../ui/Modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface ModelAliasItem {
  name: string;
  alias: string;
  fork?: boolean;
}

interface AccountModelAliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  subjectLabel: string;
  sourceOptions: string[];
  initialSourceKey: string;
  mappingsBySource: Record<string, ModelAliasItem[]>;
  onLoadCatalog: (
    accountFilePath?: string,
    providerId?: string,
  ) => Promise<Array<{ id: string; ownedBy: string }>>;
  onSave: (sourceKey: string, mappings: ModelAliasItem[]) => Promise<void>;
}

interface CatalogModel {
  id: string;
  ownedBy: string;
}

function normalizeMappings(mappings: ModelAliasItem[]): ModelAliasItem[] {
  const seen = new Set<string>();
  return mappings
    .map((item) => ({
      name: item.name.trim(),
      alias: item.alias.trim(),
      ...(typeof item.fork === "boolean" ? { fork: item.fork } : {}),
    }))
    .filter((item) => item.name.length > 0 && item.alias.length > 0)
    .filter((item) => {
      const key = `${item.name}=>${item.alias}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeCatalogModels(
  models: Array<{ id: string; ownedBy: string }>,
): CatalogModel[] {
  const seen = new Set<string>();
  const merged: CatalogModel[] = [];

  models.forEach((model) => {
    const id = String(model.id || "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push({
      id,
      ownedBy: String(model.ownedBy || "")
        .trim()
        .toLowerCase(),
    });
  });

  return merged;
}

export const AccountModelAliasModal = memo(function AccountModelAliasModal({
  isOpen,
  onClose,
  providerId,
  subjectLabel,
  sourceOptions,
  initialSourceKey,
  mappingsBySource,
  onLoadCatalog,
  onSave,
}: AccountModelAliasModalProps) {
  const t = useTranslations();
  const [sourceKey, setSourceKey] = useState(initialSourceKey);
  const [catalogModels, setCatalogModels] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ModelAliasItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSelectorIndex, setOpenSelectorIndex] = useState<number | null>(
    null,
  );

  const hasMultipleSources = sourceOptions.length > 1;

  const availableModelOptions = useMemo(
    () => catalogModels.filter((model) => model.length > 0),
    [catalogModels],
  );

  useEffect(() => {
    if (!isOpen) return;

    const nextSourceKey = initialSourceKey || sourceOptions[0] || "";
    setSourceKey(nextSourceKey);
    setMappings(mappingsBySource[nextSourceKey] || []);
    setError(null);

    const load = async () => {
      setIsLoadingCatalog(true);
      try {
        const result = await onLoadCatalog(undefined, providerId);
        const normalized = normalizeCatalogModels(result);
        setCatalogModels(normalized.map((item) => item.id));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t.providers.accountModelAliasLoadFailed,
        );
      } finally {
        setIsLoadingCatalog(false);
      }
    };

    void load();
  }, [
    initialSourceKey,
    isOpen,
    mappingsBySource,
    onLoadCatalog,
    providerId,
    sourceOptions,
    t.providers.accountModelAliasLoadFailed,
  ]);

  useEffect(() => {
    if (!isOpen || !sourceKey) {
      return;
    }
    setMappings(mappingsBySource[sourceKey] || []);
  }, [isOpen, mappingsBySource, sourceKey]);

  const handleAddMapping = () => {
    const defaultModel = availableModelOptions[0] || "";
    setMappings((prev) => [
      ...prev,
      {
        name: defaultModel,
        alias: "",
        fork: false,
      },
    ]);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMapping = (
    index: number,
    patch: Partial<ModelAliasItem>,
  ) => {
    setMappings((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const normalized = normalizeMappings(mappings);
      await onSave(sourceKey, normalized);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`${t.providers.accountModelAliasSaveFailed}: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-bold text-[var(--text-primary)]">
            {t.providers.accountModelAliasTitle}
          </span>
          <span className="text-[10px] text-[var(--text-dim)] font-mono opacity-60">
            {subjectLabel}
          </span>
        </div>
      }
      maxWidth="max-w-2xl"
      bodyClassName="p-0 overflow-hidden flex flex-col h-[70vh]"
    >
      <div className="flex-1 min-h-0 flex flex-col p-6 space-y-5 overflow-y-auto custom-scrollbar">
        {error && (
          <div className="px-4 py-3 rounded-2xl bg-red-500/[0.08] border border-red-500/20 text-red-500 text-[11px] font-bold">
            {error}
          </div>
        )}

        {hasMultipleSources && (
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)]">
              {t.providers.accountModelAliasSource}
            </label>
            <Select value={sourceKey} onValueChange={setSourceKey}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue
                  placeholder={t.providers.accountModelAliasSource}
                />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            {t.providers.accountModelAliasRows}
          </p>
          <button
            onClick={handleAddMapping}
            disabled={isLoadingCatalog || availableModelOptions.length === 0}
            className="glass-btn px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.providers.accountModelAliasAdd}
          </button>
        </div>

        <div className="space-y-2">
          {isLoadingCatalog ? (
            <div className="py-8 flex flex-col items-center gap-2 text-[var(--text-dim)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {t.quota.loadingModels}
              </span>
            </div>
          ) : mappings.length === 0 ? (
            <div className="px-4 py-8 rounded-2xl border border-dashed border-[var(--glass-border)] text-center text-[10px] text-[var(--text-dim)]">
              {t.providers.accountModelAliasEmpty}
            </div>
          ) : (
            mappings.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.03] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                <div className="w-full">
                  <Popover
                    open={openSelectorIndex === index}
                    onOpenChange={(open) =>
                      setOpenSelectorIndex(open ? index : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        role="combobox"
                        className="glass-input h-10 w-full inline-flex items-center justify-between px-3 text-left text-[var(--text-primary)] transition-colors"
                      >
                        <span className="truncate">
                          {item.name ||
                            t.providers.accountModelAliasSourcePlaceholder}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0">
                      <Command>
                        <CommandList>
                          <CommandEmpty>
                            {t.providers.accountModelAliasNoSourceMatch}
                          </CommandEmpty>
                          <CommandGroup>
                            {availableModelOptions.map((model) => (
                              <CommandItem
                                key={model}
                                value={model}
                                onSelect={(currentValue) => {
                                  handleUpdateMapping(index, {
                                    name: currentValue,
                                  });
                                  setOpenSelectorIndex(null);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    item.name === model
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                {model}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="relative w-full">
                  <input
                    type="text"
                    value={item.alias}
                    onChange={(e) =>
                      handleUpdateMapping(index, { alias: e.target.value })
                    }
                    placeholder={t.providers.accountModelAliasTargetPlaceholder}
                    className="glass-input h-10 w-full"
                  />
                </div>
                <button
                  onClick={() => handleRemoveMapping(index)}
                  className="w-8 h-8 rounded-lg text-[var(--text-dim)] hover:text-red-500 transition-colors flex items-center justify-center"
                  title={t.common.delete}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="px-6 py-5 bg-[var(--bg-secondary)]/30 border-t border-[var(--glass-border)] flex items-center justify-end gap-3 shrink-0">
        <button
          onClick={onClose}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl text-[11px] font-bold text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50"
        >
          {t.common.cancel}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="glass-btn glass-btn-primary px-8 py-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2.5 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} strokeWidth={3} />
          )}
          <span>{t.providers.accountModelAliasSave}</span>
        </button>
      </div>
    </Modal>
  );
});
