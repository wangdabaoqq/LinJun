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

  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
