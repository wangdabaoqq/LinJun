import axios, { AxiosInstance } from "axios";
import { proxyManager } from "./manager";

class ManagementAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 10000,
    });
  }

  private get baseURL(): string {
    return `http://127.0.0.1:${proxyManager.getPort()}`;
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
