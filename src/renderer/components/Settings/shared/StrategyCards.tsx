import { motion } from "motion/react";
import { StrategyOption } from "../types";

interface StrategyCardsProps {
  value: string;
  onChange: (value: string) => void;
  options: StrategyOption[];
}

export function StrategyCards({
  value,
  onChange,
  options,
}: StrategyCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((option) => (
        <motion.button
          key={option.value}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onChange(option.value)}
          className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 border border-[var(--glass-border)] ${
            value === option.value
              ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
              : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:border-[var(--glass-border-hover)] text-[var(--text-primary)]"
          }`}
        >
          <option.icon
            className={`w-4 h-4 ${value === option.value ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{option.label}</div>
            <div className="text-[10px] text-[var(--text-muted)] truncate">
              {option.description}
            </div>
          </div>
          {value === option.value && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]"
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}
