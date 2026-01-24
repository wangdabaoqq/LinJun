import React from "react";
import { QuotaWindowBar } from "./QuotaWindowBar";
import { useTranslations } from "../../stores/settings";

export interface QuotaWindow {
  label: string;
  usedPercent: number;
  resetIn: string;
  limitReached: boolean;
}

export interface AccountQuotaCardProps {
  email: string;
  badge?: string;
  status: "active" | "limited" | "error" | "refreshing";
  rateLimits: {
    primary: QuotaWindow;
    secondary?: QuotaWindow;
    codeReview?: QuotaWindow;
    additional?: QuotaWindow[];
  };
  lastUpdated: Date;
  onRefresh?: () => void;
}

export function AccountQuotaCard({
  email,
  badge,
  status,
  rateLimits,
  lastUpdated,
  onRefresh,
}: AccountQuotaCardProps) {
  const t = useTranslations();
  const [showMore, setShowMore] = React.useState(false);
  const defaultAdditionalCount = 2;

  React.useEffect(() => {
    setShowMore(false);
  }, [email, rateLimits.additional?.length]);

  const getStatusColor = () => {
    switch (status) {
      case "active":
        return "bg-[var(--accent-primary)]";
      case "limited":
        return "bg-amber-500";
      case "error":
        return "bg-red-500";
      case "refreshing":
        return "bg-[var(--accent-primary)] animate-pulse";
      default:
        return "bg-gray-500";
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return t.quota.justNow;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
      return t.quota.minutesAgo.replace("{minutes}", minutes.toString());
    const hours = Math.floor(minutes / 60);
    return t.quota.hoursAgo.replace("{hours}", hours.toString());
  };

  const displayEmail = email;

  return (
    <div className="glass-card p-5 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-3 h-3 mt-1.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`}
            ></div>
            {status === "active" && (
              <div
                className={`absolute w-full h-full rounded-full ${getStatusColor()} opacity-30 animate-ping`}
              ></div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--text-primary)] tracking-tight truncate max-w-[200px]">
                {displayEmail}
              </h3>
              {badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 uppercase tracking-wide">
                  {badge}
                </span>
              )}
            </div>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-soft transition-all duration-200"
            title={t.quota.refresh}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={status === "refreshing" ? "animate-spin" : ""}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16l5 5v-5" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-4">
        <QuotaWindowBar
          label={rateLimits.primary.label}
          usedPercent={rateLimits.primary.usedPercent}
          resetIn={rateLimits.primary.resetIn}
          limitReached={rateLimits.primary.limitReached}
        />

        {(rateLimits.secondary ||
          rateLimits.codeReview ||
          rateLimits.additional) && (
          <div className="pt-3 grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)]">
            {rateLimits.secondary && (
              <QuotaWindowBar
                label={rateLimits.secondary.label}
                usedPercent={rateLimits.secondary.usedPercent}
                resetIn={rateLimits.secondary.resetIn}
                limitReached={rateLimits.secondary.limitReached}
              />
            )}
            {rateLimits.codeReview && (
              <QuotaWindowBar
                label={rateLimits.codeReview.label}
                usedPercent={rateLimits.codeReview.usedPercent}
                resetIn={rateLimits.codeReview.resetIn}
                limitReached={rateLimits.codeReview.limitReached}
              />
            )}

            {rateLimits.additional && rateLimits.additional.length > 0 && (
              <div className="space-y-3">
                {rateLimits.additional
                  .slice(0, defaultAdditionalCount)
                  .map((quota, index) => (
                    <QuotaWindowBar
                      key={`additional-default-${index}`}
                      label={quota.label}
                      usedPercent={quota.usedPercent}
                      resetIn={quota.resetIn}
                      limitReached={quota.limitReached}
                    />
                  ))}

                {showMore &&
                  rateLimits.additional
                    .slice(defaultAdditionalCount)
                    .map((quota, index) => (
                      <QuotaWindowBar
                        key={`additional-more-${index}`}
                        label={quota.label}
                        usedPercent={quota.usedPercent}
                        resetIn={quota.resetIn}
                        limitReached={quota.limitReached}
                      />
                    ))}

                {rateLimits.additional.length > defaultAdditionalCount && (
                  <button
                    onClick={() => setShowMore(!showMore)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
                  >
                    {showMore
                      ? t.quota.showLess
                      : t.quota.showMoreModels.replace(
                          "{count}",
                          String(
                            rateLimits.additional.length -
                              defaultAdditionalCount,
                          ),
                        )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 flex items-center justify-between text-[10px] text-[var(--text-dim)] border-t border-[var(--border-subtle)]">
        <span className="flex items-center gap-1.5">
          {t.quota.updated} {getTimeAgo(lastUpdated)}
        </span>
        <span className="uppercase tracking-wider font-medium opacity-70">
          {t.quota.ready}
        </span>
      </div>
    </div>
  );
}
