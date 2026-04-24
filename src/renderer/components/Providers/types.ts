import React from "react";

export interface OpenAICompatProvider {
  name: string;
  "base-url": string;
  "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
  models?: { name: string; alias?: string }[];
  "system-access-token"?: string;
  "new-api-user"?: string;
  prefix?: string;
  headers?: Record<string, string>;
}

export interface ClaudeCompatProvider {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  prefix?: string;
  headers?: Record<string, string>;
  models?: { name: string; alias?: string }[];
}

export interface GeminiCompatProvider {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  prefix?: string;
  headers?: Record<string, string>;
  models?: { name: string; alias?: string }[];
}

export interface CodexCompatProvider {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  prefix?: string;
  headers?: Record<string, string>;
  models?: { name: string; alias?: string }[];
}

export interface AmpcodeCompatProvider {
  "upstream-url": string;
  "upstream-api-key"?: string;
  "upstream-api-keys"?: {
    "upstream-api-key": string;
    "api-keys": string[];
  }[];
  "restrict-management-to-localhost"?: boolean;
  "force-model-mappings"?: boolean;
  "model-mappings"?: { from: string; to: string }[];
}

export type CustomProviderType = "openai" | "claude" | "gemini" | "codex";

export interface CustomProviderDisplay {
  id: string;
  type: CustomProviderType;
  name: string;
  baseUrl: string;
  keysCount: number;
  modelsCount: number;
  enabled: boolean;
  rawData:
    | OpenAICompatProvider
    | ClaudeCompatProvider
    | GeminiCompatProvider
    | CodexCompatProvider;
}

export interface Account {
  id: string;
  email: string;
  nickname?: string;
  accountKey?: string;
  oauthSourceKey?: string;
  status: "online" | "offline" | "expired";
  enabled?: boolean;
  lastUsed: string;
  filePath?: string;
  expiresAt?: string;
}

export interface Provider {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: "teal" | "magenta" | "indigo";
  description: string;
  authType: "oauth" | "apikey" | "import" | "oauth-project";
  accounts: Account[];
  compatStatus?:
    | "fallback"
    | "migration-pending"
    | "migration-complete"
    | "migration-failed";
}

export interface AddAccountModalProps {
  provider: Omit<Provider, "accounts">;
  onClose: () => void;
  onAdd: (account: Omit<Account, "id" | "status" | "lastUsed">) => void;
}
