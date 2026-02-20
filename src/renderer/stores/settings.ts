import { create } from "zustand";
import { persist } from "zustand/middleware";
import log from "@renderer/utils/logger";
import { Language, getTranslations, Translations } from "../i18n";
import { DEFAULT_PORT } from "../../shared/constants";

export type ThemeType = "dark" | "light";

interface MainSettings {
  port?: number;
  host?: string;
  endpoint?: string;
  managementSecret?: string;
  autoStart?: boolean;
  autoLaunch?: boolean;
  routingStrategy?: "round-robin" | "fill-first";
  requestRetry?: number;
  maxRetryInterval?: number;
  proxyRunning?: boolean;
  loggingToFile?: boolean;
  switchProject?: boolean;
  switchPreviewModel?: boolean;
}

interface SettingsState {
  language: Language;
  theme: ThemeType;
  port: number;
  host: string;
  endpoint: string;
  managementSecret: string;
  autoStart: boolean;
  autoLaunch: boolean;
  routingStrategy: "round-robin" | "fill-first" | "random";
  sidebarCollapsed: boolean;
  requestRetry: number;
  maxRetryInterval: number;
  proxyRunning: boolean;
  proxyLoading: boolean;
  loggingToFile: boolean;
  switchProject: boolean;
  switchPreviewModel: boolean;
  translations: Translations;
  initialized: boolean;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeType) => void;
  setPort: (port: number) => void;
  setHost: (host: string) => void;
  setEndpoint: (endpoint: string) => void;
  getEffectiveEndpoint: () => string;
  setManagementSecret: (secret: string) => void;
  generateManagementSecret: () => void;
  setAutoStart: (enabled: boolean) => void;
  setAutoLaunch: (enabled: boolean) => void;
  setRoutingStrategy: (
    strategy: "round-robin" | "fill-first" | "random",
  ) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRequestRetry: (value: number) => void;
  setMaxRetryInterval: (value: number) => void;
  setProxyRunning: (running: boolean) => void;
  setProxyLoading: (loading: boolean) => void;
  setLoggingToFile: (enabled: boolean) => void;
  setSwitchProject: (enabled: boolean) => void;
  setSwitchPreviewModel: (enabled: boolean) => void;
  syncFromMain: (settings: MainSettings) => void;
}

function applyTheme(theme: ThemeType) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function getSystemTheme(): ThemeType {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "dark";
}

function generateUUID() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version bits (4) and variant bits (8, 9, A, or B)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  // Format as UUID v4: 8-4-4-4-12
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}

function generateRandomSecret() {
  return generateUUID();
}

const DEFAULT_THEME: ThemeType = getSystemTheme();

applyTheme(DEFAULT_THEME);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: "zh",
      theme: DEFAULT_THEME,
      port: DEFAULT_PORT,
      host: "",
      endpoint: "",
      managementSecret: "",
      autoStart: true,
      autoLaunch: false,
      routingStrategy: "round-robin",
      sidebarCollapsed: false,
      requestRetry: 3,
      maxRetryInterval: 30,
      proxyRunning: false,
      proxyLoading: false,
      loggingToFile: false,
      switchProject: true,
      switchPreviewModel: true,
      translations: getTranslations("zh"),
      initialized: false,

      setLanguage: (lang) =>
        set({
          language: lang,
          translations: getTranslations(lang),
        }),

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setPort: (port) => {
        set({ port });
        if (typeof window !== "undefined" && window.electronAPI) {
          window.electronAPI.settings.syncToYaml({ port });
        }
      },
      setHost: (host) => {
        set({ host });
        if (typeof window !== "undefined" && window.electronAPI) {
          window.electronAPI.settings.syncToYaml({ host });
        }
      },
      setEndpoint: (endpoint) => {
        set({ endpoint });
      },
      getEffectiveEndpoint: () => {
        const state = get();
        if (state.endpoint && state.endpoint.trim()) {
          return state.endpoint.trim();
        }
        const displayHost = state.host || "127.0.0.1";
        return `http://${displayHost}:${state.port}/v1`;
      },
      setManagementSecret: (secret) => {
        set({ managementSecret: secret });
        if (typeof window !== "undefined" && window.electronAPI) {
          window.electronAPI.settings.syncToYaml({
            managementSecret: secret,
          });
        }
      },
      generateManagementSecret: () => {
        const newSecret = generateRandomSecret();
        get().setManagementSecret(newSecret);
      },
      setAutoStart: (autoStart) => set({ autoStart }),
      setAutoLaunch: (autoLaunch) => {
        set({ autoLaunch });
        if (typeof window !== "undefined" && window.electronAPI) {
          window.electronAPI.settings.setAutoLaunch(autoLaunch);
        }
      },
      setRoutingStrategy: (routingStrategy) => {
        set({ routingStrategy });
        if (
          typeof window !== "undefined" &&
          window.electronAPI &&
          (routingStrategy === "round-robin" ||
            routingStrategy === "fill-first")
        ) {
          window.electronAPI.settings.syncToYaml({ routingStrategy });
        }
      },
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setRequestRetry: (requestRetry) => {
        set({ requestRetry });
        if (typeof window !== "undefined" && window.electronAPI) {
          window.electronAPI.settings.syncToYaml({ requestRetry });
        }
      },
      setMaxRetryInterval: (maxRetryInterval) => {
        set({ maxRetryInterval });
        if (typeof window !== "undefined" && window.electronAPI) {
          window.electronAPI.settings.syncToYaml({ maxRetryInterval });
        }
      },
      setProxyRunning: (running) => set({ proxyRunning: running }),
      setProxyLoading: (loading) => set({ proxyLoading: loading }),
      setLoggingToFile: (enabled: boolean) => {
        set({ loggingToFile: enabled });
        if (typeof window !== "undefined" && window.electronAPI) {
          window.electronAPI.settings.syncToYaml({ loggingToFile: enabled });
        }
      },
      setSwitchProject: (enabled: boolean) => {
        set({ switchProject: enabled });
        if (typeof window !== "undefined" && window.electronAPI) {
          window.electronAPI.settings.syncToYaml({ switchProject: enabled });
        }
      },
      setSwitchPreviewModel: (enabled: boolean) => {
        set({ switchPreviewModel: enabled });
        if (typeof window !== "undefined" && window.electronAPI) {
          window.electronAPI.settings.syncToYaml({
            switchPreviewModel: enabled,
          });
        }
      },
      syncFromMain: (settings) => {
        const currentSecret = get().managementSecret;
        const newSecret =
          settings.managementSecret || currentSecret || generateRandomSecret();

        if (!settings.managementSecret && !currentSecret) {
          if (typeof window !== "undefined" && window.electronAPI) {
            window.electronAPI.settings.syncToYaml({
              managementSecret: newSecret,
            });
          }
        }

        set({
          ...(settings.port !== undefined && { port: settings.port }),
          ...(settings.host !== undefined && { host: settings.host }),
          managementSecret: newSecret,
          ...(settings.autoStart !== undefined && {
            autoStart: settings.autoStart,
          }),
          ...(settings.autoLaunch !== undefined && {
            autoLaunch: settings.autoLaunch,
          }),
          ...(settings.routingStrategy !== undefined && {
            routingStrategy: settings.routingStrategy,
          }),
          ...(settings.requestRetry !== undefined && {
            requestRetry: settings.requestRetry,
          }),
          ...(settings.maxRetryInterval !== undefined && {
            maxRetryInterval: settings.maxRetryInterval,
          }),
          ...(settings.proxyRunning !== undefined && {
            proxyRunning: settings.proxyRunning,
          }),
          ...(settings.loggingToFile !== undefined && {
            loggingToFile: settings.loggingToFile,
          }),
          ...(settings.switchProject !== undefined && {
            switchProject: settings.switchProject,
          }),
          ...(settings.switchPreviewModel !== undefined && {
            switchPreviewModel: settings.switchPreviewModel,
          }),
          initialized: true,
        });
      },
    }),
    {
      name: "clipplus-settings",
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        port: state.port,
        endpoint: state.endpoint,
        managementSecret: state.managementSecret,
        autoStart: state.autoStart,
        autoLaunch: state.autoLaunch,
        routingStrategy: state.routingStrategy,
        sidebarCollapsed: state.sidebarCollapsed,
        requestRetry: state.requestRetry,
        maxRetryInterval: state.maxRetryInterval,
        switchProject: state.switchProject,
        switchPreviewModel: state.switchPreviewModel,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    },
  ),
);

