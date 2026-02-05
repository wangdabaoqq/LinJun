import { motion } from "motion/react";
import { Terminal, ChevronRight } from "lucide-react";

interface QuotaTipProps {
  children: React.ReactNode;
  onAction?: () => void;
  actionLabel?: string;
}

export function QuotaTip({ children, onAction, actionLabel }: QuotaTipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group relative flex w-full items-center gap-3 py-2 pl-3 pr-1"
    >
      <div className="absolute left-0 top-1/2 h-[70%] w-[3px] -translate-y-1/2 bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)] rounded-r-[1px]" />

      <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-[var(--accent-primary)] select-none">
        <Terminal size={12} strokeWidth={2.5} />
        <span>SYSTEM_HINT</span>
        <span className="text-[var(--text-tertiary)] opacity-50">::</span>
      </div>

      <div className="flex-1 truncate text-xs font-medium text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]">
        {children}
      </div>

      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="flex shrink-0 items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-bold uppercase text-[var(--accent-primary)] opacity-80 transition-all hover:bg-[var(--accent-primary)]/10 hover:opacity-100 hover:shadow-[0_0_10px_-4px_var(--accent-primary)] active:scale-95"
        >
          <span className="opacity-50">[</span>
          <span className="mx-0.5">{actionLabel}</span>
          <span className="opacity-50">]</span>
          <ChevronRight size={10} className="ml-0.5" />
        </button>
      )}
    </motion.div>
  );
}
