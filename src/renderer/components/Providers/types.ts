import React from "react";

export interface OpenAICompatProvider {
  name: string;
  "base-url": string;
  "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
  models?: { name: string; alias?: string }[];
  prefix?: string;
}

export interface ClaudeCompatProvider {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  models?: { name: string; alias?: string }[];
}

export interface GeminiCompatProvider {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  headers?: Record<string, string>;
  models?: { name: string; alias?: string }[];
}

export interface CodexCompatProvider {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  models?: { name: string; alias?: string }[];
}

export type CustomProviderType = "openai" | "claude" | "gemini" | "codex";

export interface CustomProviderDisplay {
  type: CustomProviderType;
  name: string;
  baseUrl: string;
  keysCount: number;
  modelsCount: number;
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
  status: "online" | "offline";
  lastUsed: string;
  filePath?: string;
}

export interface Provider {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: "teal" | "magenta" | "indigo";
  description: string;
  authType: "oauth" | "apikey" | "import" | "oauth-project";
  accounts: Account[];
}

export interface AddAccountModalProps {
  provider: Omit<Provider, "accounts">;
  onClose: () => void;
  onAdd: (account: Omit<Account, "id" | "status" | "lastUsed">) => void;
}

export interface CopilotAuthInfo {
  status: "ok" | "error";
  url: string;
  state: string;
  user_code: string;
  verification_uri: string;
}
