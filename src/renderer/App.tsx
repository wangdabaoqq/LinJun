/*
 * @Author: baobaobao
 * @Date: 2026-01-19 17:46:10
 * @LastEditTime: 2026-01-21 14:24:50
 * @LastEditors: baobaobao
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar, Page } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Providers } from "./components/Providers";
import { Quota } from "./components/Quota";
import { Agents } from "./components/Agents";
import { ApiKeys } from "./components/ApiKeys";
import { Logs } from "./components/Logs";
import { Settings } from "./components/Settings";
import { About } from "./components/About";
import {
  useTranslations,
  useSettingsStore,
  useTheme,
  useLanguage,
} from "./stores/settings";
import { ProxyToggle } from "./components/ProxyToggle";
import { SunIcon } from "./components/ui/sun";
import { MoonIcon } from "./components/ui/moon";

import { LanguagesIcon } from "./components/ui/languages";

function LiveMetrics() {
  return (
    <div className="flex items-center gap-3 no-drag">
      <div className="metric-badge flex items-center gap-2">
        <span className="text-[var(--text-dim)]">TPS</span>
        <span className="text-[var(--accent-primary)] font-semibold">42.5</span>
      </div>
      <div className="metric-badge flex items-center gap-2">
        <span className="text-[var(--text-dim)]">P99</span>
        <span className="text-[var(--accent-secondary)] font-semibold">
          1.2s
        </span>
      </div>
      <div className="metric-badge flex items-center gap-2">
        <span className="text-[var(--text-dim)]">Tok/s</span>
        <span className="text-[var(--accent-tertiary)] font-semibold">847</span>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="no-drag w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 group"
      title={isDark ? "切换到浅色模式" : "切换到深色模式"}
    >
      {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  );
}

function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "zh" ? "en" : "zh");
  };

  return (
    <button
      onClick={toggleLanguage}
      className="no-drag w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 group"
      title={language === "zh" ? "Switch to English" : "切换到中文"}
    >
      <LanguagesIcon
        className="text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]"
        size={18}
      />
    </button>
  );
}

function TopBar() {
  const t = useTranslations();
  const port = useSettingsStore((s) => s.port);
  const isMac = navigator.userAgent.includes("Mac");
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    window.electronAPI?.app.getVersion().then((v) => {
      setVersion(v ? `v${v}` : "");
    });
  }, []);

  return (
    <div
      className={`glass-topbar flex items-center justify-between px-4 drag-region transition-all duration-300 ${
        isMac ? "h-14" : "h-12"
      }`}
    >
      <div className={`flex items-center gap-4 ${isMac ? "pl-20" : ""}`}>
        <div className="flex items-center gap-3 ml-2">
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {t.app.name}
          </span>
          <span className="text-xs text-[var(--text-dim)] bg-soft px-2 py-0.5 rounded">
            {version}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <LiveMetrics />
        <ThemeToggle />
        <LanguageToggle />
        <ProxyToggle />
      </div>
    </div>
  );
}

function BokehBackground() {
  return (
    <div className="bokeh-bg">
      <div className="bokeh-blob bokeh-blob-1" />
      <div className="bokeh-blob bokeh-blob-2" />
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "quota":
        return <Quota />;
      case "providers":
        return <Providers />;
      case "agents":
        return <Agents />;
      case "apiKeys":
        return <ApiKeys />;
      case "logs":
        return <Logs />;
      case "settings":
        return <Settings />;
      case "about":
        return <About />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col h-screen relative">
      <BokehBackground />
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 18, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
