import { Gauge, Languages, Moon, Palette, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";
import {
  ThemeType,
  useSettingsStore,
  useTranslations,
} from "../../../stores/settings";
import { Language } from "../../../i18n";
import { SettingCard } from "../shared/SettingCard";
import { SectionHeader } from "../shared/SectionHeader";
import { SettingRow } from "../shared/SettingRow";
import { ThemeCard } from "../shared/ThemeCard";
import { CustomToggle } from "../shared/CustomToggle";

export function AppearanceSection() {
  const t = useTranslations();
  const { theme, language, slimMode, setTheme, setLanguage, setSlimMode } =
    useSettingsStore();

  const themes: {
    id: ThemeType;
    name: string;
    colors: string[];
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "dark",
      name: t.settings.darkMode,
      colors: ["#0a84ff", "#5e5ce6", "#bf5af2"],
      icon: Moon,
    },
    {
      id: "light",
      name: t.settings.lightMode,
      colors: ["#7a9e7e", "#a8b4c4", "#d4b896"],
      icon: Sun,
    },
  ];

  return (
    <SettingCard variant="indigo">
      <SectionHeader
        title={t.settings.appearance}
        description={t.settings.appearanceDesc}
        icon={Palette}
        accentColor="indigo"
      />
      <div className="space-y-6">
        {/* Theme Selection */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
            <Palette className="w-3.5 h-3.5" />
            {t.settings.theme}
          </label>
          <div className="grid grid-cols-1 gap-3">
            {themes.map((th) => (
              <ThemeCard
                key={th.id}
                themeId={th.id}
                name={th.name}
                colors={th.colors}
                selected={theme === th.id}
                onClick={() => setTheme(th.id)}
                icon={th.icon}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

        {/* Language Selection */}
        <SettingRow label={t.settings.language} icon={Languages}>
          <Select
            value={language}
            onValueChange={(v) => setLanguage(v as Language)}
          >
            <SelectTrigger className="w-full h-13 bg-white/20 dark:bg-black/20 border-transparent focus:ring-2 focus:ring-indigo-500/30 rounded-xl px-5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--glass-bg)] backdrop-blur-2xl border-[var(--glass-border)] rounded-xl overflow-hidden">
              <SelectItem
                value="en"
                className="py-3 pl-8 pr-4 focus:bg-indigo-500/10 focus:text-indigo-500"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">🇺🇸</span>
                  <span>{t.settings.english}</span>
                </div>
              </SelectItem>
              <SelectItem
                value="zh"
                className="py-3 pl-8 pr-4 focus:bg-indigo-500/10 focus:text-indigo-500"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">🇨🇳</span>
                  <span>{t.settings.chinese}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        {/* Slim Mode */}
        <CustomToggle
          value={slimMode}
          onChange={setSlimMode}
          label={t.settings.slimMode}
          desc={t.settings.slimModeDesc}
          icon={Gauge}
        />
      </div>
    </SettingCard>
  );
}
