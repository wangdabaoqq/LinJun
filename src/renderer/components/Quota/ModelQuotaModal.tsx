import { Modal } from "../ui/Modal";
import { QuotaWindowBar } from "./QuotaWindowBar";
import { QuotaWindow } from "./AccountQuotaCard";
import { useTranslations } from "../../stores/settings";

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

const MODEL_DISPLAY_ORDER = [
  "claude-opus-4-5-thinking",
  "Claude Opus 4.5 Thinking",
  "gemini-3-pro-high",
  "Gemini 3 High",
  "gemini-3-pro-image",
  "Gemini 3 Image",
  "gemini-3-flash",
  "Gemini 3 Flash",
  "gemini-3-pro-low",
  "Gemini 3 Low",
  "gemini-2.5-flash",
  "Gemini 2.5 Flash",
  "gemini-2.5-flash-thinking",
  "Gemini 2.5 Flash Thinking",
  "gemini-2.5-pro",
  "Gemini 2.5",
  "claude-sonnet-4-5",
  "Claude Sonnet 4.5",
  "claude-sonnet-4-5-thinking",
  "Claude Sonnet 4.5 Thinking",
];

function formatModelLabel(label: string): string {
  return label.replace(/(\s|^)(Pro|Plus)(\s|$)/gi, " ").trim();
}

function getModelSortIndex(label: string): number {
  const normalizedLabel = label.toLowerCase().replace(/[\s-_]/g, "");
  for (let i = 0; i < MODEL_DISPLAY_ORDER.length; i++) {
    const orderItem = MODEL_DISPLAY_ORDER[i]
      .toLowerCase()
      .replace(/[\s-_]/g, "");
    if (
      normalizedLabel.includes(orderItem) ||
      orderItem.includes(normalizedLabel)
    ) {
      return i;
    }
  }
  return MODEL_DISPLAY_ORDER.length;
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

  const sortedModels = [...allModels].sort((a, b) => {
    return getModelSortIndex(a.label) - getModelSortIndex(b.label);
  });

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
