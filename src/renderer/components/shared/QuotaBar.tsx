interface QuotaBarProps {
  provider: string;
  used: number;
  total: number;
  account?: string;
  resetIn?: string;
  showDetails?: boolean;
}

export function QuotaBar({
  provider,
  used,
  total,
  account,
  resetIn,
  showDetails = false,
}: QuotaBarProps) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const isWarning = percentage > 80;
  const isDanger = percentage > 95;

  const getTextColorClass = (): string => {
    if (isDanger) return "text-[var(--accent-magenta)] glow-magenta";
    if (isWarning) return "text-[var(--warning)]";
    return "text-[var(--text-primary)]";
  };

  const getProgressClass = (): string => {
    if (isDanger) return "progress-bar-fill-danger";
    if (isWarning) return "progress-bar-fill-warning";
    return "";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className={`font-medium ${getTextColorClass()}`}>
            {provider}
          </span>
          {showDetails && account && (
            <span className="text-xs text-[var(--text-dim)] terminal-text">
              {account}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="terminal-text text-[var(--text-muted)]">
            {used.toLocaleString()} / {total.toLocaleString()}
          </span>
          {showDetails && resetIn && (
            <span className="text-xs text-[var(--text-dim)]">
              Reset: {resetIn}
            </span>
          )}
        </div>
      </div>
      <div className="progress-bar-glass">
        <div
          className={`progress-bar-fill ${getProgressClass()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
