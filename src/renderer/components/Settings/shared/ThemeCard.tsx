import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { ThemeType } from "../../../stores/settings";

interface ThemeCardProps {
  themeId: ThemeType;
  name: string;
  colors: string[];
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}

export function ThemeCard({
  themeId,
  name,
  colors,
  selected,
  onClick,
  icon: Icon,
}: ThemeCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 w-full text-left ${
        selected
          ? "bg-gradient-to-br from-[var(--accent-primary)]/15 to-[var(--accent-primary)]/5 border-2 border-[var(--accent-primary)] shadow-[0_0_30px_rgba(var(--accent-rgb),0.15)]"
          : "bg-[var(--glass-bg)]/60 border-2 border-transparent hover:border-[var(--glass-border-hover)] hover:bg-[var(--glass-bg)]"
      }`}
    >
      {/* Decorative gradient orb */}
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl transition-opacity duration-500 ${
          selected ? "opacity-30" : "opacity-0 group-hover:opacity-20"
        }`}
        style={{
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[2]})`,
        }}
      />

      <div className="relative flex items-center gap-4">
        {/* Theme icon */}
        <div
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            selected
              ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
              : "bg-white/5 text-[var(--text-muted)]"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Color palette preview */}
        <div className="flex gap-2">
          {colors.map((color, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={{ scale: selected ? 1.05 : 1 }}
              transition={{ delay: i * 0.05 }}
              className="w-6 h-6 rounded-full border-2 border-[var(--glass-bg)] shadow-sm ring-1 ring-black/5"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Theme name */}
        <div className="flex-1">
          <div
            className={`font-semibold text-sm transition-colors ${
              selected
                ? "text-[var(--accent-primary)]"
                : "text-[var(--text-primary)]"
            }`}
          >
            {name}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-medium">
            {themeId} mode
          </div>
        </div>

        {/* Selected indicator */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="bg-[var(--accent-primary)] text-white rounded-full p-1.5 shadow-lg shadow-[var(--accent-primary)]/30"
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
