import { motion, AnimatePresence } from "motion/react";
import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-lg",
  className = "",
}: ModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 1. 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl"
            style={{ WebkitBackdropFilter: "blur(24px)" }}
          />

          {/* 2. 弹窗容器 */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            className={`relative w-full ${maxWidth} rounded-2xl overflow-hidden shadow-[0_0_60px_-15px_rgba(0,0,0,0.3)] border border-[var(--glass-border)] flex flex-col max-h-[90vh] ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 背景层 */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] z-0" />
            <div className="absolute inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-2xl z-0" />

            {/* 顶部发光条 */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent shadow-[0_0_20px_rgba(var(--accent-primary),0.5)] z-10 opacity-50" />

            {/* 内容层 */}
            <div className="relative z-10 flex flex-col min-h-0">
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/30 shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50 transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 内容区域 - 可滚动 */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                {children}
              </div>

              {/* 底部按钮区域 */}
              {footer && (
                <div className="px-6 py-4 border-t border-[var(--glass-border)] bg-[var(--bg-secondary)]/30 flex justify-end gap-3 shrink-0">
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// 预定义的按钮组件，保持样式一致
export function ModalButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const baseStyles =
    "px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm";

  const variants = {
    primary:
      "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 shadow-[0_0_20px_-5px_var(--accent-primary)] border border-transparent hover:shadow-[0_0_25px_-5px_var(--accent-primary)]",
    secondary:
      "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/80 border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]",
    danger:
      "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30",
    ghost:
      "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/50",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
