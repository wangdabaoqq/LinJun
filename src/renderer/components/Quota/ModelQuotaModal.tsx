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
  badge,
  providerId,
  rateLimits,
}: ModelQuotaModalProps) {
  const t = useTranslations();
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
        {sortedModels.map((model, index) => (
          <div
            key={`modal-model-${index}`}
            className="p-3 bg-[var(--bg-secondary)]/30 rounded-xl border border-[var(--border-subtle)]/50 hover:bg-[var(--bg-secondary)]/50 transition-colors"
          >
            <QuotaWindowBar
              label={formatModelLabel(model.label)}
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
