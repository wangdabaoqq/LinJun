import { motion } from "motion/react";

interface CustomToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function CustomToggle({
  value,
  onChange,
  label,
  desc,
  icon: Icon,
}: CustomToggleProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 cursor-pointer border ${
        value
          ? "bg-[var(--accent-primary)]/[0.06] border-[var(--accent-primary)]/20"
          : "bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10 dark:hover:bg-white/10 hover:border-[var(--glass-border)]"
      }`}
      onClick={() => onChange(!value)}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            value
              ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-sm"
              : "text-[var(--text-muted)]"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span
            className={`text-sm font-semibold transition-colors ${
              value
                ? "text-[var(--accent-primary)]"
                : "text-[var(--text-primary)]"
            }`}
          >
            {label}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] max-w-[220px] leading-relaxed">
            {desc}
          </span>
        </div>
      </div>

      {/* Toggle switch */}
      <div
        className={`relative w-12 h-7 rounded-full transition-all duration-300 p-1 ${
          value
            ? "bg-[var(--accent-primary)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)]"
            : "bg-white/10"
        }`}
      >
        <motion.div
          animate={{ x: value ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-5 h-5 rounded-full bg-white shadow-md"
        />
      </div>
    </motion.div>
  );
}
