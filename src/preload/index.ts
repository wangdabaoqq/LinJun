import { contextBridge, ipcRenderer } from "electron";

export type Provider =
  | "claude"
  | "gemini"
  | "codex"
  | "qwen"
  | "antigravity"
  | "iflow"
  | "copilot"
  | "kiro"
  | "custom";

const electronAPI = {
  proxy: {
    start: () => ipcRenderer.invoke("proxy:start"),
    stop: () => ipcRenderer.invoke("proxy:stop"),
    status: () => ipcRenderer.invoke("proxy:status"),
    onStatusChange: (callback: (running: boolean) => void) => {
      const handler = (_event: unknown, running: boolean) => callback(running);
      ipcRenderer.on("proxy:statusChanged", handler);
      return () => ipcRenderer.removeListener("proxy:statusChanged", handler);
    },
  },
  api: {
    getAccounts: () => ipcRenderer.invoke("api:getAccounts"),
    getQuota: () => ipcRenderer.invoke("api:getQuota"),
    startAuth: (provider: Provider) =>
      ipcRenderer.invoke("api:startAuth", provider),
    cliLogin: (provider: string) =>
      ipcRenderer.invoke("api:cliLogin", provider),
    removeAccount: (provider: Provider, accountId: string) =>
      ipcRenderer.invoke("api:removeAccount", provider, accountId),
    validateApiKey: (provider: Provider, apiKey: string) =>
      ipcRenderer.invoke("api:validateApiKey", provider, apiKey),
    getLogs: (limit: number) => ipcRenderer.invoke("api:getLogs", limit),
    getStats: () => ipcRenderer.invoke("api:getStats"),
    getHealth: () => ipcRenderer.invoke("api:getHealth"),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke("settings:get", key),
    set: (key: string, value: unknown) =>
      ipcRenderer.invoke("settings:set", key, value),
    getAll: () => ipcRenderer.invoke("settings:getAll"),
    setAutoLaunch: (enabled: boolean) =>
      ipcRenderer.invoke("settings:setAutoLaunch", enabled),
    syncToYaml: (updates: {
      port?: number;
      apiKey?: string;
      managementSecret?: string;
      routingStrategy?: "round-robin" | "fill-first";
      requestRetry?: number;
      maxRetryInterval?: number;
      loggingToFile?: boolean;
      switchProject?: boolean;
      switchPreviewModel?: boolean;
      developerMode?: boolean;
    }) => ipcRenderer.invoke("settings:syncToYaml", updates),
  },
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
    checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
    openExternal: (url: string) => ipcRenderer.invoke("app:openExternal", url),
  },
  apiKeys: {
    getAll: () => ipcRenderer.invoke("apiKeys:getAll"),
    add: (key: string) => ipcRenderer.invoke("apiKeys:add", key),
    update: (oldKey: string, newKey: string) =>
      ipcRenderer.invoke("apiKeys:update", oldKey, newKey),
    delete: (key: string) => ipcRenderer.invoke("apiKeys:delete", key),
  },
  logs: {
    fetch: (limit = 30) => ipcRenderer.invoke("logs:request", limit),
    deleteAll: () => ipcRenderer.invoke("logs:deleteAll"),
  },
  cli: {
    detectAll: () => ipcRenderer.invoke("cli:detectAll"),
    detect: (toolName: string, command: string) =>
      ipcRenderer.invoke("cli:detect", toolName, command),
    readConfig: (toolName: string) =>
      ipcRenderer.invoke("cli:readConfig", toolName),
    writeConfig: (filePath: string, content: string, backup?: boolean) =>
      ipcRenderer.invoke("cli:writeConfig", filePath, content, backup),
    testConnection: (url: string, apiKey?: string) =>
      ipcRenderer.invoke("cli:testConnection", url, apiKey),
  },
  quota: {
    getProviders: () => ipcRenderer.invoke("quota:getProviders"),
    getByProvider: (provider: Provider) =>
      ipcRenderer.invoke("quota:getByProvider", provider),
    refresh: (accountId: string) =>
      ipcRenderer.invoke("quota:refresh", accountId),
    refreshAll: () => ipcRenderer.invoke("quota:refreshAll"),
  },
  providers: {
    getAccounts: () => ipcRenderer.invoke("providers:getAccounts"),
    removeAccount: (filePath: string) =>
      ipcRenderer.invoke("providers:removeAccount", filePath),
  },
  qwen: {
    getAuthUrl: () => ipcRenderer.invoke("qwen:getAuthUrl"),
    getAuthStatus: (state: string) =>
      ipcRenderer.invoke("qwen:getAuthStatus", state),
  },
  antigravity: {
    getAuthUrl: () => ipcRenderer.invoke("antigravity:getAuthUrl"),
  },
  iflow: {
    getAuthUrl: () => ipcRenderer.invoke("iflow:getAuthUrl"),
  },
  claude: {
    getAuthUrl: () => ipcRenderer.invoke("claude:getAuthUrl"),
  },
  gemini: {
    getAuthUrl: (projectId?: string) =>
      ipcRenderer.invoke("gemini:getAuthUrl", projectId),
  },
  codex: {
    getAuthUrl: () => ipcRenderer.invoke("codex:getAuthUrl"),
  },
  copilot: {
    getAuthUrl: () => ipcRenderer.invoke("copilot:getAuthUrl"),
  },
  kiro: {
    importToken: () => ipcRenderer.invoke("kiro:import"),
    refreshToken: (filePath: string) =>
      ipcRenderer.invoke("kiro:refreshToken", filePath),
  },
  openaiCompat: {
    getAll: () => ipcRenderer.invoke("openaiCompat:getAll"),
    add: (provider: {
      name: string;
      "base-url": string;
      "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
      models?: { name: string; alias?: string }[];
    }) => ipcRenderer.invoke("openaiCompat:add", provider),
    update: (
      providerName: string,
      provider: {
        name: string;
        "base-url": string;
        "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
        models?: { name: string; alias?: string }[];
      },
    ) => ipcRenderer.invoke("openaiCompat:update", providerName, provider),
    delete: (providerName: string) =>
      ipcRenderer.invoke("openaiCompat:delete", providerName),
  },
  claudeCompat: {
    getAll: () => ipcRenderer.invoke("claudeCompat:getAll"),
    save: (
      entries: {
        "api-key": string;
        "base-url"?: string;
        "proxy-url"?: string;
        models?: { name: string; alias?: string }[];
      }[],
    ) => ipcRenderer.invoke("claudeCompat:save", entries),
  },
  geminiCompat: {
    getAll: () => ipcRenderer.invoke("geminiCompat:getAll"),
    save: (
      entries: {
        "api-key": string;
        "base-url"?: string;
        "proxy-url"?: string;
        headers?: Record<string, string>;
      }[],
    ) => ipcRenderer.invoke("geminiCompat:save", entries),
  },
  codexCompat: {
    getAll: () => ipcRenderer.invoke("codexCompat:getAll"),
    save: (
      entries: {
        "api-key": string;
        "base-url"?: string;
        "proxy-url"?: string;
      }[],
    ) => ipcRenderer.invoke("codexCompat:save", entries),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
