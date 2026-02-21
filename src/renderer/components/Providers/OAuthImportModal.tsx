import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { ArrowRight, FileJson, Loader2, Upload, X } from "lucide-react";

import { useTranslations } from "../../stores/settings";

interface OAuthImportModalProps {
  isOpen: boolean;
  isImporting: boolean;
  onClose: () => void;
  onConfirm: (fileName: string, payload: unknown) => Promise<void>;
}

const FILE_NAME_REGEX = /^[a-zA-Z0-9@._-]+\.json$/;

function normalizeFileName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.toLowerCase().endsWith(".json")) {
    return trimmed;
  }
  return `${trimmed}.json`;
}

export function OAuthImportModal({
  isOpen,
  isImporting,
  onClose,
  onConfirm,
}: OAuthImportModalProps) {
  const t = useTranslations();
  const [jsonContent, setJsonContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedPayload = useMemo(() => {
    if (!jsonContent.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [jsonContent]);

  const normalizedName = useMemo(() => normalizeFileName(fileName), [fileName]);
  const isFileNameValid = useMemo(() => {
    if (!normalizedName) {
      return false;
    }
    return FILE_NAME_REGEX.test(normalizedName);
  }, [normalizedName]);

  const parseError = useMemo(() => {
    if (!jsonContent.trim()) {
      return null;
    }
    if (parsedPayload) {
      return null;
    }
    return t.providers.oauthImportInvalidJson;
  }, [jsonContent, parsedPayload, t.providers.oauthImportInvalidJson]);

  const fileNameError = useMemo(() => {
    if (!fileName.trim()) {
      return t.providers.oauthImportFileNameRequired;
    }
    if (!isFileNameValid) {
      return t.providers.oauthImportFileNameInvalid;
    }
    return null;
  }, [fileName, isFileNameValid, t.providers]);

  const canSubmit = Boolean(parsedPayload && isFileNameValid && !isImporting);

  const handleReadFile = async (file: File) => {
    try {
      const text = await file.text();
      setJsonContent(text);
      setSelectedFileName(file.name);
      setFileName(file.name);
    } catch {
      setSelectedFileName("");
    }
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await handleReadFile(file);
    event.target.value = "";
  };

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
      return;
    }
    if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    await handleReadFile(file);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !parsedPayload) {
      return;
    }
    await onConfirm(normalizedName, parsedPayload);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl flex flex-col overflow-hidden animate-scale-in shadow-soft-xl border border-[var(--glass-border)] rounded-3xl isolation-isolate bg-[var(--bg-primary)]/80">
        <div className="absolute inset-0 glass-modal-bg z-0" />
        <div className="relative z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {t.providers.oauthImportTitle}
              </h2>
              <p className="text-xs font-medium text-[var(--text-muted)] opacity-70">
                {t.providers.oauthImportHint}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--text-primary)]/5 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 p-6 space-y-4">
          <div
            className={`border border-dashed rounded-2xl p-6 text-center transition-all ${dragActive ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5" : "border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] hover:bg-[var(--text-primary)]/[0.01]"}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={(event) => {
              void handleDrop(event);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                void handleFileSelect(event);
              }}
            />
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--text-primary)]/5 flex items-center justify-center mb-3 text-[var(--text-dim)]">
              <Upload className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
              {t.providers.oauthImportDropTitle}
            </p>
            <p className="text-xs text-[var(--text-dim)] mb-4">
              {selectedFileName || t.providers.oauthImportDropSubtitle}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2 rounded-xl border border-[var(--glass-border)] text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all"
            >
              {t.providers.oauthImportSelectFile}
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2 px-1">
              {t.providers.oauthImportFileName}
            </label>
            <input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder={t.providers.oauthImportFileNamePlaceholder}
              className="glass-input w-full"
            />
            {fileNameError && (
              <p className="text-[10px] text-neon-red mt-2 px-1">
                {fileNameError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2 px-1">
              {t.providers.oauthImportJsonLabel}
            </label>
            <textarea
              value={jsonContent}
              onChange={(event) => setJsonContent(event.target.value)}
              placeholder={t.providers.oauthImportJsonPlaceholder}
              className="glass-input min-h-[200px] max-h-[300px] w-full resize-y font-mono text-xs"
            />
            {parseError && (
              <p className="text-[10px] text-neon-red mt-2 px-1">
                {parseError}
              </p>
            )}
          </div>
        </div>

        <div className="relative z-10 p-6 border-t border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-[var(--glass-border)] text-[var(--text-primary)] text-sm font-bold hover:bg-[var(--text-primary)]/5 transition-all"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!canSubmit}
            className="glass-btn glass-btn-primary px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {t.providers.oauthImportConfirm}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
