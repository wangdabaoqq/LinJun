import { memo, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { Modal } from "../ui/Modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface ProviderModelRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerLabel: string;
  sourceOptions: string[];
  initialSourceKey: string;
  patternsBySource: Record<string, string[]>;
  onLoadCatalog: () => Promise<Array<{ id: string; ownedBy: string }>>;
  onSave: (sourceKey: string, providerPatterns: string[]) => Promise<void>;
}

interface CatalogModel {
  id: string;
  ownedBy: string;
}

interface ProviderFilterConfig {
  ownedBy?: string[];
  idPrefix?: string[];
}

const PROVIDER_FILTER_CONFIG: Record<string, ProviderFilterConfig> = {
  copilot: { ownedBy: ["github-copilot"] },
  codex: { ownedBy: ["github-copilot"] },
  claude: { ownedBy: ["claude-"] },
  gemini: { ownedBy: ["google"] },
  qwen: { ownedBy: ["qwen"] },
  kiro: { ownedBy: ["aws"] },
  iflow: { ownedBy: ["iflow"] },
};

function normalizePatterns(patterns: string[]): string[] {
  return Array.from(new Set(patterns.map((p) => p.trim()).filter(Boolean)));
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

function filterCatalogModelsByProvider(
  models: CatalogModel[],
  providerId: string,
): CatalogModel[] {
  const providerLower = providerId.trim().toLowerCase();
  if (!providerLower) return models;

  if (providerLower === "codex") {
    return models.filter((model) => model.id.toLowerCase().includes("codex"));
  }

  const config = PROVIDER_FILTER_CONFIG[providerLower];
  if (config) {
    return models.filter((model) => {
      const idLower = model.id.toLowerCase();
      if (config.ownedBy?.some((vendor) => vendor === model.ownedBy)) {
        return true;
      }
      if (config.idPrefix?.some((prefix) => idLower.startsWith(prefix))) {
        return true;
      }
      return false;
    });
  }

  return models.filter((model) => {
    const idLower = model.id.toLowerCase();
    return (
      idLower.startsWith(providerLower) ||
      model.ownedBy.includes(providerLower) ||
      providerLower.includes(model.ownedBy)
    );
  });
}

export const ProviderModelRulesModal = memo(function ProviderModelRulesModal({
  isOpen,
  onClose,
  providerId,
  providerLabel,
  sourceOptions,
  initialSourceKey,
  patternsBySource,
  onLoadCatalog,
  onSave,
}: ProviderModelRulesModalProps) {
  const t = useTranslations();
  const [sourceKey, setSourceKey] = useState(initialSourceKey);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [inputPattern, setInputPattern] = useState("");
  const [catalogModels, setCatalogModels] = useState<string[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMultipleSources = sourceOptions.length > 1;

  const filteredCatalog = useMemo(
    () =>
      catalogModels.filter((model) => !patterns.includes(model)).slice(0, 80),
    [catalogModels, patterns],
  );

  useEffect(() => {
    if (!isOpen) return;
    const nextSourceKey = initialSourceKey || sourceOptions[0] || "";
    setSourceKey(nextSourceKey);
    setPatterns(patternsBySource[nextSourceKey] || []);
    setInputPattern("");
    setError(null);

    const load = async () => {
      setIsLoadingCatalog(true);
      try {
        const result = await onLoadCatalog();
        const normalized = normalizeCatalogModels(result);
        const filtered = filterCatalogModelsByProvider(normalized, providerId);
        setCatalogModels(filtered.map((item) => item.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoadingCatalog(false);
      }
    };

    void load();
  }, [
    initialSourceKey,
    isOpen,
    onLoadCatalog,
    providerId,
    patternsBySource,
    sourceOptions,
  ]);

  useEffect(() => {
    if (!isOpen || !sourceKey) return;
    setPatterns(patternsBySource[sourceKey] || []);
  }, [isOpen, patternsBySource, sourceKey]);

  const handleAddPattern = () => {
    if (!inputPattern.trim()) return;
    setPatterns((prev) => normalizePatterns([...prev, inputPattern]));
    setInputPattern("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(sourceKey, normalizePatterns(patterns));
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`${t.providers.accountModelRulesSaveFailed}: ${message}`);
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
            {t.providers.providerModelRulesTitle}
          </span>
          <span className="text-[10px] text-[var(--text-dim)] font-mono opacity-60">
            {providerLabel}
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
              {t.providers.accountModelRulesSource}
            </label>
            <Select value={sourceKey} onValueChange={setSourceKey}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue
                  placeholder={t.providers.accountModelRulesSource}
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

        <div className="space-y-3">
          <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            {t.providers.accountModelRulesAddPattern}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputPattern}
              onChange={(e) => setInputPattern(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPattern()}
              placeholder={t.providers.accountModelRulesPatternPlaceholder}
              className="glass-input h-11 w-full"
            />
            <button
              onClick={handleAddPattern}
              className="glass-btn glass-btn-primary px-5 rounded-xl flex items-center gap-2 h-11"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            {t.providers.providerModelRulesCurrent}
          </p>
          {patterns.length === 0 ? (
            <div className="px-4 py-6 rounded-2xl border border-dashed border-[var(--glass-border)] text-center text-[10px] text-[var(--text-dim)]">
              {t.providers.providerModelRulesNoRules}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {patterns.map((pattern) => (
                <div
                  key={pattern}
                  className="flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-[var(--text-primary)]/[0.04] border border-[var(--glass-border)]"
                >
                  <span className="text-[10px] font-mono font-bold text-[var(--text-primary)]">
                    {pattern}
                  </span>
                  <button
                    onClick={() =>
                      setPatterns((prev) =>
                        prev.filter((item) => item !== pattern),
                      )
                    }
                    className="p-1 rounded-full text-[var(--text-dim)] hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            {t.providers.providerModelRulesCatalog}
          </p>
          <div className="max-h-40 overflow-y-auto custom-scrollbar rounded-xl border border-[var(--glass-border)] p-2 space-y-1">
            {isLoadingCatalog ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : filteredCatalog.length === 0 ? (
              <p className="py-4 text-center text-[10px] text-[var(--text-dim)]">
                {t.quota.noModelsFound}
              </p>
            ) : (
              filteredCatalog.map((model) => (
                <button
                  key={model}
                  onClick={() =>
                    setPatterns((prev) => normalizePatterns([...prev, model]))
                  }
                  className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-mono text-[var(--text-dim)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] transition-colors"
                >
                  {model}
                </button>
              ))
            )}
          </div>
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
          <span>{t.providers.accountModelRulesSave}</span>
        </button>
      </div>
    </Modal>
  );
});
