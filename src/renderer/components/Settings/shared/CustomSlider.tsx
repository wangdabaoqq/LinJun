import { motion } from "motion/react";

interface CustomSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: "indigo" | "teal" | "primary";
  disabled?: boolean;
  formatValue?: (value: number) => React.ReactNode;
}

export function CustomSlider({
  value,
  onChange,
  min,
  max,
  label,
  unit,
  icon: Icon,
  accentColor = "indigo",
  disabled = false,
  formatValue,
}: CustomSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  const colorStyles = {
    indigo: {
      gradient: "from-indigo-500 to-violet-500",
      text: "text-indigo-500",
      bg: "bg-indigo-500",
      shadow: "shadow-indigo-500/30",
    },
    teal: {
      gradient: "from-teal-500 to-cyan-500",
      text: "text-teal-500",
      bg: "bg-teal-500",
      shadow: "shadow-teal-500/30",
    },
    primary: {
      gradient: "from-[var(--accent-primary)] to-[var(--accent-secondary)]",
      text: "text-[var(--accent-primary)]",
      bg: "bg-[var(--accent-primary)]",
      shadow: "shadow-[var(--accent-primary)]/30",
    },
  };

  const styles = colorStyles[accentColor];

  return (
    <div
      className={`space-y-4 transition-all duration-300 ${
        disabled ? "opacity-50 grayscale pointer-events-none" : ""
      }`}
    >
      <div className="flex justify-between items-center">
        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </label>
        <div className={`flex items-baseline gap-1 ${styles.text}`}>
          {formatValue ? (
            formatValue(value)
          ) : (
            <>
              <span className="text-lg font-bold tabular-nums">{value}</span>
              <span className="text-[10px] uppercase opacity-70 font-medium">
                {unit}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="relative h-8 flex items-center select-none">
        {/* Custom slider track */}
        <div className="relative flex-1 h-2 bg-black/5 dark:bg-black/20 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${styles.gradient} rounded-full`}
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Native range input (invisible, for interaction) */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={`absolute inset-0 w-full h-full opacity-0 z-10 m-0 p-0 ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        />
      </div>
    </div>
  );
}
