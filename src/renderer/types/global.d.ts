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
}

export {};
