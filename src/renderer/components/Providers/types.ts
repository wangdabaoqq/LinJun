import React from "react";

export interface OpenAICompatProvider {
  name: string;
  "base-url": string;
  "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
  models?: { name: string; alias?: string }[];
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
