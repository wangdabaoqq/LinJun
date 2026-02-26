import { useState, useRef, useMemo, useEffect } from "react";
import {
  X,
  Upload,
  ArrowRight,
  FileJson,
  FileText,
  Loader2,
} from "lucide-react";
import { useTranslations } from "../../stores/settings";
import type {
  OpenAICompatProvider,
  ClaudeCompatProvider,
  GeminiCompatProvider,
  CodexCompatProvider,
} from "./types";

interface CustomProviderImportModalProps {
  isOpen: boolean;
  isImporting: boolean;
  existingProviders: {
    openai: OpenAICompatProvider[];
    claude: ClaudeCompatProvider[];
    gemini: GeminiCompatProvider[];
    codex: CodexCompatProvider[];
  };
  onClose: () => void;
  onConfirm: (data: any, strategy: "overwrite" | "skip") => Promise<void>;
}

type ImportTab = "file" | "json";
type MergeStrategy = "overwrite" | "skip";

interface ImportSummary {
  added: number;
  updated: number;
  skipped: number;
  total: number;
  valid: boolean;
}

interface CustomImportPayload {
  "openai-compatibility"?: OpenAICompatProvider[];
  "claude-api-key"?: ClaudeCompatProvider[];
  "gemini-api-key"?: GeminiCompatProvider[];
  "codex-api-key"?: CodexCompatProvider[];
}

function hasImportData(payload: CustomImportPayload): boolean {
  return (
    (Array.isArray(payload["openai-compatibility"]) &&
      payload["openai-compatibility"].length > 0) ||
    (Array.isArray(payload["claude-api-key"]) &&
      payload["claude-api-key"].length > 0) ||
    (Array.isArray(payload["gemini-api-key"]) &&
      payload["gemini-api-key"].length > 0) ||
    (Array.isArray(payload["codex-api-key"]) &&
      payload["codex-api-key"].length > 0)
  );
}

function mergeImportPayload(
  base: CustomImportPayload,
  next: CustomImportPayload,
): CustomImportPayload {
  return {
    "openai-compatibility": [
      ...(base["openai-compatibility"] || []),
      ...(next["openai-compatibility"] || []),
    ],
    "claude-api-key": [
      ...(base["claude-api-key"] || []),
      ...(next["claude-api-key"] || []),
    ],
    "gemini-api-key": [
      ...(base["gemini-api-key"] || []),
      ...(next["gemini-api-key"] || []),
    ],
    "codex-api-key": [
      ...(base["codex-api-key"] || []),
      ...(next["codex-api-key"] || []),
    ],
  };
}

