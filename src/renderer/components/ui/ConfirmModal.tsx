import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, Info, X, Loader2 } from "lucide-react";
import { ModalButton } from "./Modal";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const icons = {
    danger: <Trash2 className="w-8 h-8" />,
    warning: <AlertTriangle className="w-8 h-8" />,
    info: <Info className="w-8 h-8" />,
  };

  const colors = {
    danger: "text-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]",
    warning:
      "text-yellow-500 bg-yellow-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    info: "text-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]",
  };

  const accentColors = {
    danger: "var(--error)",
    warning: "var(--warning)",
    info: "var(--accent-primary)",
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl"
            style={{ WebkitBackdropFilter: "blur(24px)" }}
            onClick={onClose}
          />

          {/* 弹窗容器 */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-[420px] rounded-3xl overflow-hidden border border-[var(--glass-border)] flex flex-col shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)] isolation-isolate"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 背景层 */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] z-[-1]" />
            <div className="absolute inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-3xl z-[-1]" />

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.12, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.8 }}
              className="absolute -top-[25%] -right-[15%] w-72 h-72 blur-[100px] rounded-full pointer-events-none"
              style={{ backgroundColor: accentColors[variant] }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="absolute -bottom-[25%] -left-[15%] w-72 h-72 blur-[100px] rounded-full pointer-events-none"
              style={{ backgroundColor: accentColors[variant] }}
            />

            <div
              className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30 shadow-[0_0_10px_current]"
              style={{ color: accentColors[variant] }}
            />

            {/* 内容 */}
            <div className="relative z-10 p-8 flex flex-col items-center text-center">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 ${colors[variant]}`}
              >
                {icons[variant]}
              </div>

              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                {title}
              </h3>

              <p className="text-sm text-[var(--text-muted)] leading-relaxed px-2 font-medium">
                {description}
              </p>
            </div>

            {/* 底部按钮 */}
            <div className="px-8 py-6 flex gap-3 bg-[var(--bg-secondary)]/30 border-t border-[var(--glass-border)]">
              <ModalButton
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-3"
              >
                {cancelText}
              </ModalButton>
              <ModalButton
                variant={variant === "danger" ? "danger" : "primary"}
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-[1.5] py-3 shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  confirmText
                )}
              </ModalButton>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all active:scale-95 z-20"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