export function useTranslations() {
  return useSettingsStore((state) => state.translations);
}

export function useLanguage() {
  return useSettingsStore((state) => ({
    language: state.language,
    setLanguage: state.setLanguage,
  }));
}

export function useTheme() {
  return useSettingsStore((state) => ({
    theme: state.theme,
    setTheme: state.setTheme,
    toggleTheme: () => {
      const newTheme = state.theme === "dark" ? "light" : "dark";
      state.setTheme(newTheme);
    },
  }));
}

export function setupSystemThemeListener() {
  if (typeof window === "undefined" || !window.matchMedia) return;

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = (e: MediaQueryListEvent) => {
    const savedTheme = localStorage.getItem("clipplus-settings");
    if (!savedTheme) {
      const newTheme: ThemeType = e.matches ? "dark" : "light";
      useSettingsStore.getState().setTheme(newTheme);
    }
  };

  mediaQuery.addEventListener("change", handleChange);
  return () => mediaQuery.removeEventListener("change", handleChange);
}

export function initializeSettingsFromMain(): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI)
    return Promise.resolve();

  return window.electronAPI.settings
    .getAll()
    .then((mainSettings) => {
      useSettingsStore.getState().syncFromMain(mainSettings);
      log.info("[Settings] Synced from main:", mainSettings);
    })
    .catch((error) => {
      log.error("[Settings] Failed to sync from main:", error);
    });
}

export function useProxy() {
  return useSettingsStore((state) => ({
    proxyRunning: state.proxyRunning,
    proxyLoading: state.proxyLoading,
    setProxyRunning: state.setProxyRunning,
    setProxyLoading: state.setProxyLoading,
    port: state.port,
    host: state.host,
    apiKey: state.managementSecret,
  }));
}

export async function fetchProxyStatus(): Promise<boolean> {
  if (typeof window === "undefined" || !window.electronAPI) return false;
  try {
    const status = await window.electronAPI.proxy.status();
    return status.running;
  } catch (error) {
    log.error("[Proxy] Failed to fetch status:", error);
    return false;
  }
}

export async function startProxy(): Promise<boolean> {
  if (typeof window === "undefined" || !window.electronAPI) return false;
  try {
    const result = await window.electronAPI.proxy.start();
    return result.success;
  } catch (error) {
    log.error("[Proxy] Failed to start:", error);
    return false;
  }
}

export async function stopProxy(): Promise<boolean> {
  if (typeof window === "undefined" || !window.electronAPI) return false;
  try {
    const result = await window.electronAPI.proxy.stop();
    return result.success;
  } catch (error) {
    log.error("[Proxy] Failed to stop:", error);
    return false;
  }
}
