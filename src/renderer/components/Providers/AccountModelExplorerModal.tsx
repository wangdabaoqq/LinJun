import { useEffect, useMemo, useState, memo, useCallback } from "react";
import {
  X,
  Loader2,
  Plus,
  Search,
  Check,
  Info,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useTranslations } from "../../stores/settings";
import { Modal } from "../ui/Modal";

interface AccountModelExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountLabel: string;
  providerId: string;
  sourceOptions: string[];
  initialSourceKey: string;
  accountRulesBySource: Record<string, string[]>;
  onLoadCatalog: () => Promise<Array<{ id: string; ownedBy: string }>>;
  onSave: (sourceKey: string, accountPatterns: string[]) => Promise<void>;
}

function normalizePattern(pattern: string): string {
  return pattern.trim();
}

function mergeUniquePatterns(patterns: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  patterns.forEach((pattern) => {
    const normalized = normalizePattern(pattern);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    merged.push(normalized);
  });

  return merged;
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
  claude: { idPrefix: ["claude-"] },
  gemini: { idPrefix: ["gemini-"] },
  qwen: { idPrefix: ["qwen"] },
  kiro: { ownedBy: ["aws"] },
  iflow: { idPrefix: ["iflow"] },
};

function mergeUniqueCatalogModels(models: CatalogModel[]): CatalogModel[] {
  const seen = new Set<string>();
  const merged: CatalogModel[] = [];

  models.forEach((model) => {
    const id = normalizePattern(model.id);
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push({ id, ownedBy: model.ownedBy.trim().toLowerCase() });
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
    return models.filter((model) => {
      const idLower = model.id.toLowerCase();
      return model.ownedBy === "github-copilot" && idLower.includes("codex");
    });
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

interface ModelCapsuleProps {
  id: string;
  onToggle: () => void;
}

const ModelCapsule = memo(function ModelCapsule({
  id,
  onToggle,
}: ModelCapsuleProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left px-4 py-2.5 rounded-full border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-dim)] hover:bg-[var(--text-primary)]/[0.06] hover:border-[var(--glass-border-hover)] hover:text-[var(--text-primary)] text-[11px] font-mono transition-all duration-200 flex items-center justify-between group/item select-none relative overflow-hidden"
    >
      <span className="flex-1 truncate mr-3 min-w-0" title={id}>
        {id}
      </span>
      <div className="shrink-0 w-4 h-4 rounded-full border border-[var(--glass-border)] bg-white/[0.02] opacity-0 scale-75 group-hover/item:opacity-100 group-hover/item:scale-100 group-hover/item:border-[var(--accent-primary)]/30 group-hover/item:text-[var(--accent-primary)]/50 flex items-center justify-center transition-all duration-200">
        <Check size={10} strokeWidth={4} />
      </div>
    </button>
  );
});

