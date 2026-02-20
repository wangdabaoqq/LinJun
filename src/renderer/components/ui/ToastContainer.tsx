import { AnimatePresence, motion } from "motion/react";
import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useToastStore, ToastType } from "../../stores/toast";

const ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  error:
    "bg-red-500/10 border-red-500/30 text-red-400 dark:bg-red-500/15 dark:border-red-500/40",
  warning:
    "bg-amber-500/10 border-amber-500/30 text-amber-400 dark:bg-amber-500/15 dark:border-amber-500/40",
  success:
    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/40",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400 dark:bg-blue-500/15 dark:border-blue-500/40",
};

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg ${STYLES[t.type]}`}
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed flex-1">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
