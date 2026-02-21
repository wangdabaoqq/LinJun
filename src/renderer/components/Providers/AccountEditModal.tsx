import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { Modal } from "../ui/Modal";
import { Account } from "./types";

interface AccountEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountLabel: string;
  providerId: string;
  account?: Account;
  onLoadAccountPreview?: (filePath: string) => Promise<unknown>;
  onSaveAccountMetadata?: (
    filePath: string,
    updates: {
      priority?: number;
      prefix?: string;
      proxyUrl?: string;
    },
  ) => Promise<void>;
}

function maskSensitiveValue(value: string): string {
  if (value.length <= 16) {
    return "*".repeat(value.length);
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function maskSensitiveObject(payload: unknown): unknown {
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload))
    return payload.map((item) => maskSensitiveObject(item));
  if (payload && typeof payload === "object") {
    const output: Record<string, unknown> = {};
    Object.entries(payload as Record<string, unknown>).forEach(
      ([key, value]) => {
        const lower = key.toLowerCase();
        const isSensitive =
          lower.includes("token") ||
          lower.includes("secret") ||
          lower.includes("password") ||
          lower.includes("api_key") ||
          lower.includes("apikey");
        if (isSensitive && typeof value === "string") {
          output[key] = maskSensitiveValue(value);
        } else {
          output[key] = maskSensitiveObject(value);
        }
      },
    );
    return output;
  }
  return payload;
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { hour12: false });
}

