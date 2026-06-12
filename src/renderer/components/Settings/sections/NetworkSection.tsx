import {
  Gauge,
  RotateCcw,
  Clock,
  AlertTriangle,
  Shuffle,
  Zap,
  ListOrdered,
  ArrowDownToLine,
  Network,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSettingsStore, useTranslations } from "../../../stores/settings";
import { StrategyOption } from "../types";
import { SettingCard } from "../shared/SettingCard";
import { SectionHeader } from "../shared/SectionHeader";
import { StrategyCards } from "../shared/StrategyCards";
import { CustomSlider } from "../shared/CustomSlider";
import { CustomToggle } from "../shared/CustomToggle";

const PROXY_URL_RE = /^(https?|socks5):\/\/.+/i;

export function NetworkSection() {
  const t = useTranslations();
  const {
    proxyUrl,
    routingStrategy,
    requestRetry,
    maxRetryInterval,
    switchProject,
    switchPreviewModel,
    setProxyUrl,
    setRoutingStrategy,
    setRequestRetry,
    setMaxRetryInterval,
    setSwitchProject,
    setSwitchPreviewModel,
  } = useSettingsStore();
  const [proxyUrlInput, setProxyUrlInput] = useState(proxyUrl);
  const [proxyUrlError, setProxyUrlError] = useState<string | null>(null);

  useEffect(() => {
    setProxyUrlInput(proxyUrl);
  }, [proxyUrl]);

  const handleProxyUrlBlur = () => {
    const value = proxyUrlInput.trim();
    if (value && !PROXY_URL_RE.test(value)) {
      setProxyUrlError(t.settings.proxyUrlError);
      return;
    }

    setProxyUrlError(null);
    if (value !== proxyUrl) {
      setProxyUrl(value);
    }
  };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Network Configuration */}
      <SettingCard variant="teal" className="lg:col-span-2">
        <SectionHeader
          title={t.settings.networkConfig}
          description={t.settings.networkConfigDesc}
          icon={Network}
          accentColor="teal"
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-2">
            <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-teal-500" />
              {t.settings.proxyUrl}
            </label>
            <input
              type="text"
              value={proxyUrlInput}
              onChange={(event) => {
                setProxyUrlInput(event.target.value);
                setProxyUrlError(null);
              }}
              onBlur={handleProxyUrlBlur}
              placeholder={t.settings.proxyUrlPlaceholder}
              className={`glass-input w-full font-mono text-sm py-3.5 px-4 bg-black/5 dark:bg-black/20 border-transparent focus:ring-2 ${
                proxyUrlError
                  ? "border-red-500/50 focus:border-red-500/40 focus:ring-red-500/15"
                  : "focus:border-teal-500/40 focus:ring-teal-500/15"
              }`}
            />
            <p
              className={`text-xs leading-relaxed ${
                proxyUrlError ? "text-red-500" : "text-[var(--text-dim)]"
              }`}
            >
              {proxyUrlError || t.settings.proxyUrlDesc}
            </p>
          </div>

          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <span className="text-lg font-bold tabular-nums">{v}</span>
                    <span className="text-[10px] uppercase opacity-70 font-medium">
                      {t.settings.attempts}
                    </span>
                  </>
                )
              }
            />

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
                    <span className="text-lg font-bold tabular-nums">{v}</span>
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

      {/* Routing Strategy */}
      <SettingCard variant="indigo">
        <SectionHeader
          title={t.settings.routingStrategy}
          description={t.settings.routingStrategyDesc}
          icon={Gauge}
          accentColor="indigo"
        />
        <StrategyCards
          value={routingStrategy}
          onChange={(v) =>
            setRoutingStrategy(v as "round-robin" | "fill-first" | "random")
          }
          options={strategyOptions}
        />
      </SettingCard>

      {/* Quota Exceeded Handling */}
      <SettingCard variant="magenta">
        <SectionHeader
          title={t.settings.quotaExceeded}
          description={t.settings.quotaExceededDesc}
          icon={AlertTriangle}
          accentColor="magenta"
        />
        <div className="grid grid-cols-1 gap-3">
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
  );
}
