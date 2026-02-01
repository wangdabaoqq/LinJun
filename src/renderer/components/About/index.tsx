import { useState, useEffect } from "react";
import {
  Loader2,
  Globe,
  Download,
  CheckCircle2,
  AlertCircle,
  Github,
  FileText,
  Bug,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "../../stores/settings";
import appIconUrl from "../../assets/AppIcon.png";

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl?: string;
  error?: string;
}

export function About() {
  const t = useTranslations();
  const [appVersion, setAppVersion] = useState<string>("1.0.0");

  useEffect(() => {
    window.electronAPI?.app.getVersion().then((v) => {
      if (v) setAppVersion(v);
    });
  }, []);

  const [updateStatus, setUpdateStatus] = useState<{
    checking: boolean;
    result?: UpdateInfo;
  }>({ checking: false });

  const handleCheckUpdate = async () => {
    setUpdateStatus({ checking: true });
    try {
      const result = await window.electronAPI?.app.checkForUpdates();
      setUpdateStatus({ checking: false, result });
    } catch (error) {
      setUpdateStatus({
        checking: false,
        result: {
          hasUpdate: false,
          currentVersion: "1.0.0",
          latestVersion: "1.0.0",
          error: String(error),
        },
      });
    }
  };

  const handleOpenExternal = (url: string) => {
    window.electronAPI?.app.openExternal(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 px-4 animate-fade-in">
      <div className="flex flex-col items-center justify-center py-10 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent-primary)]/10 blur-[80px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mb-6"
        >
          <div className="relative w-24 h-24 rounded-[2rem] glass-card p-4 shadow-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden">
            <img
              src={appIconUrl}
              alt="LinJun Logo"
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
        </motion.div>

        <div className="space-y-2 z-10">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            霖君
          </h1>
          <p className="text-[var(--text-muted)] font-medium max-w-sm mx-auto">
            {t.about.tagline}
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 mt-3 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
            <span className="text-xs font-mono text-[var(--text-muted)]">
              v{appVersion}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="glass-card p-6 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)] flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            {t.about.links}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: "GitHub Repository",
                icon: Github,
                url: "https://github.com/wangdabaoqq/LinJun",
              },
              {
                label: t.about.documentation,
                icon: FileText,
                url: "https://github.com/wangdabaoqq/LinJun#readme",
              },
              {
                label: t.about.reportIssue,
                icon: Bug,
                url: "https://github.com/wangdabaoqq/LinJun/issues",
              },
            ].map((link) => (
              <button
                key={link.label}
                onClick={() => handleOpenExternal(link.url)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] hover:border-[var(--glass-border-hover)] transition-all group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-[var(--bg-tertiary)]/50 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                    <link.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors font-medium">
                    {link.label}
                  </span>
                </div>
                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)]/30 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                  <span className="text-[10px] text-[var(--text-primary)]">
                    ↗
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-primary)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
              {t.settings.updates}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {t.settings.currentVersion}:{" "}
              <span className="text-[var(--text-primary)] font-mono ml-1">
                {updateStatus.result?.currentVersion || appVersion}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              {updateStatus.checking ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-muted)]"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">
                    {t.settings.checking}
                  </span>
                </motion.div>
              ) : updateStatus.result &&
                !updateStatus.result.error &&
                updateStatus.result.hasUpdate ? (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-warning)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-warning)]"></span>
                    </span>
                    <span className="text-xs font-medium text-[var(--accent-warning)]">
                      v{updateStatus.result.latestVersion}
                    </span>
                  </div>
                  {updateStatus.result.releaseUrl && (
                    <button
                      onClick={() =>
                        handleOpenExternal(updateStatus.result!.releaseUrl!)
                      }
                      className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white text-sm font-medium rounded-full transition-colors flex items-center gap-2 shadow-lg shadow-[var(--accent-primary)]/20"
                    >
                      <Download className="w-4 h-4" />
                      {t.settings.downloadUpdate}
                    </button>
                  )}
                </motion.div>
              ) : (
                <button
                  onClick={handleCheckUpdate}
                  className="px-4 py-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] rounded-full text-sm text-[var(--text-primary)] font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <Globe className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                  {t.settings.checkUpdate}
                </button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {updateStatus.result && !updateStatus.checking && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                {updateStatus.result.error ? (
                  <div className="flex items-center gap-2 text-[var(--accent-error)]">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {t.settings.checkFailed}
                    </span>
                  </div>
                ) : !updateStatus.result.hasUpdate ? (
                  <div className="flex items-center gap-2 text-[var(--accent-success)]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {t.settings.upToDate}
                    </span>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center space-y-3 pt-8 pb-4 border-t border-[var(--glass-border)] opacity-60">
        <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--text-dim)] uppercase">
          {t.about.credits}
        </p>
        <p className="text-xs text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
          {t.about.builtWith}
        </p>
        <p className="text-[10px] text-[var(--text-dim)] font-mono">
          © 2026 霖君 • MIT License
        </p>
      </div>
    </div>
  );
}
