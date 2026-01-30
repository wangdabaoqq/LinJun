import React from "react";
import { useLanguage, useTranslations } from "../../stores/settings";
import {
  getProviderIcon,
  inferProviderFromLabel,
} from "../icons/ProviderIcons";

interface QuotaWindowBarProps {
  label: string;
  extraLabel?: React.ReactNode;
  usedPercent: number;
  resetIn: string;
  limitReached?: boolean;
  providerId?: string;
}

export function QuotaWindowBar({
  label,
  extraLabel,
  usedPercent,
  resetIn,
  limitReached = false,
  providerId,
}: QuotaWindowBarProps) {
  const t = useTranslations();
  const { language } = useLanguage();
  const percentage = Math.min(Math.max(usedPercent, 0), 100);

  const isDanger = percentage > 95 || limitReached;
  const isWarning = percentage > 80 && !isDanger;

  // Helper to translate labels using i18n
  const getTranslatedLabel = (label: string): string => {
    if (label.includes("5小时") || label.includes("5-Hour"))
      return t.quota.fiveHourLimit;
    if (
      label.includes("7天") ||
      label.includes("7-Day") ||
      label.includes("Weekly")
    )
      return t.quota.weeklyLimit;
    if (label.includes("代码审查") || label.includes("Code Review"))
      return t.quota.codeReview;
    // Fallback: if it contains Chinese characters and we don't have a match, default to Rate Limit or keep original if in English mode
    if (/[\u4e00-\u9fa5]/.test(label)) {
      return t.quota.rateLimit;
    }
    return label;
  };

  const displayLabel = getTranslatedLabel(label);
  const inferredProvider = inferProviderFromLabel(label);
  const shouldShowIcon = inferredProvider !== "custom";
  const normalizeResetLabel = (value: string) => {
    if (language === "en") {
      return value
        .replace("上午", "AM")
        .replace("下午", "PM")
        .replace(/(\d+)天/g, "$1d")
        .replace(/(\d+)小时/g, "$1h")
        .replace(/(\d+)分钟/g, "$1m");
    }
    return value
      .replace("AM", "上午")
      .replace("PM", "下午")
      .replace(/(\d+)d/g, "$1天")
      .replace(/(\d+)h/g, "$1小时")
      .replace(/(\d+)m/g, "$1分钟");
  };

  const displayResetIn = normalizeResetLabel(resetIn);

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 overflow-hidden">
          {shouldShowIcon && (
            <span className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]">
              {getProviderIcon(inferredProvider)}
            </span>
          )}
          <span
            className="text-sm font-medium text-[var(--text-primary)] truncate"
            title={displayLabel}
          >
            {displayLabel}
          </span>
          {extraLabel}
          {limitReached && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider">
              {t.quota.limitReached}
            </span>
          )}
        </div>
        <span
          className={`flex-shrink-0 ml-4 text-xs font-mono font-medium ${
            isDanger
              ? "text-red-500"
              : isWarning
                ? "text-amber-500"
                : "text-[var(--text-primary)]"
          }`}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="h-2 bg-soft rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isDanger
              ? "bg-red-500"
              : isWarning
                ? "bg-amber-500"
                : "bg-[var(--accent-primary)]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {displayResetIn && (
        <div className="mt-1.5 text-right">
          <span className="text-[10px] text-[var(--text-muted)] bg-soft px-1.5 py-0.5 rounded inline-block">
            {t.quota.resetIn.replace("{time}", displayResetIn)}
          </span>
        </div>
      )}
    </div>
  );
}
