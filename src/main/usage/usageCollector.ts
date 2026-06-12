import axios, { AxiosInstance } from "axios";

import log from "../utils/logger";

export interface UsageTokenDetail {
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
  total_tokens: number;
}

export interface UsageRequestDetail {
  timestamp: string;
  source: string;
  auth_index: string;
  tokens: UsageTokenDetail;
  failed: boolean;
}

export interface UsageModelDetail {
  total_requests: number;
  total_tokens: number;
  details: UsageRequestDetail[];
}

export interface UsageApiDetail {
  total_requests: number;
  total_tokens: number;
  models: Record<string, UsageModelDetail>;
}

export interface UsageData {
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

export interface UsageResponse {
  usage: UsageData;
  failed_requests: number;
}

interface UsageQueueRecord {
  timestamp?: unknown;
  latency_ms?: unknown;
  source?: unknown;
  auth_index?: unknown;
  tokens?: unknown;
  failed?: unknown;
  provider?: unknown;
  model?: unknown;
  alias?: unknown;
  endpoint?: unknown;
}

export interface UsageCollectorOptions {
  getBaseURL: () => string;
  getAuthHeaders: () => Record<string, string>;
  client?: AxiosInstance;
  pollIntervalMs?: number;
  batchSize?: number;
  maxDetailsPerModel?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_DETAILS_PER_MODEL = 200;

function createEmptyUsageResponse(): UsageResponse {
  return {
    usage: {
      total_requests: 0,
      success_count: 0,
      failure_count: 0,
      total_tokens: 0,
      requests_by_day: {},
      requests_by_hour: {},
      tokens_by_day: {},
      tokens_by_hour: {},
      apis: {},
    },
    failed_requests: 0,
  };
}

function normalizeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeString(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTokens(value: unknown): UsageTokenDetail {
  const record = value && typeof value === "object" ? value : {};
  const tokens = record as Record<string, unknown>;
  const inputTokens = normalizeNumber(tokens.input_tokens);
  const outputTokens = normalizeNumber(tokens.output_tokens);
  const reasoningTokens = normalizeNumber(tokens.reasoning_tokens);
  const cachedTokens = normalizeNumber(tokens.cached_tokens);
  const totalTokens = normalizeNumber(tokens.total_tokens);

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    reasoning_tokens: reasoningTokens,
    cached_tokens: cachedTokens,
    total_tokens:
      totalTokens || inputTokens + outputTokens + reasoningTokens + cachedTokens,
  };
}

function getTimeBuckets(timestamp: string): { day: string; hour: string } {
  const date = new Date(timestamp);
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const day = validDate.toISOString().slice(0, 10);
  const hour = validDate.toISOString().slice(0, 13);
  return { day, hour };
}

export class UsageCollector {
  private readonly client: AxiosInstance;
  private readonly getBaseURL: () => string;
  private readonly getAuthHeaders: () => Record<string, string>;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly maxDetailsPerModel: number;
  private timer: NodeJS.Timeout | null = null;
  private polling = false;
  private snapshot: UsageResponse = createEmptyUsageResponse();

  constructor(options: UsageCollectorOptions) {
    this.client = options.client || axios.create({ timeout: 10000 });
    this.getBaseURL = options.getBaseURL;
    this.getAuthHeaders = options.getAuthHeaders;
    this.pollIntervalMs = options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
    this.batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
    this.maxDetailsPerModel =
      options.maxDetailsPerModel || DEFAULT_MAX_DETAILS_PER_MODEL;
  }

  start(): void {
    if (this.timer) {
      return;
    }

    void this.pollOnce();
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  reset(): void {
    this.snapshot = createEmptyUsageResponse();
  }

  getUsage(): UsageResponse {
    return structuredClone(this.snapshot);
  }

  hasData(): boolean {
    return this.snapshot.usage.total_requests > 0;
  }

  ingest(records: UsageQueueRecord[]): void {
    for (const record of records) {
      this.ingestRecord(record);
    }
  }

  async pollOnce(): Promise<void> {
    if (this.polling) {
      return;
    }

    this.polling = true;
    try {
      const response = await this.client.get(
        `${this.getBaseURL()}/v0/management/usage-queue`,
        {
          params: { count: this.batchSize },
          headers: this.getAuthHeaders(),
        },
      );

      if (Array.isArray(response.data)) {
        this.ingest(response.data as UsageQueueRecord[]);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return;
      }
      log.warn("[UsageCollector] Failed to poll usage queue:", error);
    } finally {
      this.polling = false;
    }
  }

  private ingestRecord(record: UsageQueueRecord): void {
    const timestamp = normalizeString(record.timestamp, new Date().toISOString());
    const provider = normalizeString(record.provider, "unknown");
    const model = normalizeString(record.model || record.alias, "unknown");
    const source = normalizeString(record.source, provider);
    const authIndex = normalizeString(record.auth_index, "");
    const tokens = normalizeTokens(record.tokens);
    const failed = record.failed === true;
    const { day, hour } = getTimeBuckets(timestamp);
    const usage = this.snapshot.usage;

    usage.total_requests += 1;
    usage.total_tokens += tokens.total_tokens;
    if (failed) {
      usage.failure_count += 1;
      this.snapshot.failed_requests += 1;
    } else {
      usage.success_count += 1;
    }

    usage.requests_by_day[day] = (usage.requests_by_day[day] || 0) + 1;
    usage.requests_by_hour[hour] = (usage.requests_by_hour[hour] || 0) + 1;
    usage.tokens_by_day[day] = (usage.tokens_by_day[day] || 0) + tokens.total_tokens;
    usage.tokens_by_hour[hour] =
      (usage.tokens_by_hour[hour] || 0) + tokens.total_tokens;

    const api = (usage.apis[provider] ||= {
      total_requests: 0,
      total_tokens: 0,
      models: {},
    });
    api.total_requests += 1;
    api.total_tokens += tokens.total_tokens;

    const modelDetail = (api.models[model] ||= {
      total_requests: 0,
      total_tokens: 0,
      details: [],
    });
    modelDetail.total_requests += 1;
    modelDetail.total_tokens += tokens.total_tokens;
    modelDetail.details.push({
      timestamp,
      source,
      auth_index: authIndex,
      tokens,
      failed,
    });

    if (modelDetail.details.length > this.maxDetailsPerModel) {
      modelDetail.details.splice(
        0,
        modelDetail.details.length - this.maxDetailsPerModel,
      );
    }
  }
}