export function CustomProviderImportModal({
  isOpen,
  isImporting,
  existingProviders,
  onClose,
  onConfirm,
}: CustomProviderImportModalProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<ImportTab>("file");
  const [jsonContent, setJsonContent] = useState("");
  const [inputSource, setInputSource] = useState<"file" | "json">("json");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [fileParseErrors, setFileParseErrors] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<CustomImportPayload | null>(
    null,
  );
  const [mergeStrategy, setMergeStrategy] =
    useState<MergeStrategy>("overwrite");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingMap = useMemo(() => {
    const openai = new Set<string>();
    const apiKeys = new Set<string>();

    existingProviders.openai.forEach((p) => {
      openai.add(`${p.name}|${p["base-url"]}`);
    });

    existingProviders.claude.forEach((p) => apiKeys.add(p["api-key"]));
    existingProviders.gemini.forEach((p) => apiKeys.add(p["api-key"]));
    existingProviders.codex.forEach((p) => apiKeys.add(p["api-key"]));

    return { openai, apiKeys };
  }, [existingProviders]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = async (files: File[]) => {
    const merged: CustomImportPayload = {};
    const errors: string[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const parsedUnknown: unknown = JSON.parse(text);
        if (
          !parsedUnknown ||
          typeof parsedUnknown !== "object" ||
          Array.isArray(parsedUnknown)
        ) {
          errors.push(`${file.name}: ${t.providers.customImportInvalidFile}`);
          continue;
        }

        const parsed = parsedUnknown as CustomImportPayload;
        if (!hasImportData(parsed)) {
          errors.push(`${file.name}: ${t.providers.customImportNoData}`);
          continue;
        }

        Object.assign(merged, mergeImportPayload(merged, parsed));
      } catch {
        errors.push(`${file.name}: ${t.providers.customImportInvalidFile}`);
      }
    }

    setInputSource("file");
    setSelectedFileNames(files.map((file) => file.name));
    setFileParseErrors(errors);
    if (hasImportData(merged)) {
      setParsedData(merged);
      setParseError(null);
    } else {
      setParsedData(null);
      setParseError(t.providers.customImportNoData);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      void processFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      void processFiles(files);
    }
    e.target.value = "";
  };

  useEffect(() => {
    if (inputSource !== "json") {
      return;
    }

    if (!jsonContent.trim()) {
      setParseError(null);
      setParsedData(null);
      return;
    }
    try {
      const parsedUnknown: unknown = JSON.parse(jsonContent);
      if (
        !parsedUnknown ||
        typeof parsedUnknown !== "object" ||
        Array.isArray(parsedUnknown)
      ) {
        setParseError(t.providers.customImportInvalidFile);
        setParsedData(null);
        return;
      }

      const parsed = parsedUnknown as CustomImportPayload;
      if (!hasImportData(parsed)) {
        setParseError(t.providers.customImportNoData);
        setParsedData(null);
        return;
      }

      setParseError(null);
      setParsedData(parsed);
    } catch {
      setParseError(t.providers.customImportInvalidFile);
      setParsedData(null);
    }
  }, [
    inputSource,
    jsonContent,
    t.providers.customImportInvalidFile,
    t.providers.customImportNoData,
  ]);

  const summary: ImportSummary = useMemo(() => {
    if (!parsedData)
      return { added: 0, updated: 0, skipped: 0, total: 0, valid: false };

    let added = 0,
      updated = 0,
      skipped = 0,
      total = 0;

    if (Array.isArray(parsedData["openai-compatibility"])) {
      parsedData["openai-compatibility"].forEach((p: OpenAICompatProvider) => {
        total++;
        if (!p.name || !p["base-url"] || !p["api-key-entries"]?.length) {
          skipped++;
          return;
        }
        const key = `${p.name}|${p["base-url"]}`;
        if (existingMap.openai.has(key)) {
          if (mergeStrategy === "overwrite") updated++;
          else skipped++;
        } else {
          added++;
        }
      });
    }

    const checkApiKeyProvider = (list: any[] | undefined) => {
      if (!Array.isArray(list)) return;
      list.forEach((p) => {
        total++;
        if (!p["api-key"]) {
          skipped++;
          return;
        }
        if (existingMap.apiKeys.has(p["api-key"])) {
          if (mergeStrategy === "overwrite") updated++;
          else skipped++;
        } else {
          added++;
        }
      });
    };

    checkApiKeyProvider(parsedData["claude-api-key"]);
    checkApiKeyProvider(parsedData["gemini-api-key"]);
    checkApiKeyProvider(parsedData["codex-api-key"]);

    return { added, updated, skipped, total, valid: total > 0 };
  }, [parsedData, existingMap, mergeStrategy]);

  const handleConfirmAction = async () => {
    if (!parsedData || isImporting) return;
    await onConfirm(parsedData, mergeStrategy);
  };

  const handleClose = () => {
    if (isImporting) {
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 z-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      />
      <div className="relative z-10 w-full max-w-2xl flex flex-col overflow-hidden animate-scale-in shadow-soft-xl border border-[var(--glass-border)] rounded-3xl isolation-isolate bg-[var(--bg-primary)]/80">
        <div className="absolute inset-0 glass-modal-bg z-0" />
        <div className="relative z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {t.providers.customImport}
              </h2>
              <p className="text-xs font-medium text-[var(--text-muted)] opacity-70">
                JSON 配置导入
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--text-primary)]/5 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative z-10 flex flex-col h-[620px] max-h-[75vh]">
          <div className="flex items-center gap-1 p-4 pb-0">
            <button
              onClick={() => setActiveTab("file")}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "file" ? "bg-[var(--text-primary)]/5 text-[var(--text-primary)] border-b-2 border-[var(--accent-primary)]" : "text-[var(--text-dim)] hover:text-[var(--text-primary)]"}`}
            >
              <FileText className="w-3.5 h-3.5" />
              文件上传
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "json" ? "bg-[var(--text-primary)]/5 text-[var(--text-primary)] border-b-2 border-[var(--accent-primary)]" : "text-[var(--text-dim)] hover:text-[var(--text-primary)]"}`}
            >
              <FileJson className="w-3.5 h-3.5" />
              JSON 内容
            </button>
          </div>
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            {activeTab === "file" ? (
              <div
                className={`flex-1 border border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all ${dragActive ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5" : "border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] hover:bg-[var(--text-primary)]/[0.01]"}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="w-16 h-16 rounded-2xl bg-[var(--text-primary)]/5 flex items-center justify-center mb-4 text-[var(--text-dim)]">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                  拖拽 JSON 文件到此处
                </h3>
                <p className="text-sm text-[var(--text-dim)] mb-6 text-center">
                  {selectedFileNames.length > 0
                    ? t.providers.customImportFilesSelected.replace(
                        "{count}",
                        selectedFileNames.length.toString(),
                      )
                    : "或者点击下方按钮选择文件"}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-bold hover:opacity-90 transition-all"
                >
                  选择文件
                </button>
                {fileParseErrors.length > 0 && (
                  <div className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
                      {t.providers.customImportParseFailed}
                    </p>
                    <div className="max-h-24 overflow-auto custom-scrollbar space-y-1">
                      {fileParseErrors.map((item) => (
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
            ) : (
              <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-auto">
                <textarea
                  value={jsonContent}
                  onChange={(e) => {
                    setInputSource("json");
                    setSelectedFileNames([]);
                    setFileParseErrors([]);
                    setJsonContent(e.target.value);
                  }}
                  placeholder="粘贴 JSON 配置..."
                  className="glass-input flex-1 w-full min-h-[180px] max-h-[260px] bg-[var(--bg-deep)] border border-[var(--glass-border)] rounded-xl p-4 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-dim)] resize-none focus:border-[var(--accent-primary)]/50 focus:ring-0 custom-scrollbar"
                />
                <p className="text-[10px] text-[var(--text-dim)] px-1">
                  {t.providers.customImportJsonTip}
                </p>
                {parseError && (
                  <p className="text-[10px] text-neon-red px-1">{parseError}</p>
                )}
                <div className="mt-2 rounded-xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">
                    {t.providers.customImportExampleTitle}
                  </p>
                  <pre className="text-[10px] leading-relaxed font-mono text-[var(--text-primary)] whitespace-pre-wrap max-h-40 overflow-auto custom-scrollbar pr-2">
                    {t.providers.customImportExampleJson}
                  </pre>
                </div>
              </div>
            )}
            {parsedData && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    导入预览
                  </h3>
                  <div className="flex bg-[var(--text-primary)]/5 p-1 rounded-lg">
                    <button
                      onClick={() => setMergeStrategy("overwrite")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${mergeStrategy === "overwrite" ? "bg-[var(--bg-primary)] text-[var(--text-primary)]" : "text-[var(--text-dim)]"}`}
                    >
                      覆盖
                    </button>
                    <button
                      onClick={() => setMergeStrategy("skip")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${mergeStrategy === "skip" ? "bg-[var(--bg-primary)] text-[var(--text-primary)]" : "text-[var(--text-dim)]"}`}
                    >
                      跳过重复
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                    <span className="text-[10px] font-bold text-emerald-500/70 uppercase">
                      新增
                    </span>
                    <span className="text-2xl font-bold text-emerald-500">
                      {summary.added}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
                    <span className="text-[10px] font-bold text-amber-500/70 uppercase">
                      更新
                    </span>
                    <span className="text-2xl font-bold text-amber-500">
                      {summary.updated}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--text-primary)]/5 border border-[var(--glass-border)] flex flex-col">
                    <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">
                      跳过
                    </span>
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      {summary.skipped}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-6 border-t border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl border border-[var(--glass-border)] text-[var(--text-primary)] text-sm font-bold hover:bg-[var(--text-primary)]/5 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleConfirmAction}
              disabled={!summary.valid || isImporting}
              className="glass-btn glass-btn-primary px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t.providers.customImport} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
