import React from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: "primary" | "teal" | "indigo" | "magenta" | "amber";
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  accentColor = "primary",
}: SectionHeaderProps) {
  const colorStyles = {
    primary: {
      iconBg: "bg-[var(--accent-primary)]/5",
      iconColor: "text-[var(--accent-primary)]",
      border: "border-[var(--glass-border)]",
    },
    teal: {
      iconBg: "bg-teal-500/5",
      iconColor: "text-teal-500",
      border: "border-[var(--glass-border)]",
    },
    indigo: {
      iconBg: "bg-indigo-500/5",
      iconColor: "text-indigo-500",
      border: "border-[var(--glass-border)]",
    },
    magenta: {
      iconBg: "bg-pink-500/5",
      iconColor: "text-pink-500",
      border: "border-[var(--glass-border)]",
    },
    amber: {
      iconBg: "bg-amber-500/5",
      iconColor: "text-amber-500",
      border: "border-[var(--glass-border)]",
    },
  };

  const styles = colorStyles[accentColor];

  return (
    <div className="flex items-center gap-4 mb-6">
      <div
        className={`p-3 rounded-2xl ${styles.iconBg} border ${styles.border} shadow-sm`}
      >
        <Icon className={`w-5 h-5 ${styles.iconColor}`} />
      </div>
      <div className="flex-1">
        <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
