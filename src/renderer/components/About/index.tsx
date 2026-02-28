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
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "../../stores/settings";
import appIconUrl from "../../assets/AppIcon.png";

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  updated?: boolean;
  restarted?: boolean;
  success?: boolean;
  releaseUrl?: string;
  error?: string;
}

interface UpdateProgress {
  stage:
    | "preparing"
    | "downloading"
    | "extracting"
    | "installing"
    | "restarting"
    | "completed";
  percent: number;
  message?: string;
  downloadedBytes?: number;
  totalBytes?: number;
}

export function About() {
  const t = useTranslations();
  const [appVersion, setAppVersion] = useState<string>("1.0.0");
  const appReleaseFallbackUrl =
    "https://g-proxy.940703.xyz/https://github.com/wangdabaoqq/LinJun/releases";

  useEffect(() => {
    window.electronAPI?.app.getVersion().then((v) => {
      if (v) setAppVersion(v);
    });
  }, []);

  const [appUpdateStatus, setAppUpdateStatus] = useState<{
    checking: boolean;
    result?: UpdateInfo;
  }>({ checking: false });

  const [proxyUpdateStatus, setProxyUpdateStatus] = useState<{
    checked: boolean;
    checking: boolean;
    updating: boolean;
    result?: UpdateInfo;
  }>({ checked: false, checking: false, updating: false });
  const [proxyUpdateProgress, setProxyUpdateProgress] =
    useState<UpdateProgress | null>(null);
  const [proxyRestartPromptVisible, setProxyRestartPromptVisible] =
    useState(false);
  const [proxyRestarting, setProxyRestarting] = useState(false);
  const [proxyRestartError, setProxyRestartError] = useState<string | null>(
    null,
  );
  const [proxyRestartDone, setProxyRestartDone] = useState(false);
  const [proxyAutoRestarted, setProxyAutoRestarted] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    const precision = unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
  };

  useEffect(() => {
    window.electronAPI?.proxy.getBinaryVersion().then((result) => {
      if (!result) {
        return;
      }

      setProxyUpdateStatus((prev) => ({
        ...prev,
        checked: prev.checked,
        result: {
          hasUpdate: prev.result?.hasUpdate || false,
          currentVersion: result.version || "unknown",
          latestVersion:
            prev.result?.latestVersion || result.version || "unknown",
          error: result.success ? undefined : result.error,
          updated: prev.result?.updated,
          restarted: prev.result?.restarted,
          success: result.success,
          releaseUrl: prev.result?.releaseUrl,
        },
      }));
    });
  }, []);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.proxy.onUpdateBinaryProgress(
      (progress) => {
        setProxyUpdateProgress(progress);
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleCheckAppUpdate = async () => {
    setAppUpdateStatus({ checking: true });
    try {
      const result = await window.electronAPI?.app.checkForUpdates();
      if (!result) {
        throw new Error("Update check API is unavailable");
      }
      setAppUpdateStatus({ checking: false, result });
    } catch (error) {
      setAppUpdateStatus({
        checking: false,
        result: {
          hasUpdate: false,
          currentVersion: appVersion,
          latestVersion: appVersion,
          error: String(error),
        },
      });
    }
  };

  const handleCheckProxyUpdate = async () => {
    setProxyUpdateStatus((prev) => ({ ...prev, checking: true }));
    try {
      const result = await window.electronAPI?.proxy.checkBinaryUpdate();
      if (!result) {
        throw new Error("Update check API is unavailable");
      }
      setProxyUpdateStatus({
        checked: true,
        checking: false,
        updating: false,
        result,
      });
    } catch (error) {
      setProxyUpdateStatus({
        checked: true,
        checking: false,
        updating: false,
        result: {
          hasUpdate: false,
          currentVersion: "unknown",
          latestVersion: "unknown",
          error: String(error),
        },
      });
    }
  };

  const handleUpdateProxyBinary = async () => {
    setProxyUpdateProgress({ stage: "preparing", percent: 0 });
    setProxyRestartPromptVisible(false);
    setProxyRestartError(null);
    setProxyRestartDone(false);
    setProxyAutoRestarted(false);
    setProxyUpdateStatus((prev) => ({ ...prev, updating: true }));
    try {
      const result = await window.electronAPI?.proxy.updateBinary();
      if (!result) {
        throw new Error("Binary update API is unavailable");
      }
      setProxyUpdateStatus({
        checked: true,
        checking: false,
        updating: false,
        result,
      });

      if (result.updated) {
        if (result.restarted) {
          setProxyAutoRestarted(true);
        } else {
          setProxyRestartPromptVisible(true);
        }
      }

      setProxyUpdateProgress((prev) =>
        prev ? { ...prev, stage: "completed", percent: 100 } : null,
      );
    } catch (error) {
      setProxyUpdateStatus((prev) => ({
        checked: true,
        checking: false,
        updating: false,
        result: {
          hasUpdate: true,
          currentVersion: prev.result?.currentVersion || "unknown",
          latestVersion: prev.result?.latestVersion || "unknown",
          error: String(error),
        },
      }));
      setProxyUpdateProgress(null);
    }
  };

  const handleRestartProxyService = async () => {
    setProxyRestarting(true);
    setProxyRestartError(null);

    try {
      const status = await window.electronAPI?.proxy.status();
      if (!status) {
        throw new Error("Proxy status API unavailable");
      }

      if (status.running) {
        const stopResult = await window.electronAPI?.proxy.stop();
        if (!stopResult?.success) {
          throw new Error("Failed to stop proxy service");
        }
      }

      const startResult = await window.electronAPI?.proxy.start();
      if (!startResult?.success) {
        throw new Error("Failed to start proxy service");
      }

      setProxyRestartPromptVisible(false);
      setProxyRestartDone(true);
      setProxyUpdateStatus((prev) => {
        if (!prev.result) {
          return prev;
        }

        return {
          ...prev,
          result: {
            ...prev.result,
            restarted: true,
          },
        };
      });
    } catch (error) {
      setProxyRestartError(String(error));
    } finally {
      setProxyRestarting(false);
    }
  };

  const handleDownloadAppUpdate = () => {
    handleOpenExternal(
      appUpdateStatus.result?.releaseUrl || appReleaseFallbackUrl,
    );
  };

  const handleOpenExternal = (url: string) => {
    window.electronAPI?.app.openExternal(url);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
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
              {t.app.introName}
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
                  label: t.about.officialWebsite,
                  icon: Globe,
                  url: "https://linjun-site.940703.xyz",
                },
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
                {t.about.appUpdates}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {t.settings.currentVersion}:{" "}
                <span className="text-[var(--text-primary)] font-mono ml-1">
                  {appUpdateStatus.result?.currentVersion || appVersion}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {appUpdateStatus.checking ? (
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
                ) : appUpdateStatus.result &&
                  !appUpdateStatus.result.error &&
                  appUpdateStatus.result.hasUpdate ? (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--success)]/10 shadow-[0_0_8px_var(--success)]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]"></span>
                      </span>
                      <span className="text-xs font-medium text-[var(--success)]">
                        v{appUpdateStatus.result.latestVersion}
                      </span>
                    </div>
                    <button
                      onClick={handleDownloadAppUpdate}
                      className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white text-sm font-medium rounded-full transition-colors flex items-center gap-2 shadow-lg shadow-[var(--accent-primary)]/20"
                    >
                      <Download className="w-4 h-4" />
                      {t.settings.downloadUpdate}
                    </button>
                  </motion.div>
                ) : (
                  <button
                    onClick={handleCheckAppUpdate}
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
            {appUpdateStatus.result && !appUpdateStatus.checking && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                  {appUpdateStatus.result.error ? (
                    <div className="flex items-center gap-2 text-[var(--accent-error)]">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {t.settings.checkFailed}
                      </span>
                    </div>
                  ) : !appUpdateStatus.result.hasUpdate ? (
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

        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-primary)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[var(--accent-primary)]" />
                {t.about.proxyUpdates}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {t.about.currentProxyVersion}:{" "}
                <span className="text-[var(--text-primary)] font-mono ml-1">
                  {proxyUpdateStatus.result?.currentVersion || "unknown"}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {proxyUpdateStatus.checking || proxyUpdateStatus.updating ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-muted)]"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">
                      {proxyUpdateStatus.updating
                        ? `${t.about.updatingProxy}${proxyUpdateProgress ? ` ${proxyUpdateProgress.percent}%` : ""}`
                        : t.settings.checking}
                    </span>
                  </motion.div>
                ) : proxyUpdateStatus.result &&
                  !proxyUpdateStatus.result.error &&
                  proxyUpdateStatus.result.hasUpdate ? (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--success)]/10 shadow-[0_0_8px_var(--success)]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]"></span>
                      </span>
                      <span className="text-xs font-medium text-[var(--success)]">
                        v{proxyUpdateStatus.result.latestVersion}
                      </span>
                    </div>
                    <button
                      onClick={handleUpdateProxyBinary}
                      className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white text-sm font-medium rounded-full transition-colors flex items-center gap-2 shadow-lg shadow-[var(--accent-primary)]/20"
                    >
                      <Download className="w-4 h-4" />
                      {t.about.updateAndRestartProxy}
                    </button>
                  </motion.div>
                ) : (
                  <button
                    onClick={handleCheckProxyUpdate}
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
            {proxyUpdateStatus.updating && proxyUpdateProgress ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-[var(--glass-border)] space-y-2">
                  <div className="h-2 w-full rounded-full bg-[var(--bg-tertiary)]/60 overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                      style={{ width: `${proxyUpdateProgress.percent}%` }}
                    />
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {proxyUpdateProgress.downloadedBytes &&
                    proxyUpdateProgress.totalBytes
                      ? `${formatBytes(proxyUpdateProgress.downloadedBytes)} / ${formatBytes(proxyUpdateProgress.totalBytes)}`
                      : `${proxyUpdateProgress.percent}%`}
                  </div>
                </div>
              </motion.div>
            ) : null}

            {proxyRestartPromptVisible && !proxyUpdateStatus.updating ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-[var(--glass-border)] space-y-3">
                  <p className="text-sm text-[var(--text-primary)]">
                    {t.about.restartServiceQuestion}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRestartProxyService}
                      disabled={proxyRestarting}
                      className="px-3 py-1.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 disabled:opacity-60 text-white text-xs font-medium transition-colors"
                    >
                      {proxyRestarting
                        ? t.about.restartingService
                        : t.settings.restartNow}
                    </button>
                    <button
                      onClick={() => setProxyRestartPromptVisible(false)}
                      disabled={proxyRestarting}
                      className="px-3 py-1.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] disabled:opacity-60 text-xs font-medium text-[var(--text-primary)] transition-colors"
                    >
                      {t.settings.restartLater}
                    </button>
                  </div>
                  {proxyRestartError ? (
                    <p className="text-xs text-[var(--accent-error)]">
                      {proxyRestartError}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            ) : null}

            {proxyAutoRestarted && !proxyUpdateStatus.updating ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                  <div className="flex items-center gap-2 text-[var(--accent-success)]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {t.about.proxyAutoRestarted}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {proxyRestartDone && !proxyUpdateStatus.updating ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                  <div className="flex items-center gap-2 text-[var(--accent-success)]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {t.about.serviceRestarted}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {proxyUpdateStatus.result &&
            proxyUpdateStatus.checked &&
            !proxyUpdateStatus.checking &&
            !proxyUpdateStatus.updating ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                  {proxyUpdateStatus.result.error ? (
                    <div className="text-[var(--accent-error)]">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {proxyUpdateStatus.result.hasUpdate
                            ? t.about.proxyUpdateFailed
                            : t.settings.checkFailed}
                        </span>
                      </div>
                      <p className="mt-1 text-xs opacity-80 break-all">
                        {proxyUpdateStatus.result.error}
                      </p>
                    </div>
                  ) : !proxyUpdateStatus.result.hasUpdate ? (
                    <div className="flex items-center gap-2 text-[var(--accent-success)]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {proxyUpdateStatus.result.updated
                          ? t.about.proxyUpdated
                          : t.settings.upToDate}
                      </span>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
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
            {t.app.copyright
              .replace("{year}", new Date().getFullYear().toString())
              .replace("{name}", t.app.name)}
          </p>
        </div>
      </div>
    </div>
  );
}
