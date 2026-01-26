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
  | "vertex"
  | "custom";

const electronAPI = {
  proxy: {
    start: () => ipcRenderer.invoke("proxy:start"),
    stop: () => ipcRenderer.invoke("proxy:stop"),
    status: () => ipcRenderer.invoke("proxy:status"),
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
    syncToYaml: (updates: {
      port?: number;
      apiKey?: string;
      managementSecret?: string;
      routingStrategy?: "round-robin" | "fill-first";
      requestRetry?: number;
      maxRetryInterval?: number;
      loggingToFile?: boolean;
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
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
