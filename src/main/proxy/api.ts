import axios, { AxiosInstance } from "axios";

import log from "../utils/logger";
import { proxyManager } from "./manager";
import { store } from "../utils/store";

class ManagementAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 10000,
    });
  }

  private get baseURL(): string {
    const port = (store.get("port") as number) || proxyManager.getPort();
    const bindHost = proxyManager.getHost();
    const localConnectHost = bindHost || "127.0.0.1";
    return `http://${localConnectHost}:${port}`;
  }

  private getAuthHeaders(): Record<string, string> {
    const secret = store.get("managementSecret") as string | undefined;
    if (secret) {
      return { Authorization: `Bearer ${secret}` };
    }
    return {};
  }

  private getModelAuthHeaders(): Record<string, string> {
    const config = proxyManager.loadConfigFromYaml();
    const apiKey = config?.["api-keys"]?.find((key) => key.trim().length > 0);

    if (apiKey) {
      return { Authorization: `Bearer ${apiKey}` };
    }

    return this.getAuthHeaders();
  }

  async getQwenAuthUrl(): Promise<QwenAuthUrlResponse> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/qwen-auth-url`,
        {
          params: { is_webui: true },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to get Qwen auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  }

  async getAntigravityAuthUrl(): Promise<QwenAuthUrlResponse> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/antigravity-auth-url`,
        {
          params: { is_webui: true },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to get Antigravity auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  }

  async getIFlowAuthUrl(): Promise<QwenAuthUrlResponse> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/iflow-auth-url`,
        {
          params: { is_webui: true },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to get iFlow auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  }

  async getClaudeAuthUrl(): Promise<QwenAuthUrlResponse> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/anthropic-auth-url`,
        {
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to get Claude auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  }

  async getGeminiAuthUrl(projectId?: string): Promise<QwenAuthUrlResponse> {
    try {
      const trimmedProjectId = projectId?.trim();
      const res = await this.client.get(
        `${this.baseURL}/v0/management/gemini-cli-auth-url`,
        {
          params: {
            is_webui: true,
            ...(trimmedProjectId ? { project_id: trimmedProjectId } : {}),
          },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to get Gemini auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  }

  async getCodexAuthUrl(): Promise<QwenAuthUrlResponse> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/codex-auth-url`,
        {
          params: { is_webui: true },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to get Codex auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  }

  async getKiroAuthUrl(params?: {
    method?: string;
    startUrl?: string;
    region?: string;
  }): Promise<QwenAuthUrlResponse> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/kiro-auth-url`,
        {
          params: {
            is_webui: true,
            method: params?.method,
            startUrl: params?.startUrl,
            region: params?.region,
          },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.warn("[ManagementAPI] Kiro management auth URL unavailable:", error);
      return { status: "error", url: "", state: "" };
    }
  }

  async getKiroAuthStatus(state: string): Promise<{
    status: "wait" | "device_code" | "auth_url" | "error";
    verification_url?: string;
    user_code?: string;
    url?: string;
    error?: string;
  }> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/get-auth-status`,
        {
          params: { state },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to get Kiro auth status:", error);
      return { status: "error", error: "auth status failed" };
    }
  }

  async getCopilotAuthUrl(): Promise<CopilotAuthUrlResponse> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/github-auth-url`,
        {
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to get Copilot auth URL:", error);
      return {
        status: "error",
        url: "",
        state: "",
        user_code: "",
        verification_uri: "",
      };
    }
  }

  async getQwenAuthStatus(state: string): Promise<QwenAuthStatusResponse> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/get-auth-status`,
        {
          params: { state },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to get Qwen auth status:", error);
      return { status: "error" };
    }
  }

  async fetchModels(): Promise<ModelEntry[]> {
    try {
      const res = await this.client.get(`${this.baseURL}/v1/models`, {
        params: { is_webui: true },
        headers: this.getModelAuthHeaders(),
      });
      const models = res.data?.data ?? [];
      log.info(`[ManagementAPI] Fetched ${models.length} models`);
      return models;
    } catch (error) {
      log.error("[ManagementAPI] Failed to fetch models:", error);
      throw error;
    }
  }

  async getUsage(): Promise<UsageResponse> {
    try {
      const res = await this.client.get(`${this.baseURL}/v0/management/usage`, {
        headers: this.getAuthHeaders(),
      });
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to get usage:", error);
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
  }
}

export const managementAPI = new ManagementAPI();

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

export interface ModelEntry {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface QwenAuthUrlResponse {
  status: "ok" | "error";
  url: string;
  state: string;
}

export interface QwenAuthStatusResponse {
  status: "pending" | "ok" | "error";
}

export interface CopilotAuthUrlResponse {
  status: "ok" | "error";
  url: string;
  state: string;
  user_code: string;
  verification_uri: string;
}

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
