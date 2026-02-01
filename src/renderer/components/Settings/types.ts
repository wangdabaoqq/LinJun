import { ThemeType } from "../../stores/settings";

export type SettingsTab = "core" | "network" | "appearance" | "behavior";

export interface StrategyOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export interface ThemeOption {
  id: ThemeType;
  name: string;
  colors: string[];
  icon: React.ComponentType<{ className?: string }>;
}
