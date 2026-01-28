import React from "react";
import { QuotaWindowBar } from "./QuotaWindowBar";
import { ModelQuotaModal } from "./ModelQuotaModal";
import { useTranslations } from "../../stores/settings";
import { sortModelsByDisplayOrder } from "./modelOrder";

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
  providerId?: string;
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
  providerId,
  rateLimits,
  lastUpdated,
  onRefresh,
}: AccountQuotaCardProps) {
  const t = useTranslations();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const allModels: QuotaWindow[] = [];
  if (rateLimits.primary) allModels.push(rateLimits.primary);
  if (rateLimits.secondary) allModels.push(rateLimits.secondary);
  if (rateLimits.codeReview) allModels.push(rateLimits.codeReview);
  if (rateLimits.additional) allModels.push(...rateLimits.additional);

  const sortedModels = sortModelsByDisplayOrder(allModels);

  const displayCount = 4;
  const modelsToShow = sortedModels.slice(0, displayCount);
  const hasMoreModels = sortedModels.length > displayCount;

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
    <>
      <div className="glass-card p-5 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="relative flex items-center justify-center w-3 h-3 mt-1.5 flex-shrink-0">
              <div
                className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`}
              ></div>
              {status === "active" && (
                <div
                  className={`absolute w-full h-full rounded-full ${getStatusColor()} opacity-30 animate-ping`}
                ></div>
              )}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[var(--text-primary)] tracking-tight truncate">
                  {displayEmail}
                </h3>
                {badge && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 uppercase tracking-wide whitespace-nowrap">
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
              className="flex-shrink-0 ml-2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-soft transition-all duration-200"
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
          {modelsToShow.map((model, index) => (
            <div
              key={index}
              className={
                index > 0
                  ? "pt-3 border-t border-[var(--border-subtle)]/50"
                  : ""
              }
            >
              <QuotaWindowBar
                label={model.label}
                usedPercent={model.usedPercent}
                resetIn={model.resetIn}
                limitReached={model.limitReached}
                providerId={providerId}
              />
            </div>
          ))}

          {hasMoreModels && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full mt-2 py-1.5 px-3 text-[10px] font-medium tracking-wide text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]/80 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 group/btn border border-transparent hover:border-[var(--border-subtle)]/30"
            >
              <span className="opacity-70 group-hover/btn:opacity-100 transition-opacity">
                {t.quota.viewAllModels}
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-4 pt-3 flex items-center justify-between text-[10px] text-[var(--text-dim)] border-t border-[var(--border-subtle)]/30">
          <span className="flex items-center gap-1.5">
            {t.quota.updated} {getTimeAgo(lastUpdated)}
          </span>
          <span className="uppercase tracking-wider font-medium opacity-70">
            {t.quota.ready}
          </span>
        </div>
      </div>

      <ModelQuotaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        email={email}
        badge={badge}
        providerId={providerId}
        rateLimits={rateLimits}
      />
    </>
  );
}
