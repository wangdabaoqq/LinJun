import { useState } from "react";
import { useTranslations } from "../../stores/settings";

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl?: string;
  error?: string;
}

export function About() {
  const t = useTranslations();

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          {t.nav.about}
        </h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          {t.about.subtitle}
        </p>
      </div>

      <div className="glass-card glass-card-teal p-6 text-center">
        <div className="text-6xl mb-4 text-[var(--accent-teal)] glow-teal">
          ◈
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-wider">
          linjun
        </h1>
        <p className="text-[var(--text-muted)] mt-2">{t.about.tagline}</p>
        <div className="terminal-text text-xl text-[var(--accent-magenta)] glow-magenta mt-4">
          v1.0.0
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h3 className="text-xs font-bold tracking-widest text-[var(--text-dim)] mb-4">
            {t.about.systemInfo}
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Electron</span>
              <span className="terminal-text text-[var(--accent-teal)]">
                v33.0.0
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">React</span>
              <span className="terminal-text text-[var(--accent-teal)]">
                v18.2.0
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">CLIProxyAPIPlus</span>
              <span className="terminal-text text-[var(--accent-teal)]">
                v6.7.10
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Node.js</span>
              <span className="terminal-text text-[var(--accent-teal)]">
                v20.x
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card glass-card-magenta p-4">
          <h3 className="text-xs font-bold tracking-widest text-[var(--text-dim)] mb-4">
            {t.about.links}
          </h3>
          <div className="space-y-3">
            <a
              href="#"
              className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-magenta)] transition-colors"
            >
              <span>◉</span>
              <span>GitHub Repository</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-magenta)] transition-colors"
            >
              <span>◉</span>
              <span>{t.about.documentation}</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-magenta)] transition-colors"
            >
              <span>◉</span>
              <span>{t.about.reportIssue}</span>
            </a>
          </div>
        </div>
      </div>

      <div className="glass-card glass-card-cyan p-4">
        <h3 className="text-xs font-bold tracking-widest text-[var(--text-dim)] mb-4">
          {t.settings.updates}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-[var(--text-muted)]">
                {t.settings.currentVersion}:{" "}
              </span>
              <span className="terminal-text text-[var(--accent-cyan)] glow-cyan">
                {updateStatus.result?.currentVersion || "1.0.0"}
              </span>
            </div>
            <button
              onClick={handleCheckUpdate}
              disabled={updateStatus.checking}
              className="group relative px-5 py-2.5 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-teal)] hover:from-[var(--accent-teal)] hover:to-[var(--accent-cyan)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-black font-semibold transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 hover:scale-105 active:scale-95"
            >
              <span className="flex items-center gap-2">
                {updateStatus.checking ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {t.settings.checking}
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                    </svg>
                    {t.settings.checkUpdate}
                  </>
                )}
              </span>
            </button>
          </div>

          {updateStatus.result && !updateStatus.result.error && (
            <div className="pt-3 border-t border-[var(--glass-border)]">
              {updateStatus.result.hasUpdate ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-warning)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent-warning)]"></span>
                    </span>
                    <span className="text-sm text-[var(--accent-warning)]">
                      {t.settings.newVersion}:{" "}
                      {updateStatus.result.latestVersion}
                    </span>
                  </div>
                  {updateStatus.result.releaseUrl && (
                    <button
                      onClick={() =>
                        handleOpenExternal(updateStatus.result!.releaseUrl!)
                      }
                      className="group px-4 py-2 bg-gradient-to-r from-[var(--accent-success)] to-emerald-500 hover:from-emerald-500 hover:to-[var(--accent-success)] rounded-lg text-xs text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 hover:scale-105 active:scale-95"
                    >
                      <span className="flex items-center gap-1.5">
                        <svg
                          className="h-3.5 w-3.5 group-hover:translate-y-[-2px] transition-transform"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        {t.settings.downloadUpdate}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-[var(--accent-success)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className="text-sm text-[var(--accent-success)]">
                    {t.settings.upToDate}
                  </span>
                </div>
              )}
            </div>
          )}

          {updateStatus.result?.error && (
            <div className="pt-3 border-t border-[var(--glass-border)]">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[var(--accent-error)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="text-sm text-[var(--accent-error)]">
                  {t.settings.checkFailed}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card glass-card-indigo p-4">
        <h3 className="text-xs font-bold tracking-widest text-[var(--text-dim)] mb-3">
          {t.about.credits}
        </h3>
        <p className="text-sm text-[var(--text-muted)]">{t.about.builtWith}</p>
        <p className="text-xs text-[var(--text-dim)] mt-4">
          © 2024 linjun. MIT License.
        </p>
      </div>
    </div>
  );
}
