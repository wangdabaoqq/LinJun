import { useMemo, useState } from "react";
import { Save, X, XCircle, Zap } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { AmpcodeProtocolForm } from "./CustomProviderForm/AmpcodeProtocolForm";
import {
  AmpcodeApiKeyMappingEntry,
  AmpcodeModelMappingEntry,
  AmpcodeProvider,
} from "./CustomProviderForm/types";
import { AmpcodeCompatProvider } from "./types";

interface AmpcodeSettingsModalProps {
  provider: AmpcodeCompatProvider | null;
  onClose: () => void;
  onSaved: () => void;
}

function createDefaultAmpcodeProvider(): AmpcodeProvider {
  return {
    "upstream-url": "https://ampcode.com",
    "upstream-api-key": "",
    "upstream-api-keys": [],
    "restrict-management-to-localhost": false,
    "force-model-mappings": false,
    "model-mappings": [],
  };
}

export function AmpcodeSettingsModal({
  provider,
  onClose,
  onSaved,
}: AmpcodeSettingsModalProps) {
  const t = useTranslations();
  const initialValue = useMemo<AmpcodeProvider>(() => {
    if (!provider) {
      return createDefaultAmpcodeProvider();
    }

    return {
      "upstream-url": provider["upstream-url"] || "https://ampcode.com",
      ...(provider["upstream-api-key"]
        ? { "upstream-api-key": provider["upstream-api-key"] }
        : {}),
      ...(provider["upstream-api-keys"]
        ? { "upstream-api-keys": provider["upstream-api-keys"] }
        : {}),
      "restrict-management-to-localhost":
        provider["restrict-management-to-localhost"] || false,
      "force-model-mappings": provider["force-model-mappings"] || false,
      ...(provider["model-mappings"]
        ? { "model-mappings": provider["model-mappings"] }
        : {}),
    };
  }, [provider]);

  const [entry, setEntry] = useState<AmpcodeProvider>(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAmpcodeField = (
    field: keyof AmpcodeProvider,
    value:
      | string
      | boolean
      | AmpcodeApiKeyMappingEntry[]
      | AmpcodeModelMappingEntry[]
      | undefined,
  ) => {
    if (field === "upstream-api-keys") {
      setEntry({
        ...entry,
        "upstream-api-keys": value as AmpcodeApiKeyMappingEntry[] | undefined,
      });
      return;
    }

    if (field === "model-mappings") {
      setEntry({
        ...entry,
        "model-mappings": value as AmpcodeModelMappingEntry[] | undefined,
      });
      return;
    }

    if (
      field === "restrict-management-to-localhost" ||
      field === "force-model-mappings"
    ) {
      setEntry({
        ...entry,
        [field]: Boolean(value),
      });
      return;
    }

    setEntry({
      ...entry,
      [field]: (value as string) || undefined,
    });
  };

  const handleSave = async () => {
    setError(null);

    if (!entry["upstream-url"]?.trim()) {
      setError(t.providers.customAmpcodeUpstreamUrlRequired);
      return;
    }

    const cleaned: AmpcodeProvider = {
      "upstream-url": entry["upstream-url"].trim(),
      ...(entry["upstream-api-key"]?.trim()
        ? { "upstream-api-key": entry["upstream-api-key"].trim() }
        : {}),
      ...(entry["upstream-api-keys"] && entry["upstream-api-keys"].length > 0
        ? {
            "upstream-api-keys": entry["upstream-api-keys"]
              .map((item) => ({
                "upstream-api-key": item["upstream-api-key"].trim(),
                "api-keys": item["api-keys"].map((apiKey) => apiKey.trim()),
              }))
              .filter(
                (item) =>
                  item["upstream-api-key"] &&
                  item["api-keys"].filter(Boolean).length > 0,
              )
              .map((item) => ({
                ...item,
                "api-keys": item["api-keys"].filter(Boolean),
              })),
          }
        : {}),
      "restrict-management-to-localhost":
        entry["restrict-management-to-localhost"] || false,
      "force-model-mappings": entry["force-model-mappings"] || false,
      ...(entry["model-mappings"] && entry["model-mappings"].length > 0
        ? {
            "model-mappings": entry["model-mappings"]
              .map((item) => ({
                from: item.from.trim(),
                to: item.to.trim(),
              }))
              .filter((item) => item.from && item.to),
          }
        : {}),
    };

    setIsSaving(true);
    try {
      const result = await window.electronAPI?.ampcodeCompat?.save(cleaned);
      if (result?.success) {
        onSaved();
        onClose();
      } else {
        setError(result?.error || "Failed to save AmpCode settings");
      }
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      />

      <div className="relative w-full max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden animate-scale-in shadow-soft-xl border border-[var(--glass-border)] rounded-3xl isolation-isolate">
        <div className="absolute inset-0 glass-modal-bg z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 via-transparent to-transparent z-0" />

        <div className="relative z-10 flex items-center justify-between p-8 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-4">
            <div className="text-3xl text-[var(--accent-primary)] transition-transform duration-500 hover:scale-110">
              <Zap className="w-8 h-8 fill-current opacity-20" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                {t.providers.ampcodeSettingsTitle}
              </h2>
              <p className="text-[10px] text-[var(--text-dim)] mt-1 font-bold tracking-wider opacity-80">
                {t.providers.ampcodeSettingsDesc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--text-primary)]/5 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="relative z-10 mx-8 mt-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-shake flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="relative z-10 flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AmpcodeProtocolForm entry={entry} onUpdate={updateAmpcodeField} />
        </div>

        <div className="relative z-10 p-8 border-t border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01] backdrop-blur-2xl flex justify-end items-center">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white text-xs font-bold uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 shadow-soft-md"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? t.providers.customSaving : t.providers.customSave}
          </button>
        </div>
      </div>
    </div>
  );
}
