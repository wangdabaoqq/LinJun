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
    checkBinaryUpdate: () => ipcRenderer.invoke("proxy:checkBinaryUpdate"),
    getBinaryVersion: () => ipcRenderer.invoke("proxy:getBinaryVersion"),
    updateBinary: () => ipcRenderer.invoke("proxy:updateBinary"),
    onUpdateBinaryProgress: (
      callback: (progress: {
        stage:
          | "preparing"
          | "downloading"
          | "extracting"
          | "installing"
          | "restarting"
          | "completed";
        percent: number;
        message?: string;
        downloadedBytes?: number;
        totalBytes?: number;
      }) => void,
    ) => {
      const handler = (
        _event: unknown,
        progress: {
          stage:
            | "preparing"
            | "downloading"
            | "extracting"
            | "installing"
            | "restarting"
            | "completed";
          percent: number;
          message?: string;
          downloadedBytes?: number;
          totalBytes?: number;
        },
      ) => callback(progress);

      ipcRenderer.on("proxy:updateBinaryProgress", handler);
      return () =>
        ipcRenderer.removeListener("proxy:updateBinaryProgress", handler);
    },
    onStatusChange: (callback: (running: boolean) => void) => {
      const handler = (_event: unknown, running: boolean) => callback(running);
      ipcRenderer.on("proxy:statusChanged", handler);
      return () => ipcRenderer.removeListener("proxy:statusChanged", handler);
    },
  },
  api: {
    cliLogin: (provider: string) =>
      ipcRenderer.invoke("api:cliLogin", provider),
    startAuth: (provider: string) =>
      ipcRenderer.invoke("api:startAuth", provider),
    validateApiKey: (provider: string, apiKey: string) =>
      ipcRenderer.invoke("api:validateApiKey", provider, apiKey),
    getUsage: () => ipcRenderer.invoke("api:getUsage"),
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
    quit: () => ipcRenderer.send("app:quit"),
    getHomeDir: () =>
      ipcRenderer.invoke("app:getHomeDir") as Promise<{
        success: boolean;
        homeDir?: string;
        error?: string;
      }>,
    getPlatform: () =>
      ipcRenderer.invoke("app:getPlatform") as Promise<{
        success: boolean;
        platform: string;
      }>,
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
  models: {
    fetch: () => ipcRenderer.invoke("models:fetch"),
  },
  providers: {
    getAccounts: () => ipcRenderer.invoke("providers:getAccounts"),
    setAccountEnabled: (filePath: string, enabled: boolean) =>
      ipcRenderer.invoke("providers:setAccountEnabled", filePath, enabled),
    removeAccount: (filePath: string) =>
      ipcRenderer.invoke("providers:removeAccount", filePath),
  },
  customProviders: {
    getAll: () => ipcRenderer.invoke("customProviders:getAll"),
    setEnabled: (
      payload: {
        type: "openai" | "claude" | "gemini" | "codex";
        rawData:
          | {
              name: string;
              "base-url": string;
              "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
              "system-access-token"?: string;
              "new-api-user"?: string;
              "enable-usage-query"?: boolean;
              models?: { name: string; alias?: string }[];
              prefix?: string;
            }
          | {
              name?: string;
              "api-key": string;
              "base-url"?: string;
              "proxy-url"?: string;
              "system-access-token"?: string;
              "new-api-user"?: string;
              "enable-usage-query"?: boolean;
              models?: { name: string; alias?: string }[];
              headers?: Record<string, string>;
              prefix?: string;
            };
      },
      enabled: boolean,
    ) => ipcRenderer.invoke("customProviders:setEnabled", payload, enabled),
    removeDraft: (payload: {
      type: "openai" | "claude" | "gemini" | "codex";
      rawData:
        | {
            name: string;
            "base-url": string;
            "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
            "system-access-token"?: string;
            "new-api-user"?: string;
            "enable-usage-query"?: boolean;
            models?: { name: string; alias?: string }[];
            prefix?: string;
          }
        | {
            name?: string;
            "api-key": string;
            "base-url"?: string;
            "proxy-url"?: string;
            "system-access-token"?: string;
            "new-api-user"?: string;
            "enable-usage-query"?: boolean;
            models?: { name: string; alias?: string }[];
            headers?: Record<string, string>;
            prefix?: string;
          };
    }) => ipcRenderer.invoke("customProviders:removeDraft", payload),
    import: (
      data: {
        "openai-compatibility"?: {
          name: string;
          "base-url": string;
          "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
          "system-access-token"?: string;
          models?: { name: string; alias?: string }[];
          prefix?: string;
        }[];
        "claude-api-key"?: {
          name?: string;
          "api-key": string;
          "base-url"?: string;
          "proxy-url"?: string;
          "system-access-token"?: string;
          models?: { name: string; alias?: string }[];
          prefix?: string;
        }[];
        "gemini-api-key"?: {
          name?: string;
          "api-key": string;
          "base-url"?: string;
          "proxy-url"?: string;
          "system-access-token"?: string;
          headers?: Record<string, string>;
          models?: { name: string; alias?: string }[];
          prefix?: string;
        }[];
        "codex-api-key"?: {
          name?: string;
          "api-key": string;
          "base-url"?: string;
          "proxy-url"?: string;
          "system-access-token"?: string;
          models?: { name: string; alias?: string }[];
          prefix?: string;
        }[];
      },
      strategy: "overwrite" | "skip" = "overwrite",
    ) => ipcRenderer.invoke("customProviders:import", data, strategy),
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
    getAuthUrl: (params?: {
      method?: string;
      startUrl?: string;
      region?: string;
    }) => ipcRenderer.invoke("kiro:getAuthUrl", params),
    getAuthStatus: (state: string) =>
      ipcRenderer.invoke("kiro:getAuthStatus", state),
    importToken: () => ipcRenderer.invoke("kiro:import"),
    importFromToken: (tokenJson: string) =>
      ipcRenderer.invoke("kiro:importFromToken", tokenJson),
    refreshToken: (filePath: string) =>
      ipcRenderer.invoke("kiro:refreshToken", filePath),
  },
  openaiCompat: {
    getAll: () => ipcRenderer.invoke("openaiCompat:getAll"),
    add: (provider: {
      name: string;
      "base-url": string;
      "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
      "system-access-token"?: string;
      "new-api-user"?: string;
      models?: { name: string; alias?: string }[];
    }) => ipcRenderer.invoke("openaiCompat:add", provider),
    update: (
      providerName: string,
      provider: {
        name: string;
        "base-url": string;
        "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
        "system-access-token"?: string;
        "new-api-user"?: string;
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
        "system-access-token"?: string;
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
        "system-access-token"?: string;
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
        "system-access-token"?: string;
      }[],
    ) => ipcRenderer.invoke("codexCompat:save", entries),
  },
  ampcodeCompat: {
    getAll: () => ipcRenderer.invoke("ampcodeCompat:getAll"),
    save: (
      provider: {
        "upstream-url": string;
        "upstream-api-key"?: string;
        "upstream-api-keys"?: {
          "upstream-api-key": string;
          "api-keys": string[];
        }[];
        "restrict-management-to-localhost"?: boolean;
        "force-model-mappings"?: boolean;
        "model-mappings"?: { from: string; to: string }[];
      } | null,
    ) => ipcRenderer.invoke("ampcodeCompat:save", provider),
  },
  customProvider: {
    testConnection: (params: {
      protocol: "openai" | "claude" | "gemini" | "codex";
      baseUrl: string;
      apiKey: string;
      newApiUser?: string;
    }) =>
      ipcRenderer.invoke("customProvider:testConnection", params) as Promise<{
        success: boolean;
        error?: string;
        latency?: number;
        serviceType?: "new-api" | "openrouter";
      }>,
  },
  tray: {
    openDashboard: () => ipcRenderer.send("tray:open-dashboard"),
    setHeight: (height: number) => ipcRenderer.send("tray:resize", height),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
