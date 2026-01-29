interface ElectronAPI {
  proxy: {
    start: () => Promise<{ success: boolean }>;
    stop: () => Promise<{ success: boolean }>;
    status: () => Promise<{ running: boolean; port: number }>;
  };
  api: {
    getAccounts: () => Promise<unknown[]>;
    getQuota: () => Promise<unknown>;
    startAuth: (provider: string) => Promise<{ success: boolean }>;
    cliLogin: (
      provider: string,
    ) => Promise<{ success: boolean; output?: string; error?: string }>;
    removeAccount: (
      provider: string,
      accountId: string,
    ) => Promise<{ success: boolean }>;
    validateApiKey: (
      provider: string,
      apiKey: string,
    ) => Promise<{ valid: boolean }>;
    getLogs: (limit: number) => Promise<unknown[]>;
    getStats: () => Promise<{
      totalRequests: number;
      successCount: number;
      errorCount: number;
      totalTokens: number;
      avgLatency: number;
      uptime: number;
    }>;
    getHealth: () => Promise<{
      healthy: boolean;
      checks: Record<string, unknown>;
    }>;
  };
  settings: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    getAll: () => Record<string, unknown>;
    syncToYaml: (updates: {
      port?: number;
      apiKey?: string;
      managementSecret?: string;
      routingStrategy?: string;
      requestRetry?: number;
      maxRetryInterval?: number;
      loggingToFile?: boolean;
      switchProject?: boolean;
      switchPreviewModel?: boolean;
    }) => Promise<{ success: boolean }>;
  };
  app: {
    checkForUpdates: () => Promise<{
      version: string;
      url: string;
      notes: string;
    } | null>;
    openExternal: (url: string) => Promise<{ success: boolean }>;
  };
  apiKeys: {
    getAll: () => Promise<{ success: boolean; keys: string[]; error?: string }>;
    add: (
      key: string,
    ) => Promise<{ success: boolean; keys: string[]; error?: string }>;
    update: (
      oldKey: string,
      newKey: string,
    ) => Promise<{ success: boolean; keys: string[]; error?: string }>;
    delete: (
      key: string,
    ) => Promise<{ success: boolean; keys: string[]; error?: string }>;
  };
  logs: {
    fetch: (limit?: number) => Promise<
      {
        id: string;
        status: "success" | "error";
        timestamp: string;
        method?: string;
        url?: string;
        provider?: string;
        model?: string;
        headers: Record<string, string>;
        requestBody?: string;
      }[]
    >;
  };
}

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.svg?url" {
  const content: string;
  export default content;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
