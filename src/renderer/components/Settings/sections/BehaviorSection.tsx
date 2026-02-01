import { Rocket, Power, Code } from "lucide-react";
import { useSettingsStore, useTranslations } from "../../../stores/settings";
import { SettingCard } from "../shared/SettingCard";
import { SectionHeader } from "../shared/SectionHeader";
import { CustomToggle } from "../shared/CustomToggle";

export function BehaviorSection() {
  const t = useTranslations();
  const {
    autoLaunch,
    autoStart,
    developerMode,
    setAutoLaunch,
    setAutoStart,
    setDeveloperMode,
  } = useSettingsStore();

  return (
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
        <CustomToggle
          value={developerMode}
          onChange={setDeveloperMode}
          label={t.settings.developerMode}
          desc={t.settings.developerModeDesc}
          icon={Code}
        />
      </div>
    </SettingCard>
  );
}