export const AccountModelExplorerModal = memo(
  function AccountModelExplorerModal({
    isOpen,
    onClose,
    accountLabel,
    providerId,
    sourceOptions,
    initialSourceKey,
    accountRulesBySource,
    onLoadCatalog,
    onSave,
  }: AccountModelExplorerModalProps) {
    const t = useTranslations();
    const [sourceKey, setSourceKey] = useState(initialSourceKey);
    const [accountPatterns, setAccountPatterns] = useState<string[]>([]);
    const [catalogModels, setCatalogModels] = useState<CatalogModel[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasMultipleSources = sourceOptions.length > 1;

    const availableCatalogModels = useMemo(() => {
      return catalogModels.filter(
        (model) => !accountPatterns.includes(model.id),
      );
    }, [catalogModels, accountPatterns]);

    const displayModels = useMemo(() => {
      const keyword = searchTerm.toLowerCase();
      const filtered = availableCatalogModels.filter((model) =>
        model.id.toLowerCase().includes(keyword),
      );
      return searchTerm.trim() ? filtered : filtered.slice(0, 40);
    }, [availableCatalogModels, searchTerm]);

    const handleLoadCatalog = useCallback(async () => {
      setIsLoadingCatalog(true);
      setError(null);
      try {
        const models = await onLoadCatalog();
        const mergedModels = mergeUniqueCatalogModels(models);
        setCatalogModels(
          filterCatalogModelsByProvider(mergedModels, providerId),
        );
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoadingCatalog(false);
      }
    }, [onLoadCatalog, providerId]);

    useEffect(() => {
      if (!isOpen) return;
      const nextSource = initialSourceKey || sourceOptions[0] || "";
      setSourceKey(nextSource);
      setSearchTerm("");
      setError(null);
      setAccountPatterns(accountRulesBySource[nextSource] || []);
      void handleLoadCatalog();
    }, [
      isOpen,
      initialSourceKey,
      sourceOptions,
      accountRulesBySource,
      handleLoadCatalog,
    ]);

    useEffect(() => {
      if (!sourceKey) return;
      setAccountPatterns(accountRulesBySource[sourceKey] || []);
    }, [sourceKey, accountRulesBySource]);

    const handleAddManualPattern = () => {
      if (!searchTerm.trim()) return;
      setAccountPatterns((prev) => mergeUniquePatterns([...prev, searchTerm]));
      setSearchTerm("");
    };

    const handleAddCatalogModel = (model: string) => {
      setAccountPatterns((prev) => mergeUniquePatterns([...prev, model]));
    };

    const handleSave = async () => {
      setIsSaving(true);
      setError(null);
      try {
        const normalizedPatterns = mergeUniquePatterns(accountPatterns);
        if (normalizedPatterns.length === 0) {
          setError(t.providers.accountModelRulesMinOneRequired);
          return;
        }

        await onSave(sourceKey, normalizedPatterns);
        onClose();
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        if (errorMsg === t.providers.accountModelRulesSaveFailed) {
          setError(errorMsg);
        } else {
          setError(`${t.providers.accountModelRulesSaveFailed}: ${errorMsg}`);
        }
      } finally {
        setIsSaving(false);
      }
    };

    const modalTitle = (
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-bold text-[var(--text-primary)]">
          {t.providers.accountModelRulesTitle}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[var(--text-dim)] font-mono opacity-60">
            {accountLabel}
          </span>
        </div>
      </div>
    );

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        maxWidth="max-w-xl"
        bodyClassName="p-0 overflow-hidden flex flex-col h-[70vh]"
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <div className="px-6 py-4">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/[0.08] border border-red-500/20 text-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.08)]">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 shrink-0">
                    <ShieldAlert size={14} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold leading-tight block">
                      {error}
                    </span>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-red-500/10 active:scale-90 transition-all text-red-500/60 hover:text-red-500"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent opacity-30" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 min-h-0 flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {hasMultipleSources && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)]">
                {t.providers.accountModelRulesSource}
              </label>
              <select
                value={sourceKey}
                onChange={(e) => setSourceKey(e.target.value)}
                className="glass-input w-full h-11"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)]">
              {t.providers.accountModelRulesAddPattern}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <Search
                  size={14}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent-primary)] transition-colors"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleAddManualPattern()
                  }
                  placeholder={t.providers.accountModelRulesPatternPlaceholder}
                  className="glass-input w-full pl-10 h-11 pr-4"
                />
              </div>
              <button
                onClick={handleAddManualPattern}
                disabled={!searchTerm.trim()}
                className="glass-btn glass-btn-primary px-5 rounded-xl flex items-center gap-2 h-11 transition-all active:scale-95"
                title={t.common.confirm}
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="bg-[var(--text-primary)]/[0.02] border border-[var(--glass-border)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-[var(--text-dim)]">
                <Info size={12} className="text-[var(--accent-primary)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {t.providers.accountModelRulesPatternHelp}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-y-2">
                {[
                  {
                    pattern: "gemini-2.5-pro",
                    desc: t.providers.accountModelRulesPatternExact,
                  },
                  {
                    pattern: "gemini-2.5-*",
                    desc: t.providers.accountModelRulesPatternPrefix,
                  },
                  {
                    pattern: "*-preview",
                    desc: t.providers.accountModelRulesPatternSuffix,
                  },
                  {
                    pattern: "*flash*",
                    desc: t.providers.accountModelRulesPatternContain,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 group/help">
                    <div className="w-1 h-1 rounded-full bg-[var(--text-dim)] opacity-30" />
                    <code className="text-[10px] font-mono text-[var(--text-primary)] min-w-[120px]">
                      "{item.pattern}"
                    </code>
                    <span className="text-[10px] text-[var(--text-dim)] font-medium">
                      # {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01] overflow-hidden flex flex-col">
              <div className="flex-1 max-h-[220px] overflow-y-auto custom-scrollbar p-3">
                <div className="grid grid-cols-2 gap-2">
                  {isLoadingCatalog ? (
                    <div className="col-span-2 py-12 flex flex-col items-center justify-center gap-3 text-[var(--text-dim)] opacity-50">
                      <Loader2 size={24} className="animate-spin" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {t.quota.loadingModels}
                      </span>
                    </div>
                  ) : displayModels.length === 0 ? (
                    <div className="col-span-2 py-12 text-center text-[10px] text-[var(--text-dim)] italic opacity-50">
                      {t.quota.noModelsFound}
                    </div>
                  ) : (
                    displayModels.map((model) => (
                      <ModelCapsule
                        key={model.id}
                        id={model.id}
                        onToggle={() => handleAddCatalogModel(model.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 pt-2">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-80">
                  {t.providers.accountModelRulesAccountPatterns}
                </span>
              </div>
              {accountPatterns.length === 0 ? (
                <div className="px-4 py-8 rounded-2xl border border-dashed border-[var(--glass-border)] flex flex-col items-center gap-2 text-[var(--text-dim)] opacity-40">
                  <Info size={18} />
                  <span className="text-[10px] uppercase font-bold tracking-tight">
                    {t.providers.accountModelRulesNoAccountPatterns}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {accountPatterns.map((p) => (
                    <div
                      key={p}
                      className="flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-[var(--text-primary)]/[0.04] border border-[var(--glass-border)] hover:border-red-500/30 transition-all group/pill"
                    >
                      <span className="text-[10px] font-mono font-bold text-[var(--text-primary)]">
                        {p}
                      </span>
                      <button
                        onClick={() =>
                          setAccountPatterns((prev) =>
                            prev.filter((i) => i !== p),
                          )
                        }
                        className="p-1 rounded-full hover:bg-red-500/10 text-[var(--text-dim)] hover:text-red-500 transition-all"
                        title={t.common.delete}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 bg-[var(--bg-secondary)]/30 border-t border-[var(--glass-border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 text-amber-500/80">
            <ShieldAlert size={14} />
            <span className="text-[9px] font-bold uppercase tracking-[0.1em]">
              {t.app.systemActive} • {t.common.save} {t.providers.manage}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || accountPatterns.length === 0}
              title={
                accountPatterns.length === 0
                  ? t.providers.accountModelRulesMinOneRequired
                  : undefined
              }
              className="glass-btn glass-btn-primary px-8 py-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2.5 shadow-[0_0_25px_rgba(var(--accent-primary-rgb),0.25)] active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} strokeWidth={3} />
              )}
              <span>{t.providers.accountModelRulesSave}</span>
            </button>
          </div>
        </div>
      </Modal>
    );
  },
);
