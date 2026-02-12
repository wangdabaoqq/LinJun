import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Plus, Search } from "lucide-react";

import { useTranslations } from "../../stores/settings";

type RulesMode = "manual" | "catalog";

interface AccountModelRulesModalProps {
  isOpen: boolean;
  accountLabel: string;
  sourceOptions: string[];
  initialSourceKey: string;
  accountRulesBySource: Record<string, string[]>;
  providerRules: Record<string, string[]>;
  onLoadCatalog: () => Promise<string[]>;
  onSave: (sourceKey: string, accountPatterns: string[]) => Promise<void>;
  onClose: () => void;
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

export function AccountModelRulesModal({
  isOpen,
  accountLabel,
  sourceOptions,
  initialSourceKey,
  accountRulesBySource,
  providerRules,
  onLoadCatalog,
  onSave,
  onClose,
}: AccountModelRulesModalProps) {
  const t = useTranslations();
  const [mode, setMode] = useState<RulesMode>("manual");
  const [sourceKey, setSourceKey] = useState(initialSourceKey);
  const [manualPattern, setManualPattern] = useState("");
  const [accountPatterns, setAccountPatterns] = useState<string[]>([]);
  const [catalogModels, setCatalogModels] = useState<string[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCatalogModels, setSelectedCatalogModels] = useState<string[]>(
    [],
  );
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inheritedPatterns = useMemo(
    () => providerRules[sourceKey] || [],
    [providerRules, sourceKey],
  );
  const hasMultipleSources = sourceOptions.length > 1;

  const filteredCatalogModels = useMemo(() => {
    if (!catalogSearch.trim()) return catalogModels;
    const keyword = catalogSearch.trim().toLowerCase();
    return catalogModels.filter((model) =>
      model.toLowerCase().includes(keyword),
    );
  }, [catalogModels, catalogSearch]);

  const effectivePatternCount = useMemo(
    () =>
      mergeUniquePatterns([...inheritedPatterns, ...accountPatterns]).length,
    [inheritedPatterns, accountPatterns],
  );

  useEffect(() => {
    if (!isOpen) return;

    const nextSource =
      initialSourceKey ||
      sourceOptions[0] ||
      Object.keys(accountRulesBySource)[0] ||
      "";
    setSourceKey(nextSource);
    setMode("manual");
    setManualPattern("");
    setCatalogSearch("");
    setSelectedCatalogModels([]);
    setError(null);
    setAccountPatterns(accountRulesBySource[nextSource] || []);
  }, [isOpen, sourceOptions, initialSourceKey, accountRulesBySource]);

  useEffect(() => {
    if (!sourceKey) return;
    setAccountPatterns(accountRulesBySource[sourceKey] || []);
    setSelectedCatalogModels([]);
  }, [sourceKey, accountRulesBySource]);

  const handleLoadCatalog = async () => {
    setIsLoadingCatalog(true);
    setError(null);

    try {
      const models = await onLoadCatalog();
      setCatalogModels(mergeUniquePatterns(models));
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : t.providers.accountModelRulesLoadFailed;
      setError(message);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleAddManualPattern = () => {
    const pattern = normalizePattern(manualPattern);
    if (!pattern) return;
    setAccountPatterns((prev) => mergeUniquePatterns([...prev, pattern]));
    setManualPattern("");
  };

  const handleToggleCatalogModel = (model: string) => {
    setSelectedCatalogModels((prev) => {
      if (prev.includes(model)) {
        return prev.filter((item) => item !== model);
      }
      return [...prev, model];
    });
  };

  const handleAddSelectedCatalogModels = () => {
    if (selectedCatalogModels.length === 0) return;
    setAccountPatterns((prev) =>
      mergeUniquePatterns([...prev, ...selectedCatalogModels]),
    );
    setSelectedCatalogModels([]);
  };

  const handleModeChange = (nextMode: RulesMode) => {
    setMode(nextMode);
    if (nextMode === "catalog" && catalogModels.length === 0) {
      void handleLoadCatalog();
    }
  };

  const handleRemovePattern = (pattern: string) => {
    setAccountPatterns((prev) => prev.filter((item) => item !== pattern));
  };

  const handleSave = async () => {
    if (!sourceKey) {
      setError(t.providers.accountModelRulesSourceRequired);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(sourceKey, accountPatterns);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : t.providers.accountModelRulesSaveFailed;
      setError(message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
        onClick={isSaving ? undefined : onClose}
      />

      <div
        className="relative w-full max-w-[640px] rounded-3xl border border-[var(--glass-border)] overflow-hidden glass-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--glass-border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
              {t.providers.accountModelRulesTitle}
            </h3>
            <p className="text-xs text-[var(--text-dim)] mt-1 font-mono truncate max-w-[440px]">
              {accountLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-xl text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div
            className={`grid grid-cols-1 gap-4 ${hasMultipleSources ? "md:grid-cols-3" : "md:grid-cols-2"}`}
          >
            {hasMultipleSources && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)] mb-2">
                  {t.providers.accountModelRulesSource}
                </label>
                <select
                  value={sourceKey}
                  onChange={(event) => setSourceKey(event.target.value)}
                  className="glass-input w-full"
                  disabled={isSaving}
                >
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)] mb-2">
                {t.providers.accountModelRulesMode}
              </label>
              <select
                value={mode}
                onChange={(event) =>
                  handleModeChange(event.target.value as RulesMode)
                }
                className="glass-input w-full"
                disabled={isSaving}
              >
                <option value="manual">
                  {t.providers.accountModelRulesManualTab}
                </option>
                <option value="catalog">
                  {t.providers.accountModelRulesCatalogTab}
                </option>
              </select>
            </div>

            <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)]">
                {t.providers.accountModelRulesEffectiveCount}
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {effectivePatternCount}
              </p>
            </div>
          </div>

          {mode === "manual" ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={manualPattern}
                  onChange={(event) => setManualPattern(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddManualPattern();
                    }
                  }}
                  placeholder={t.providers.accountModelRulesPatternPlaceholder}
                  className="glass-input flex-1"
                  disabled={isSaving}
                />
                <button
                  onClick={handleAddManualPattern}
                  disabled={isSaving || !manualPattern.trim()}
                  className="glass-btn glass-btn-primary h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.providers.accountModelRulesAddPattern}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]" />
                  <input
                    value={catalogSearch}
                    onChange={(event) => setCatalogSearch(event.target.value)}
                    placeholder={t.providers.accountModelRulesSearchPlaceholder}
                    className="glass-input w-full pl-9"
                    disabled={isSaving}
                  />
                </div>
                <button
                  onClick={() => void handleLoadCatalog()}
                  disabled={isSaving || isLoadingCatalog}
                  className="glass-btn h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {isLoadingCatalog
                    ? t.providers.accountModelRulesLoadingCatalog
                    : t.providers.accountModelRulesRefreshCatalog}
                </button>
              </div>

              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] max-h-[220px] overflow-y-auto custom-scrollbar">
                {isLoadingCatalog ? (
                  <div className="h-28 flex items-center justify-center text-[var(--text-dim)] text-xs font-bold uppercase tracking-wider gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.providers.accountModelRulesLoadingCatalog}
                  </div>
                ) : filteredCatalogModels.length === 0 ? (
                  <div className="h-28 flex items-center justify-center text-[var(--text-dim)] text-xs font-bold uppercase tracking-wider">
                    {t.providers.accountModelRulesNoCatalogModels}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredCatalogModels.map((model) => {
                      const selected = selectedCatalogModels.includes(model);
                      return (
                        <button
                          key={model}
                          onClick={() => handleToggleCatalogModel(model)}
                          className={`w-full text-left px-3 py-2 rounded-lg border font-mono text-[11px] transition-colors ${
                            selected
                              ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                              : "border-transparent text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.04]"
                          }`}
                        >
                          {model}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={handleAddSelectedCatalogModels}
                disabled={isSaving || selectedCatalogModels.length === 0}
                className="glass-btn glass-btn-primary h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {t.providers.accountModelRulesAddSelected.replace(
                  "{count}",
                  String(selectedCatalogModels.length),
                )}
              </button>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)] mb-2">
                {t.providers.accountModelRulesAccountPatterns}
              </p>
              {accountPatterns.length === 0 ? (
                <p className="text-xs text-[var(--text-dim)]">
                  {t.providers.accountModelRulesNoAccountPatterns}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {accountPatterns.map((pattern) => (
                    <button
                      key={pattern}
                      onClick={() => handleRemovePattern(pattern)}
                      className="px-2.5 py-1 rounded-full border border-[var(--glass-border)] hover:border-red-500/40 hover:text-red-500 transition-colors font-mono text-[11px]"
                      title={t.common.delete}
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)] mb-2">
                {t.providers.accountModelRulesInheritedPatterns}
              </p>
              {inheritedPatterns.length === 0 ? (
                <p className="text-xs text-[var(--text-dim)]">
                  {t.providers.accountModelRulesNoInheritedPatterns}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {inheritedPatterns.map((pattern) => (
                    <span
                      key={pattern}
                      className="px-2.5 py-1 rounded-full border border-[var(--glass-border)] text-[var(--text-dim)] font-mono text-[11px]"
                    >
                      {pattern}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--glass-border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="glass-btn h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="glass-btn glass-btn-primary h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving
              ? t.providers.accountModelRulesSaving
              : t.providers.accountModelRulesSave}
          </button>
        </div>
      </div>
    </div>
  );
}
