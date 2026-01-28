import axios, { AxiosInstance } from "axios";
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

  async getStatus(): Promise<{ running: boolean; version: string }> {
    const res = await this.client.get(`${this.baseURL}/management/status`);
    return res.data;
  }

  async getAccounts(): Promise<Account[]> {
    const res = await this.client.get(`${this.baseURL}/management/accounts`);
    return res.data;
  }

  async getQuota(): Promise<QuotaInfo[]> {
    const res = await this.client.get(`${this.baseURL}/management/quota`);
    return res.data;
  }

  async startAuth(provider: Provider): Promise<{ authUrl: string }> {
    const res = await this.client.post(
      `${this.baseURL}/management/auth/${provider}/start`,
    );
    return res.data;
  }

  async removeAccount(provider: Provider, accountId: string): Promise<void> {
    await this.client.delete(
      `${this.baseURL}/management/accounts/${provider}/${accountId}`,
    );
  }

  async validateApiKey(
    provider: Provider,
    apiKey: string,
  ): Promise<{ valid: boolean; email?: string }> {
    const res = await this.client.post(
      `${this.baseURL}/management/auth/${provider}/apikey`,
      {
        apiKey,
      },
    );
    return res.data;
  }

  async getLogs(limit: number = 100): Promise<LogEntry[]> {
    const res = await this.client.get(`${this.baseURL}/management/logs`, {
      params: { limit },
    });
    return res.data;
  }

  async getStats(): Promise<StatsResponse> {
    try {
      const res = await this.client.get(`${this.baseURL}/management/stats`);
      return res.data;
    } catch {
      return {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        totalTokens: 0,
        avgLatency: 0,
        uptime: 0,
      };
    }
  }

  async getHealth(): Promise<HealthResponse> {
    try {
      const res = await this.client.get(`${this.baseURL}/management/health`);
      return res.data;
    } catch {
      return { healthy: false, checks: {} };
    }
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
      console.error("[ManagementAPI] Failed to get Qwen auth URL:", error);
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
      console.error(
        "[ManagementAPI] Failed to get Antigravity auth URL:",
        error,
      );
      return { status: "error", url: "", state: "" };
    }
  }

  async getClaudeAuthUrl(): Promise<QwenAuthUrlResponse> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/claude-auth-url`,
        {
          params: { is_webui: true },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      console.error("[ManagementAPI] Failed to get Claude auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  }

  async getGeminiAuthUrl(projectId?: string): Promise<QwenAuthUrlResponse> {
    try {
      const res = await this.client.get(
        `${this.baseURL}/v0/management/gemini-cli-auth-url`,
        {
          params: { project_id: projectId || null, is_webui: true },
          headers: this.getAuthHeaders(),
        },
      );
      return res.data;
    } catch (error) {
      console.error("[ManagementAPI] Failed to get Gemini auth URL:", error);
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
      console.error("[ManagementAPI] Failed to get Codex auth URL:", error);
      return { status: "error", url: "", state: "" };
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
      console.error("[ManagementAPI] Failed to get Copilot auth URL:", error);
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
      console.error("[ManagementAPI] Failed to get Qwen auth status:", error);
      return { status: "error" };
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
  | "vertex"
  | "custom";

export interface Account {
  id: string;
  provider: Provider;
  email: string;
  status: "active" | "cooling" | "error";
  quotaUsed: number;
  quotaLimit: number;
}

export interface QuotaInfo {
  provider: Provider;
  accountId: string;
  used: number;
  limit: number;
  resetAt: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  provider: Provider;
  model: string;
  tokens: number;
  status: "success" | "error";
  duration: number;
}

export interface StatsResponse {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  avgLatency: number;
  uptime: number;
}

export interface HealthResponse {
  healthy: boolean;
  checks: Record<string, boolean>;
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
