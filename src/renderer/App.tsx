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
import { useDashboardStore } from "./stores/dashboard";
import { ProxyToggle } from "./components/ProxyToggle";
import { SunIcon } from "./components/ui/sun";
import { MoonIcon } from "./components/ui/moon";

import { LanguagesIcon } from "./components/ui/languages";
import log from "@renderer/utils/logger";

import { TrayView } from "./components/Tray/TrayView";
import { ErrorBoundary } from "./components/ErrorBoundary";

function LiveMetrics() {
  const t = useTranslations();
  const stats = useDashboardStore((state) => state.getRequestStats());
  const accounts = useDashboardStore((state) => state.accounts);

  const activeAccounts = accounts.filter((a) => a.status === "active").length;
  const successRate =
    stats.totalRequests > 0
      ? ((stats.successCount / stats.totalRequests) * 100).toFixed(1) + "%"
      : "--";

  return (
    <div className="flex items-center gap-3 no-drag">
      <div className="metric-badge flex items-center gap-2">
        <span className="text-[var(--text-dim)]">{t.topbar.successRate}</span>
        <span className="text-[var(--accent-primary)] font-semibold">
          {successRate}
        </span>
      </div>
      <div className="metric-badge flex items-center gap-2">
        <span className="text-[var(--text-dim)]">{t.topbar.requests}</span>
        <span className="text-[var(--accent-secondary)] font-semibold">
          {stats.totalRequests.toLocaleString()}
        </span>
      </div>
      <div className="metric-badge flex items-center gap-2">
        <span className="text-[var(--text-dim)]">{t.topbar.accounts}</span>
        <span className="text-[var(--accent-tertiary)] font-semibold">
          {activeAccounts}
        </span>
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
  const _port = useSettingsStore((s) => s.port);
  const isMac = navigator.userAgent.includes("Mac");
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    window.electronAPI?.app
      .getVersion()
      .then((v) => {
        setVersion(v ? `v${v}` : "");
      })
      .catch((error) => {
        log.error("[App] Failed to get version:", error);
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
            {t.app.topbarName}
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

import { IntroPage } from "./components/Intro/IntroPage";

export default function App() {
  const [isTrayMode, setIsTrayMode] = useState(
    window.location.hash === "#tray",
  );
  const [showIntro, setShowIntro] = useState(() => {
    return localStorage.getItem("hasSeenIntro") !== "true";
  });
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const refreshAll = useDashboardStore((s) => s.refreshAll);

  useEffect(() => {
    const handleHashChange = () => {
      setIsTrayMode(window.location.hash === "#tray");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!isTrayMode) {
      refreshAll();
    }
  }, [refreshAll, isTrayMode]);

  // Check if intro has been seen before
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("hasSeenIntro");
    if (hasSeenIntro === "true") {
      setShowIntro(false);
    }
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    localStorage.setItem("hasSeenIntro", "true");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={setCurrentPage} />;
      case "quota":
        return <Quota onNavigate={setCurrentPage} />;
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

  if (isTrayMode) {
    return <TrayView />;
  }

  return (
    <div className="flex flex-col h-screen relative">
      <AnimatePresence>
        {showIntro && <IntroPage onComplete={handleIntroComplete} />}
      </AnimatePresence>
      <BokehBackground />
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 overflow-hidden flex flex-col">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 18, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.99 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex-1 min-h-0 flex flex-col"
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
