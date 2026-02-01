import {
  Gauge,
  Timer,
  RotateCcw,
  Clock,
  AlertTriangle,
  Shuffle,
  Zap,
  ListOrdered,
  ArrowDownToLine,
} from "lucide-react";
import { useSettingsStore, useTranslations } from "../../../stores/settings";
import { StrategyOption } from "../types";
import { SettingCard } from "../shared/SettingCard";
import { SectionHeader } from "../shared/SectionHeader";
import { StrategyCards } from "../shared/StrategyCards";
import { CustomSlider } from "../shared/CustomSlider";
import { CustomToggle } from "../shared/CustomToggle";

export function NetworkSection() {
  const t = useTranslations();
  const {
    routingStrategy,
    requestRetry,
    maxRetryInterval,
    switchProject,
    switchPreviewModel,
    setRoutingStrategy,
    setRequestRetry,
    setMaxRetryInterval,
    setSwitchProject,
    setSwitchPreviewModel,
  } = useSettingsStore();

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
            setRoutingStrategy(v as "round-robin" | "fill-first" | "random")
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
                    <span className="text-lg font-bold tabular-nums">{v}</span>
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
  );
}
