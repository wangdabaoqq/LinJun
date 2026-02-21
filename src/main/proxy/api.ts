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
    return `http://127.0.0.1:${port}`;
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

  async listAuthFiles(): Promise<ManagementAuthFileItem[]> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/auth-files`,
        {
          headers: this.getAuthHeaders(),
        },
      );
      const payload = res.data;

      if (Array.isArray(payload)) {
        return payload as ManagementAuthFileItem[];
      }
      if (payload && typeof payload === "object") {
        const objectPayload = payload as {
          data?: unknown;
          items?: unknown;
          files?: unknown;
        };
        if (Array.isArray(objectPayload.data)) {
          return objectPayload.data as ManagementAuthFileItem[];
        }
        if (Array.isArray(objectPayload.items)) {
          return objectPayload.items as ManagementAuthFileItem[];
        }
        if (Array.isArray(objectPayload.files)) {
          return objectPayload.files as ManagementAuthFileItem[];
        }
      }

      return [];
    } catch (error) {
      log.error("[ManagementAPI] Failed to list auth files:", error);
      throw error;
    }
  }

  async setAuthFileStatus(
    name: string,
    disabled: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.patch(
        `${this.baseURL}/v0/management/auth-files/status`,
        { name, disabled },
        {
          headers: this.getAuthHeaders(),
        },
      );
      return { success: true };
    } catch (error) {
      log.error("[ManagementAPI] Failed to update auth file status:", error);
      return { success: false, error: String(error) };
    }
  }

  async removeAuthFile(
    name: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.delete(`${this.baseURL}/v0/management/auth-files`, {
        params: { name },
        headers: this.getAuthHeaders(),
      });
      return { success: true };
    } catch (error) {
      log.error("[ManagementAPI] Failed to remove auth file:", error);
      return { success: false, error: String(error) };
    }
  }

  async downloadAuthFile(name: string): Promise<unknown> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/auth-files/download`,
        {
          params: { name },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to download auth file:", error);
      throw error;
    }
  }

  async uploadAuthFile(
    name: string,
    payload: unknown,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const formData = new FormData();
      formData.append("file", blob, name);

      await this.client.post(
        `${this.baseURL}/v0/management/auth-files`,
        formData,
        {
          headers: this.getAuthHeaders(),
        },
      );
      return { success: true };
    } catch (error) {
      log.error("[ManagementAPI] Failed to upload auth file:", error);
      return { success: false, error: String(error) };
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

  async fetchAuthFileModels(name: string): Promise<ModelEntry[]> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/auth-files/models`,
        {
          params: { name },
          headers: this.getAuthHeaders(),
        },
      );

      const payload = res.data;
      if (Array.isArray(payload)) {
        return payload as ModelEntry[];
      }

      if (payload && typeof payload === "object") {
        const objectPayload = payload as { data?: unknown; models?: unknown };
        if (Array.isArray(objectPayload.data)) {
          return objectPayload.data as ModelEntry[];
        }
        if (Array.isArray(objectPayload.models)) {
          return objectPayload.models as ModelEntry[];
        }
      }

      return [];
    } catch (error) {
      log.error("[ManagementAPI] Failed to fetch auth file models:", error);
      throw error;
    }
  }

  async callManagementApi(params: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    authIndex?: string;
    header?: Record<string, string>;
    body?: unknown;
  }): Promise<unknown> {
    try {
      const response = await this.client.request({
        method: params.method,
        url: `${this.baseURL}/v0/management/api-call`,
        data: {
          method: params.method,
          url: params.url,
          ...(params.authIndex
            ? {
                authIndex: params.authIndex,
              }
            : {}),
          header: params.header ?? {},
          ...(params.body !== undefined
            ? {
                data:
                  typeof params.body === "string"
                    ? params.body
                    : JSON.stringify(params.body),
              }
            : {}),
        },
        headers: this.getAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      log.error("[ManagementAPI] Failed to call management api-call:", error);
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

export interface ManagementAuthFileItem {
  account?: string;
  account_type?: string;
  auth_index?: string;
  created_at?: string;
  disabled?: boolean;
  email?: string;
  id?: string;
  label?: string;
  modtime?: string;
  name?: string;
  path?: string;
  provider?: string;
  runtime_only?: boolean;
  source?: string;
  status?: string;
  status_message?: string;
  type?: string;
  unavailable?: boolean;
  updated_at?: string;
}

export interface AuthFileMetadataUpdates {
  priority?: number;
  prefix?: string;
  proxyUrl?: string;
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
