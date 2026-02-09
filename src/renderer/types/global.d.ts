interface ElectronAPI {
  proxy: {
    start: () => Promise<{ success: boolean }>;
    stop: () => Promise<{ success: boolean }>;
    status: () => Promise<{ running: boolean; port: number }>;
  };
  api: {
    cliLogin: (
      provider: string,
    ) => Promise<{ success: boolean; output?: string; error?: string }>;
    startAuth: (
      provider: string,
    ) => Promise<{ success: boolean; error?: string }>;
    validateApiKey: (
      provider: string,
      apiKey: string,
    ) => Promise<{ valid: boolean; email?: string; error?: string }>;
    getUsage: () => Promise<UsageResponse | null>;
  };
  settings: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    getAll: () => Record<string, unknown>;
    setAutoLaunch: (
      enabled: boolean,
    ) => Promise<{ success: boolean; error?: string }>;
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
      developerMode?: boolean;
    }) => Promise<{ success: boolean }>;
  };
  app: {
    checkForUpdates: () => Promise<{
      version: string;
      url: string;
      notes: string;
    } | null>;
    openExternal: (url: string) => Promise<{ success: boolean }>;
    getHomeDir: () => Promise<{
      success: boolean;
      homeDir?: string;
      error?: string;
    }>;
    getPlatform: () => Promise<{ success: boolean; platform: string }>;
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
  uptime: {
    getStatus: () => Promise<{
      entities: UptimeEntitySummary[];
      overallStatus: "online" | "offline" | "degraded";
      lastUpdated: number;
    }>;
    getHistory: (
      entityId: string,
      hours?: number,
    ) => Promise<{
      data: {
        timestamp: number;
        status: "online" | "offline" | "degraded";
        responseTime?: number;
      }[];
    }>;
  };
  customProviders: {
    import: (
      data: {
        "openai-compatibility"?: {
          name: string;
          "base-url": string;
          "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
          "system-access-token"?: string;
          "new-api-user"?: string;
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
      strategy?: "overwrite" | "skip",
    ) => Promise<{
      success: boolean;
      summary?: { added: number; updated: number; skipped: number };
      error?: string;
    }>;
  };
  customProvider: {
    testConnection: (params: {
      protocol: "openai" | "claude" | "gemini" | "codex";
      baseUrl: string;
      apiKey: string;
      newApiUser?: string;
    }) => Promise<{
      success: boolean;
      error?: string;
      latency?: number;
      serviceType?: "new-api" | "openrouter";
    }>;
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
  interface UsageTokenDetail {
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens: number;
    cached_tokens: number;
    total_tokens: number;
  }

  interface UsageRequestDetail {
    timestamp: string;
    source: string;
    auth_index: string;
    tokens: UsageTokenDetail;
    failed: boolean;
  }

  interface UsageModelDetail {
    total_requests: number;
    total_tokens: number;
    details: UsageRequestDetail[];
  }

  interface UsageApiDetail {
    total_requests: number;
    total_tokens: number;
    models: Record<string, UsageModelDetail>;
  }

  interface UsageData {
    total_requests: number;
    success_count: number;
    failure_count: number;
    total_tokens: number;
    requests_by_day: Record<string, number>;
    requests_by_hour: Record<string, number>;
    tokens_by_day: Record<string, number>;
    tokens_by_hour: Record<string, number>;
    apis: Record<string, UsageApiDetail>;
  }

  interface UsageResponse {
    usage: UsageData;
    failed_requests: number;
  }

  interface UptimeEntitySummary {
    id: string;
    name: string;
    status: "online" | "offline" | "degraded";
    uptimePercent: number;
    lastChecked: number;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
