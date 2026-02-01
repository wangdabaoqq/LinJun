interface SettingRowProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  description?: string;
}

export function SettingRow({
  label,
  icon: Icon,
  children,
  description,
}: SettingRowProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </label>
      </div>
      {description && (
        <p className="text-[11px] text-[var(--text-dim)] -mt-1 mb-2">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
