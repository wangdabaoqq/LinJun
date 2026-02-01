import { useState } from "react";
import log from "@renderer/utils/logger";
import { Copy, Check } from "lucide-react";
import { Modal } from "../ui/Modal";
import { QuotaWindowBar } from "./QuotaWindowBar";
import { QuotaWindow } from "./AccountQuotaCard";
import { useTranslations } from "../../stores/settings";
import { sortModelsByDisplayOrder } from "./modelOrder";

interface ModelQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  badge?: string;
  providerId?: string;
  rateLimits: {
    primary: QuotaWindow;
    secondary?: QuotaWindow;
    codeReview?: QuotaWindow;
    additional?: QuotaWindow[];
  };
}

function formatModelLabel(label: string): string {
  return label.replace(/(\s|^)(Pro|Plus)(\s|$)/gi, " ").trim();
}

export function ModelQuotaModal({
  isOpen,
  onClose,
  email,
  badge: _badge,
  providerId,
  rateLimits,
}: ModelQuotaModalProps) {
  const t = useTranslations();
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);
  const allModels: QuotaWindow[] = [];

  if (rateLimits.primary) {
    allModels.push(rateLimits.primary);
  }
  if (rateLimits.secondary) {
    allModels.push(rateLimits.secondary);
  }
  if (rateLimits.codeReview) {
    allModels.push(rateLimits.codeReview);
  }
  if (rateLimits.additional) {
    allModels.push(...rateLimits.additional);
  }

  const sortedModels = sortModelsByDisplayOrder(allModels);

  const handleCopyModelId = async (modelId: string) => {
    try {
      await navigator.clipboard.writeText(modelId);
      setCopiedModelId(modelId);
      setTimeout(() => setCopiedModelId(null), 2000);
    } catch (err) {
      log.error("Failed to copy model ID:", err);
    }
  };

  const modalTitle = (
    <div className="flex flex-col gap-0.5">
      <span className="text-[15px] font-semibold text-[var(--text-primary)]">
        {email}
      </span>
      <span className="text-xs text-[var(--text-muted)]">
        {t.quota.allModelsQuota}
      </span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="max-w-2xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
        {sortedModels.map((model, index) => (
          <div
            key={`modal-model-${index}`}
            className="p-4 bg-[var(--bg-secondary)]/40 rounded-2xl border border-[var(--border-subtle)]/50 hover:bg-[var(--bg-secondary)]/60 transition-all duration-300 group relative"
          >
            <QuotaWindowBar
              label={formatModelLabel(model.label)}
              extraLabel={
                model.modelId && (
                  <button
                    onClick={() => handleCopyModelId(model.modelId!)}
                    className="ml-1 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100 flex items-center justify-center"
                    title={
                      copiedModelId === model.modelId
                        ? t.quota.copiedModelId
                        : `${t.quota.copyModelId}: ${model.modelId}`
                    }
                  >
                    {copiedModelId === model.modelId ? (
                      <Check
                        size={12}
                        className="text-green-500 stroke-[3px]"
                      />
                    ) : (
                      <Copy size={12} className="opacity-70" />
                    )}
                  </button>
                )
              }
              usedPercent={model.usedPercent}
              resetIn={model.resetIn}
              limitReached={model.limitReached}
              providerId={providerId}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}
