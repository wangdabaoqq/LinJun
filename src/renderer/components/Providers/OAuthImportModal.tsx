import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { ArrowRight, FileJson, Loader2, Upload, X } from "lucide-react";

import { useTranslations } from "../../stores/settings";

interface OAuthImportModalProps {
  isOpen: boolean;
  isImporting: boolean;
  onClose: () => void;
  onConfirm: (entries: OAuthImportEntry[]) => Promise<void>;
}

export interface OAuthImportEntry {
  fileName: string;
  payload: unknown;
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
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [fileEntries, setFileEntries] = useState<OAuthImportEntry[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
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

  const submitEntries = useMemo(() => {
    if (fileEntries.length > 0) {
      return fileEntries;
    }
    if (parsedPayload && isFileNameValid) {
      return [{ fileName: normalizedName, payload: parsedPayload }];
    }
    return [];
  }, [fileEntries, isFileNameValid, normalizedName, parsedPayload]);

  const canSubmitMulti = submitEntries.length > 0 && !isImporting;

  const selectedFilesLabel = useMemo(() => {
    if (selectedFileNames.length === 0) {
      return t.providers.oauthImportDropSubtitle;
    }
    if (selectedFileNames.length === 1) {
      return selectedFileNames[0];
    }
    return t.providers.oauthImportFilesSelected.replace(
      "{count}",
      selectedFileNames.length.toString(),
    );
  }, [selectedFileNames, t.providers]);

  const processFiles = async (files: File[]) => {
    const nextEntries = new Map<string, OAuthImportEntry>();
    const nextErrors: string[] = [];

    for (const file of files) {
      const normalized = normalizeFileName(file.name);
      if (!FILE_NAME_REGEX.test(normalized)) {
        nextErrors.push(
          `${file.name}: ${t.providers.oauthImportFileNameInvalid}`,
        );
        continue;
      }

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          nextErrors.push(
            `${file.name}: ${t.providers.oauthImportInvalidJson}`,
          );
          continue;
        }

        nextEntries.set(normalized, {
          fileName: normalized,
          payload: parsed,
        });
      } catch {
        nextErrors.push(`${file.name}: ${t.providers.oauthImportInvalidJson}`);
      }
    }

    setSelectedFileNames(files.map((file) => file.name));
    setFileEntries(Array.from(nextEntries.values()));
    setFileErrors(nextErrors);
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) {
      return;
    }
    await processFiles(files);
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
    const files = event.dataTransfer.files
      ? Array.from(event.dataTransfer.files)
      : [];
    if (files.length === 0) {
      return;
    }
    await processFiles(files);
  };

  const handleSubmit = async () => {
    if (!canSubmitMulti) {
      return;
    }
    await onConfirm(submitEntries);
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
              multiple
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
              {selectedFilesLabel}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2 rounded-xl border border-[var(--glass-border)] text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all"
            >
              {t.providers.oauthImportSelectFile}
            </button>
            {fileErrors.length > 0 && (
              <div className="mt-3 w-full rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
                  {t.providers.oauthImportFailed}
                </p>
                <div className="max-h-24 overflow-auto custom-scrollbar space-y-1">
                  {fileErrors.map((item) => (
                    <p
                      key={item}
                      className="text-[10px] text-red-300 break-all"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            )}
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
            disabled={!canSubmitMulti}
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
