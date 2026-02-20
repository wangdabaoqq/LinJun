import { useState } from "react";
import log from "@renderer/utils/logger";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Hash,
  AlertTriangle,
  Loader2,
  Link,
  Network,
} from "lucide-react";
import {
  useSettingsStore,
  useTranslations,
  startProxy,
  stopProxy,
} from "../../../stores/settings";
import { SettingCard } from "../shared/SettingCard";
import { SectionHeader } from "../shared/SectionHeader";
import { SettingRow } from "../shared/SettingRow";

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_BARE_RE = /^[\da-fA-F:]+$/;

function isValidBindHost(value: string): boolean {
  if (value === "localhost") return true;
  const ipv4Match = value.match(IPV4_RE);
  if (ipv4Match) {
    return ipv4Match.slice(1).every((octet) => Number(octet) <= 255);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    return IPV6_BARE_RE.test(value.slice(1, -1));
  }
  if (value.includes(":") && IPV6_BARE_RE.test(value)) {
    return true;
  }
  return false;
}

export function CoreSection() {
  const t = useTranslations();
  const {
    port,
    host,
    managementSecret,
    proxyRunning,
    setPort,
    setHost,
    getEffectiveEndpoint,
    generateManagementSecret,
  } = useSettingsStore();

  const [copied, setCopied] = useState(false);
  const [endpointCopied, setEndpointCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [portInput, setPortInput] = useState(String(port));
  const [portError, setPortError] = useState<string | null>(null);
  const [hostInput, setHostInput] = useState(host);
  const [hostError, setHostError] = useState<string | null>(null);
  const [showHostRestartPrompt, setShowHostRestartPrompt] = useState(false);

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await stopProxy();
      await startProxy();
      setShowRestartPrompt(false);
      setShowHostRestartPrompt(false);
    } catch (error) {
      log.error("Failed to restart proxy:", error);
    } finally {
      setIsRestarting(false);
    }
  };

  const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPortInput(e.target.value);
    setPortError(null);
  };

  const handlePortBlur = () => {
    const newPort = Number(portInput);

    if (newPort < 1024 || newPort > 49151) {
      setPortError(t.settings.portRangeError);
      return;
    }

    if (newPort !== port) {
      setPort(newPort);
      if (proxyRunning) {
        setShowRestartPrompt(true);
      }
    }
  };

  const handleHostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHostInput(e.target.value);
    setHostError(null);
  };

  const handleHostBlur = () => {
    const newHost = hostInput.trim();

    if (newHost !== "" && !isValidBindHost(newHost)) {
      setHostError(t.settings.bindHostError);
      return;
    }

    if (newHost !== host) {
      setHost(newHost);
      if (proxyRunning) {
        setShowHostRestartPrompt(true);
      }
    }
  };

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

  return (
    <div className="space-y-6">
      {/* API Key Section - Full Width */}
      <SettingCard variant="primary" className="relative overflow-hidden">
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
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
                      title={showPassword ? "Hide API Key" : "Show API Key"}
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
                          ? "text-green-500"
                          : "text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
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
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] rounded-lg transition-colors"
                      title={t.settings.refresh}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>

              <p className="mt-2 text-xs text-[var(--text-dim)] flex items-center gap-1.5 pl-1">
                <ShieldCheck className="w-3 h-3" />
                {t.settings.apiKeySecurityTip}
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
            value={portInput}
            onChange={handlePortChange}
            onBlur={handlePortBlur}
            className={`glass-input w-full font-mono text-lg py-3.5 px-5 bg-black/5 dark:bg-black/20 border-transparent focus:ring-2 ${
              portError
                ? "border-red-500/50 focus:border-red-500/40 focus:ring-red-500/15"
                : "focus:border-teal-500/40 focus:ring-teal-500/15"
            }`}
          />
        </SettingRow>

        <AnimatePresence>
          {portError && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="text-sm text-red-500 pl-1 overflow-hidden"
            >
              {portError}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRestartPrompt && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
                marginTop: 0,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                height: "auto",
                marginTop: 16,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                height: 0,
                marginTop: 0,
                scale: 0.98,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
              }}
              className="relative overflow-hidden bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-md border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-500 shadow-lg shadow-amber-500/10">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </motion.div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {t.settings.portChanged}
                    </h4>
                    <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 leading-relaxed mt-0.5">
                      {t.settings.portChangedDesc}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRestartPrompt(false)}
                    className="px-4 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                  >
                    {t.settings.restartLater}
                  </button>
                  <button
                    onClick={handleRestart}
                    disabled={isRestarting}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {isRestarting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {t.settings.restartNow}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingCard>

      {/* Bind Address Configuration */}
      <SettingCard variant="teal">
        <SectionHeader
          title={t.settings.bindHost}
          description={t.settings.bindHostDesc}
          icon={Network}
          accentColor="teal"
        />
        <SettingRow label={t.settings.bindHost} icon={Network}>
          <input
            type="text"
            value={hostInput}
            onChange={handleHostChange}
            onBlur={handleHostBlur}
            className={`glass-input w-full font-mono text-lg py-3.5 px-5 bg-black/5 dark:bg-black/20 border-transparent focus:ring-2 ${
              hostError
                ? "border-red-500/50 focus:border-red-500/40 focus:ring-red-500/15"
                : "focus:border-teal-500/40 focus:ring-teal-500/15"
            }`}
            placeholder={t.settings.bindHostPlaceholder}
          />
        </SettingRow>

        <AnimatePresence>
          {hostError && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="text-sm text-red-500 pl-1 overflow-hidden"
            >
              {hostError}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHostRestartPrompt && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16, scale: 1 }}
              exit={{ opacity: 0, height: 0, marginTop: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="relative overflow-hidden bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-md border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-500 shadow-lg shadow-amber-500/10">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </motion.div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {t.settings.bindHostChanged}
                    </h4>
                    <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 leading-relaxed mt-0.5">
                      {t.settings.bindHostChangedDesc}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHostRestartPrompt(false)}
                    className="px-4 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                  >
                    {t.settings.restartLater}
                  </button>
                  <button
                    onClick={handleRestart}
                    disabled={isRestarting}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {isRestarting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {t.settings.restartNow}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
  );
}