export function AccountEditModal({
  isOpen,
  onClose,
  accountLabel,
  providerId,
  account,
  onLoadAccountPreview,
  onSaveAccountMetadata,
}: AccountEditModalProps) {
  const t = useTranslations();
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewRaw, setPreviewRaw] = useState<unknown>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [priorityInput, setPriorityInput] = useState("1");
  const [prefixInput, setPrefixInput] = useState("");
  const [proxyUrlInput, setProxyUrlInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsCopied(false);
    setPreviewRaw(null);

    if (account?.filePath && onLoadAccountPreview) {
      setIsLoadingPreview(true);
      void onLoadAccountPreview(account.filePath)
        .then((payload) => setPreviewRaw(payload))
        .catch((err) => setError(String(err)))
        .finally(() => setIsLoadingPreview(false));
    }
  }, [isOpen, account?.filePath, onLoadAccountPreview]);

  useEffect(() => {
    const previewObject =
      previewRaw && typeof previewRaw === "object" && !Array.isArray(previewRaw)
        ? (previewRaw as Record<string, unknown>)
        : null;
    const priority =
      typeof previewObject?.priority === "number"
        ? previewObject.priority
        : typeof previewObject?.priority === "string"
          ? Number(previewObject.priority)
          : 1;
    const prefix =
      typeof previewObject?.prefix === "string" ? previewObject.prefix : "";
    const proxyUrl =
      typeof previewObject?.proxy_url === "string"
        ? previewObject.proxy_url
        : "";

    setPriorityInput(
      String(Number.isFinite(priority) ? Math.max(0, priority) : 1),
    );
    setPrefixInput(prefix);
    setProxyUrlInput(proxyUrl);
  }, [previewRaw]);

  const previewDisplay = useMemo(() => {
    if (!previewRaw) return "";
    const payload = maskSensitiveObject(previewRaw);
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  }, [previewRaw]);

  const rawPreview = useMemo(() => {
    if (!previewRaw) return "";
    try {
      return JSON.stringify(previewRaw, null, 2);
    } catch {
      return String(previewRaw);
    }
  }, [previewRaw]);

  const handleCopyPreview = async () => {
    if (!rawPreview) return;
    try {
      await navigator.clipboard.writeText(rawPreview);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch {
      setError(t.providers.accountEditCopyPreviewFailed);
    }
  };

  const previewMeta = useMemo(() => {
    if (
      !previewRaw ||
      typeof previewRaw !== "object" ||
      Array.isArray(previewRaw)
    ) {
      return null;
    }
    const data = previewRaw as Record<string, unknown>;
    return {
      accountId:
        typeof data.account_id === "string" ? data.account_id : undefined,
      email: typeof data.email === "string" ? data.email : undefined,
      expired: typeof data.expired === "string" ? data.expired : undefined,
      lastRefresh:
        typeof data.last_refresh === "string" ? data.last_refresh : undefined,
      type: typeof data.type === "string" ? data.type : undefined,
    };
  }, [previewRaw]);

  const handleSave = async () => {
    if (!account?.filePath || !onSaveAccountMetadata) {
      onClose();
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const priority = Math.max(
        0,
        Number.parseInt(priorityInput || "0", 10) || 0,
      );
      await onSaveAccountMetadata(account.filePath, {
        priority,
        prefix: prefixInput,
        proxyUrl: proxyUrlInput,
      });
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const modalTitle = (
    <div className="flex flex-col gap-0.5">
      <span className="text-base font-bold text-[var(--text-primary)]">
        {t.common.edit}
      </span>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[10px] text-[var(--text-dim)] font-mono opacity-60">
          {accountLabel} • {providerId}
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
      <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
        {error && (
          <div className="px-4 py-3 rounded-2xl bg-red-500/[0.08] border border-red-500/20 text-red-500 text-[11px] font-bold">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <div className="text-[var(--text-dim)] uppercase tracking-wider text-[9px] font-bold">
                {t.providers.accountEditEmail}
              </div>
              <div className="text-[var(--text-primary)] font-mono truncate">
                {account?.email || "-"}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-dim)] uppercase tracking-wider text-[9px] font-bold">
                {t.providers.accountEditStatus}
              </div>
              <div className="text-[var(--text-primary)]">
                {account?.enabled !== false
                  ? t.providers.enabledState
                  : t.providers.disabledState}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-dim)] uppercase tracking-wider text-[9px] font-bold">
                {t.providers.accountEditAccountId}
              </div>
              <div className="font-mono text-[var(--text-primary)] break-all">
                {previewMeta?.accountId || "-"}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-dim)] uppercase tracking-wider text-[9px] font-bold">
                {t.providers.accountEditType}
              </div>
              <div className="font-mono text-[var(--text-primary)]">
                {previewMeta?.type || "-"}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-dim)] uppercase tracking-wider text-[9px] font-bold">
                {t.providers.accountEditExpired}
              </div>
              <div className="font-mono text-[var(--text-primary)]">
                {formatDateTime(previewMeta?.expired)}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-dim)] uppercase tracking-wider text-[9px] font-bold">
                {t.providers.accountEditLastRefresh}
              </div>
              <div className="font-mono text-[var(--text-primary)]">
                {formatDateTime(previewMeta?.lastRefresh)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01] p-4 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-dim)]">
            {t.providers.accountEditAdvancedFields}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-dim)]">
                {t.providers.accountEditPriority}
              </label>
              <input
                type="number"
                min={0}
                value={priorityInput}
                onChange={(e) => setPriorityInput(e.target.value)}
                className="glass-input w-full h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-dim)]">
                {t.providers.accountEditPrefix}
              </label>
              <input
                type="text"
                value={prefixInput}
                onChange={(e) => setPrefixInput(e.target.value)}
                className="glass-input w-full h-10"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-[var(--text-dim)]">
              {t.providers.accountEditProxyUrl}
            </label>
            <input
              type="text"
              value={proxyUrlInput}
              onChange={(e) => setProxyUrlInput(e.target.value)}
              className="glass-input w-full h-10"
              placeholder={t.providers.accountEditProxyUrlPlaceholder}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.01] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-dim)]">
              {t.providers.accountEditJsonPreview}
            </span>
            <button
              onClick={() => void handleCopyPreview()}
              className="px-2 py-1 rounded-lg text-[10px] text-[var(--text-dim)] hover:text-[var(--text-primary)]"
              disabled={!previewRaw}
            >
              <span className="inline-flex items-center gap-1">
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                {isCopied ? t.common.copied : t.common.copy}
              </span>
            </button>
          </div>
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/55 p-3 max-h-44 overflow-auto custom-scrollbar">
            {isLoadingPreview ? (
              <div className="text-[10px] text-[var(--text-dim)] flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" />
                {t.providers.accountEditLoadingPreview}
              </div>
            ) : previewDisplay ? (
              <pre className="text-[10px] leading-relaxed font-mono text-[var(--text-primary)] whitespace-pre-wrap break-all">
                {previewDisplay}
              </pre>
            ) : (
              <div className="text-[10px] text-[var(--text-dim)]">
                {t.providers.accountEditNoPreviewData}
              </div>
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
          <span>{t.common.save}</span>
        </button>
      </div>
    </Modal>
  );
}
