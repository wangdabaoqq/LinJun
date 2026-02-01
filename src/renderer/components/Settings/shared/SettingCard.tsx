import { motion } from "motion/react";

interface SettingCardProps {
  children: React.ReactNode;
  variant?: "primary" | "teal" | "indigo" | "magenta" | "default";
  className?: string;
  noPadding?: boolean;
}

export function SettingCard({
  children,
  variant = "default",
  className = "",
  noPadding = false,
}: SettingCardProps) {
  const variantStyles = {
    primary:
      "border-[var(--accent-primary)]/15 bg-gradient-to-br from-[var(--accent-primary)]/[0.03] to-transparent",
    teal: "border-teal-500/15 bg-gradient-to-br from-teal-500/[0.03] to-transparent",
    indigo:
      "border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.03] to-transparent",
    magenta:
      "border-pink-500/15 bg-gradient-to-br from-pink-500/[0.03] to-transparent",
    default: "border-[var(--glass-border)] bg-[var(--glass-bg)]/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`glass-card border backdrop-blur-xl transition-all duration-300 hover:shadow-lg ${variantStyles[variant]} ${noPadding ? "" : "p-6"} ${className}`}
    >
      {children}
    </motion.div>
  );
}
