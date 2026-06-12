import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings2, Palette, Network, Zap } from "lucide-react";
import { useSettingsStore, useTranslations } from "../../stores/settings";
import { SettingsTab } from "./types";
import { CoreSection } from "./sections/CoreSection";
import { NetworkSection } from "./sections/NetworkSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { BehaviorSection } from "./sections/BehaviorSection";

export function Settings() {
  const t = useTranslations();
  const slimMode = useSettingsStore((s) => s.slimMode);
  const [activeTab, setActiveTab] = useState<SettingsTab>("core");

  const tabItems = [
    { id: "core", label: t.settings.core, icon: Settings2 },
    { id: "network", label: t.settings.network, icon: Network },
    { id: "appearance", label: t.settings.appearance, icon: Palette },
    { id: "behavior", label: t.settings.behavior, icon: Zap },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={slimMode ? false : { rotate: -15, scale: 0.8, opacity: 0 }}
            animate={slimMode ? { opacity: 1 } : { rotate: 0, scale: 1, opacity: 1 }}
            transition={
              slimMode
                ? { duration: 0 }
                : { type: "spring", stiffness: 200, damping: 15 }
            }
            className="p-3.5 bg-[var(--accent-primary)]/5 rounded-2xl border border-[var(--glass-border)] shadow-lg shadow-[var(--accent-primary)]/5"
          >
            <Settings2 className="w-7 h-7 text-[var(--accent-primary)]" />
          </motion.div>
          <div>
            <motion.h2
              initial={slimMode ? false : { opacity: 0, x: -10 }}
              animate={slimMode ? { opacity: 1 } : { opacity: 1, x: 0 }}
              transition={slimMode ? { duration: 0 } : { delay: 0.1 }}
              className="text-3xl font-bold tracking-tight text-[var(--text-primary)]"
            >
              {t.settings.title}
            </motion.h2>
            <motion.p
              initial={slimMode ? false : { opacity: 0, x: -10 }}
              animate={slimMode ? { opacity: 1 } : { opacity: 1, x: 0 }}
              transition={slimMode ? { duration: 0 } : { delay: 0.15 }}
              className="text-[var(--text-muted)] text-sm"
            >
              {t.settings.subtitle}
            </motion.p>
          </div>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="flex justify-center">
        <motion.div
          initial={slimMode ? false : { opacity: 0, y: 10 }}
          animate={slimMode ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={slimMode ? { duration: 0 } : { delay: 0.2 }}
          className="relative inline-flex p-1.5 bg-[var(--glass-bg)]/60 backdrop-blur-2xl rounded-2xl border border-[var(--glass-border)] shadow-xl"
        >
          {tabItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as SettingsTab)}
              className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 z-10 ${
                activeTab === item.id
                  ? "text-white shadow-sm"
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
                  className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl -z-10 shadow-lg shadow-[var(--accent-primary)]/25"
                  transition={
                    slimMode
                      ? { duration: 0 }
                      : { type: "spring", bounce: 0.15, duration: 0.5 }
                  }
                />
              )}
            </button>
          ))}
        </motion.div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={slimMode ? false : { opacity: 0, y: 20, scale: 0.98 }}
          animate={slimMode ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={slimMode ? { opacity: 1 } : { opacity: 0, y: -15, scale: 0.98 }}
          transition={
            slimMode
              ? { duration: 0 }
              : { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
          }
          className="space-y-6"
        >
          {activeTab === "core" && <CoreSection />}
          {activeTab === "network" && <NetworkSection />}
          {activeTab === "appearance" && <AppearanceSection />}
          {activeTab === "behavior" && <BehaviorSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
