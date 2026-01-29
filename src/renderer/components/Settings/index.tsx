import { useState } from "react";
import {
  useTranslations,
  useSettingsStore,
  ThemeType,
} from "../../stores/settings";
import { Language } from "../../i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings2,
  Palette,
  RefreshCw,
  Clock,
  Hash,
  Rocket,
  Power,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Network,
  Timer,
  Sun,
  Moon,
  Languages,
  Gauge,
  RotateCcw,
  Shuffle,
  ListOrdered,
  ArrowDownToLine,
  Eye,
  EyeOff,
  Link,
  AlertTriangle,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   Section Header Component
   ─────────────────────────────────────────────────────────────────────────── */
interface SectionHeaderProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: "primary" | "teal" | "indigo" | "magenta" | "amber";
}

function SectionHeader({
  title,
  description,
  icon: Icon,
  accentColor = "primary",
}: SectionHeaderProps) {
  const colorStyles = {
    primary: {
      iconBg: "bg-[var(--accent-primary)]/10",
      iconColor: "text-[var(--accent-primary)]",
      border: "border-[var(--accent-primary)]/20",
    },
    teal: {
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-500",
      border: "border-teal-500/20",
    },
    indigo: {
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-500",
      border: "border-indigo-500/20",
    },
    magenta: {
      iconBg: "bg-pink-500/10",
      iconColor: "text-pink-500",
      border: "border-pink-500/20",
    },
    amber: {
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      border: "border-amber-500/20",
    },
  };

  const styles = colorStyles[accentColor];

  return (
    <div className="flex items-center gap-4 mb-6">
      <div
        className={`p-3 rounded-2xl ${styles.iconBg} border ${styles.border} shadow-sm`}
      >
        <Icon className={`w-5 h-5 ${styles.iconColor}`} />
      </div>
      <div className="flex-1">
        <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Setting Card Component
   ─────────────────────────────────────────────────────────────────────────── */
interface SettingCardProps {
  children: React.ReactNode;
  variant?: "primary" | "teal" | "indigo" | "magenta" | "default";
  className?: string;
  noPadding?: boolean;
}

function SettingCard({
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

/* ─────────────────────────────────────────────────────────────────────────────
   Theme Card Component
   ─────────────────────────────────────────────────────────────────────────── */
interface ThemeCardProps {
  themeId: ThemeType;
  name: string;
  colors: string[];
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}

function ThemeCard({
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
              : "bg-white/5 text-[var(--text-muted)] group-hover:bg-white/10"
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

/* ─────────────────────────────────────────────────────────────────────────────
   Custom Toggle Component
   ─────────────────────────────────────────────────────────────────────────── */
interface CustomToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

function CustomToggle({
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
              : "bg-white/5 text-[var(--text-muted)]"
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

/* ─────────────────────────────────────────────────────────────────────────────
   Custom Range Slider Component
   ─────────────────────────────────────────────────────────────────────────── */
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

function CustomSlider({
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

/* ─────────────────────────────────────────────────────────────────────────────
   Inline Setting Row Component
   ─────────────────────────────────────────────────────────────────────────── */
interface SettingRowProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  description?: string;
}

function SettingRow({
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

/* ─────────────────────────────────────────────────────────────────────────────
   Routing Strategy Card Component
   ─────────────────────────────────────────────────────────────────────────── */
interface StrategyOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface StrategyCardsProps {
  value: string;
  onChange: (value: string) => void;
  options: StrategyOption[];
}

function StrategyCards({ value, onChange, options }: StrategyCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((option) => (
        <motion.button
          key={option.value}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onChange(option.value)}
          className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
            value === option.value
              ? "bg-teal-500/10 border border-teal-500/30 text-teal-500"
              : "bg-black/5 dark:bg-white/5 border border-transparent hover:bg-black/10 dark:hover:bg-white/10 hover:border-[var(--glass-border)] text-[var(--text-primary)]"
          }`}
        >
          <option.icon
            className={`w-4 h-4 ${value === option.value ? "text-teal-500" : "text-[var(--text-muted)]"}`}
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
              className="w-2 h-2 rounded-full bg-teal-500"
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
    Main Settings Component
    ─────────────────────────────────────────────────────────────────────────── */
type SettingsTab = "core" | "network" | "appearance" | "behavior";

export function Settings() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<SettingsTab>("core");
  const [copied, setCopied] = useState(false);
  const [endpointCopied, setEndpointCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const {
    port,
    endpoint,
    managementSecret,
    autoStart,
    autoLaunch,
    routingStrategy,
    requestRetry,
    maxRetryInterval,
    theme,
    language,
    switchProject,
    switchPreviewModel,
    setPort,
    setEndpoint,
    getEffectiveEndpoint,
    generateManagementSecret,
    setAutoStart,
    setAutoLaunch,
    setRoutingStrategy,
    setRequestRetry,
    setMaxRetryInterval,
    setTheme,
    setLanguage,
    setSwitchProject,
    setSwitchPreviewModel,
  } = useSettingsStore();

  const handleCopy = () => {
    navigator.clipboard.writeText(managementSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(getEffectiveEndpoint());
    setEndpointCopied(true);
    setTimeout(() => setEndpointCopied(false), 2000);
  };

  const themes: {
    id: ThemeType;
    name: string;
    colors: string[];
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "dark",
      name: t.settings.darkMode,
      colors: ["#0a84ff", "#5e5ce6", "#bf5af2"],
      icon: Moon,
    },
    {
      id: "light",
      name: t.settings.lightMode,
      colors: ["#7a9e7e", "#a8b4c4", "#d4b896"],
      icon: Sun,
    },
  ];

  const strategyOptions: StrategyOption[] = [
    {
      value: "round-robin",
      label: t.settings.roundRobin,
      icon: ListOrdered,
      description: t.settings.roundRobinDesc,
    },
    {
      value: "fill-first",
      label: t.settings.fillFirst,
      icon: ArrowDownToLine,
      description: t.settings.fillFirstDesc,
    },
    {
      value: "random",
      label: t.settings.random,
      icon: Shuffle,
      description: t.settings.randomDesc,
    },
  ];

  const tabItems = [
    { id: "core", label: t.settings.core, icon: Settings2 },
    { id: "network", label: t.settings.network, icon: Network },
    { id: "appearance", label: t.settings.appearance, icon: Palette },
    { id: "behavior", label: t.settings.behavior, icon: Zap },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* ─────────────────────────────────────────────────────────────────────
          Header
          ───────────────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ rotate: -15, scale: 0.8, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="p-3.5 bg-gradient-to-br from-[var(--accent-primary)]/15 to-[var(--accent-primary)]/5 rounded-2xl border border-[var(--accent-primary)]/20 shadow-lg shadow-[var(--accent-primary)]/10"
          >
            <Settings2 className="w-7 h-7 text-[var(--accent-primary)]" />
          </motion.div>
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-bold tracking-tight text-[var(--text-primary)]"
            >
              {t.settings.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-[var(--text-muted)] text-sm"
            >
              {t.settings.subtitle}
            </motion.p>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          Tab Switcher
          ───────────────────────────────────────────────────────────────────── */}
      <div className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative inline-flex p-1.5 bg-[var(--glass-bg)]/60 backdrop-blur-2xl rounded-2xl border border-[var(--glass-border)] shadow-xl"
        >
          {tabItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as SettingsTab)}
              className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 z-10 ${
                activeTab === item.id
                  ? "text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <item.icon
                className={`w-4 h-4 transition-all duration-500 ${
                  activeTab === item.id ? "scale-110" : "scale-100"
                }`}
              />
              {item.label}
              {activeTab === item.id && (
                <motion.div
                  layoutId="active-tab-bg"
                  className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary,var(--accent-primary))] rounded-xl -z-10 shadow-lg shadow-[var(--accent-primary)]/25"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
            </button>
          ))}
        </motion.div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          Tab Content
          ───────────────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="space-y-6"
        >
          {/* ═══════════════════════════════════════════════════════════════════
              CORE TAB - 核心设置
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "core" && (
            <div className="space-y-6">
              {/* API Key Section - Full Width */}
              <SettingCard
                variant="primary"
                className="relative overflow-hidden"
              >
                {/* Decorative background gradient */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--accent-primary)]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative">
                  <SectionHeader
                    title={t.settings.apiKey}
                    description={t.settings.apiKeyDesc}
                    icon={ShieldCheck}
                    accentColor="primary"
                  />

                  <div className="flex flex-col gap-4">
                    <div className="relative w-full">
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 rounded-xl opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />

                        <div className="relative flex items-center">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={managementSecret}
                            readOnly
                            className="w-full bg-black/5 dark:bg-[#000000]/40 border border-[var(--glass-border)] text-[var(--text-primary)] text-sm font-mono rounded-xl pl-5 pr-32 py-4 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/20 transition-all placeholder:text-[var(--text-dim)] shadow-inner backdrop-blur-xl"
                          />

                          <div className="absolute right-2 flex items-center gap-1">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setShowPassword(!showPassword)}
                              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                              title={
                                showPassword ? "Hide API Key" : "Show API Key"
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </motion.button>

                            <div className="w-px h-4 bg-[var(--glass-border)] mx-1" />

                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={handleCopy}
                              className={`p-2 rounded-lg transition-colors ${
                                copied
                                  ? "text-green-500 bg-green-500/10"
                                  : "text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                              }`}
                              title={t.settings.copy}
                            >
                              {copied ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.1, rotate: 180 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={generateManagementSecret}
                              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                              title={t.settings.refresh}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-[var(--text-dim)] flex items-center gap-1.5 pl-1">
                        <ShieldCheck className="w-3 h-3" />
                        Keep this key secret. It provides full administrative
                        access.
                      </p>
                    </div>
                  </div>
                </div>
              </SettingCard>

              {/* Port Configuration */}
              <SettingCard variant="teal">
                <SectionHeader
                  title={t.settings.port}
                  description={t.settings.portDesc}
                  icon={Hash}
                  accentColor="teal"
                />
                <SettingRow label={t.settings.port} icon={Hash}>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="glass-input w-full font-mono text-lg py-3.5 px-5 bg-black/5 dark:bg-black/20 border-transparent focus:border-teal-500/40 focus:ring-2 focus:ring-teal-500/15"
                  />
                </SettingRow>
              </SettingCard>

              {/* Endpoint Configuration */}
              <SettingCard variant="indigo">
                <SectionHeader
                  title={t.settings.endpoint}
                  description={t.settings.endpointDesc}
                  icon={Link}
                  accentColor="indigo"
                />
                <SettingRow label={t.settings.endpoint} icon={Link}>
                  <div className="relative flex items-center">
                    <div className="w-full bg-black/5 dark:bg-[#000000]/40 border border-[var(--glass-border)] text-[var(--text-primary)] text-sm font-mono rounded-xl pl-5 pr-14 py-4 shadow-inner backdrop-blur-xl select-all cursor-text">
                      {getEffectiveEndpoint()}
                    </div>
                    <div className="absolute right-2 flex items-center">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCopyEndpoint}
                        className={`p-2 transition-colors ${
                          endpointCopied
                            ? "text-green-500"
                            : "text-[var(--text-muted)] hover:text-indigo-500"
                        }`}
                        title={t.settings.copy}
                      >
                        {endpointCopied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </SettingRow>
              </SettingCard>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              NETWORK TAB - 网络配置
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "network" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Routing Strategy */}
              <SettingCard variant="teal">
                <SectionHeader
                  title={t.settings.routingStrategy}
                  description={t.settings.routingStrategyDesc}
                  icon={Gauge}
                  accentColor="teal"
                />
                <StrategyCards
                  value={routingStrategy}
                  onChange={(v) =>
                    setRoutingStrategy(
                      v as "round-robin" | "fill-first" | "random",
                    )
                  }
                  options={strategyOptions}
                />
              </SettingCard>

              {/* Retry Configuration */}
              <SettingCard variant="indigo">
                <SectionHeader
                  title={t.settings.retryConfig}
                  description={t.settings.retryConfigDesc}
                  icon={Timer}
                  accentColor="indigo"
                />
                <div className="space-y-8">
                  {/* Request Retry Slider */}
                  <div className="relative">
                    <CustomSlider
                      value={requestRetry}
                      onChange={setRequestRetry}
                      min={0}
                      max={10}
                      label={t.settings.requestRetry}
                      unit={t.settings.attempts}
                      icon={RotateCcw}
                      accentColor="teal"
                      formatValue={(v) =>
                        v === 0 ? (
                          <span className="text-sm font-semibold opacity-80">
                            {t.settings.noRetries}
                          </span>
                        ) : (
                          <>
                            <span className="text-lg font-bold tabular-nums">
                              {v}
                            </span>
                            <span className="text-[10px] uppercase opacity-70 font-medium">
                              {t.settings.attempts}
                            </span>
                          </>
                        )
                      }
                    />
                  </div>

                  {/* Max Retry Interval Slider */}
                  <div className="relative">
                    <CustomSlider
                      value={maxRetryInterval}
                      onChange={setMaxRetryInterval}
                      min={1}
                      max={300}
                      label={t.settings.maxRetryInterval}
                      unit={t.settings.seconds}
                      icon={Clock}
                      accentColor="teal"
                      disabled={requestRetry === 0}
                      formatValue={(v) =>
                        requestRetry === 0 ? (
                          <span className="text-sm font-semibold opacity-60">
                            {t.settings.notApplicable}
                          </span>
                        ) : (
                          <>
                            <span className="text-lg font-bold tabular-nums">
                              {v}
                            </span>
                            <span className="text-[10px] uppercase opacity-70 font-medium">
                              {t.settings.seconds}
                            </span>
                          </>
                        )
                      }
                    />
                  </div>
                </div>
              </SettingCard>

              {/* Quota Exceeded Handling */}
              <SettingCard variant="magenta" className="lg:col-span-2">
                <SectionHeader
                  title={t.settings.quotaExceeded}
                  description={t.settings.quotaExceededDesc}
                  icon={AlertTriangle}
                  accentColor="magenta"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CustomToggle
                    value={switchProject}
                    onChange={setSwitchProject}
                    label={t.settings.switchProject}
                    desc={t.settings.switchProjectDesc}
                    icon={Shuffle}
                  />
                  <CustomToggle
                    value={switchPreviewModel}
                    onChange={setSwitchPreviewModel}
                    label={t.settings.switchPreviewModel}
                    desc={t.settings.switchPreviewModelDesc}
                    icon={Zap}
                  />
                </div>
              </SettingCard>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              APPEARANCE TAB - 外观设置
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "appearance" && (
            <SettingCard variant="indigo">
              <SectionHeader
                title={t.settings.appearance}
                description={t.settings.appearanceDesc}
                icon={Palette}
                accentColor="indigo"
              />
              <div className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                    <Palette className="w-3.5 h-3.5" />
                    {t.settings.theme}
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {themes.map((th) => (
                      <ThemeCard
                        key={th.id}
                        themeId={th.id}
                        name={th.name}
                        colors={th.colors}
                        selected={theme === th.id}
                        onClick={() => setTheme(th.id)}
                        icon={th.icon}
                      />
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

                {/* Language Selection */}
                <SettingRow label={t.settings.language} icon={Languages}>
                  <Select
                    value={language}
                    onValueChange={(v) => setLanguage(v as Language)}
                  >
                    <SelectTrigger className="w-full h-13 bg-white/20 dark:bg-black/20 border-transparent focus:ring-2 focus:ring-indigo-500/30 rounded-xl px-5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--glass-bg)] backdrop-blur-2xl border-[var(--glass-border)] rounded-xl overflow-hidden">
                      <SelectItem
                        value="en"
                        className="py-3 pl-8 pr-4 focus:bg-indigo-500/10 focus:text-indigo-500"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">🇺🇸</span>
                          <span>{t.settings.english}</span>
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="zh"
                        className="py-3 pl-8 pr-4 focus:bg-indigo-500/10 focus:text-indigo-500"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">🇨🇳</span>
                          <span>{t.settings.chinese}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </div>
            </SettingCard>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              BEHAVIOR TAB - 行为设置
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "behavior" && (
            <SettingCard variant="magenta">
              <SectionHeader
                title={t.settings.behavior}
                description={t.settings.behaviorDesc}
                icon={Rocket}
                accentColor="magenta"
              />
              <div className="space-y-3">
                <CustomToggle
                  value={autoLaunch}
                  onChange={setAutoLaunch}
                  label={t.settings.autoLaunch}
                  desc={t.settings.autoLaunchDesc}
                  icon={Power}
                />
                <CustomToggle
                  value={autoStart}
                  onChange={setAutoStart}
                  label={t.settings.autoStart}
                  desc={t.settings.autoStartDesc}
                  icon={Rocket}
                />
              </div>
            </SettingCard>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
