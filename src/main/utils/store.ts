import Store from "electron-store";
import { DEFAULT_PORT } from "../../shared/constants";

interface OpenAICompatibilityEntry {
  name: string;
  "base-url": string;
  "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  models?: { name: string; alias?: string }[];
}

interface ClaudeCompatibilityEntry {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  models?: { name: string; alias?: string }[];
}

interface GeminiCompatibilityEntry {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  headers?: Record<string, string>;
  models?: { name: string; alias?: string }[];
}

interface CodexCompatibilityEntry {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  models?: { name: string; alias?: string }[];
}

interface CustomProviderDrafts {
  "openai-compatibility": OpenAICompatibilityEntry[];
  "claude-api-key": ClaudeCompatibilityEntry[];
  "gemini-api-key": GeminiCompatibilityEntry[];
  "codex-api-key": CodexCompatibilityEntry[];
}

interface StoreSchema {
  port: number;
  host: string;
  proxyUrl: string;
  autoStart: boolean;
  autoLaunch: boolean;
  routingStrategy: "round-robin" | "fill-first";
  language: "en" | "zh";
  theme: "system" | "light" | "dark";
  managementSecret: string;
  requestRetry: number;
  maxRetryInterval: number;
  loggingToFile: boolean;
  uptimeCheckEnabled: boolean;
  uptimeCheckInterval: number;
  uptimeAlertThreshold: number;
  oauthGlobalExcludedMigrationV1: boolean;
  oauthGlobalAliasMigrationV1: boolean;
  customProviderDrafts: CustomProviderDrafts;
}

export const store = new Store<StoreSchema>({
  defaults: {
    port: DEFAULT_PORT,
    host: "",
    proxyUrl: "",
    autoStart: true,
    autoLaunch: false,
    routingStrategy: "round-robin",
    language: "en",
    theme: "system",
    managementSecret: "",
    requestRetry: 3,
    maxRetryInterval: 30,
    loggingToFile: false,
    uptimeCheckEnabled: true,
    uptimeCheckInterval: 60,
    uptimeAlertThreshold: 95,
    oauthGlobalExcludedMigrationV1: false,
    oauthGlobalAliasMigrationV1: false,
    customProviderDrafts: {
      "openai-compatibility": [],
      "claude-api-key": [],
      "gemini-api-key": [],
      "codex-api-key": [],
    },
  },
});
