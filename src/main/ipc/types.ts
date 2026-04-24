export type CustomProviderType = "openai" | "claude" | "gemini" | "codex";

export interface OpenAICompatibilityEntry {
  name: string;
  "base-url": string;
  "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  headers?: Record<string, string>;
  models?: { name: string; alias?: string }[];
}

export interface ClaudeCompatibilityEntry {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  headers?: Record<string, string>;
  models?: { name: string; alias?: string }[];
}

export interface GeminiCompatibilityEntry {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  headers?: Record<string, string>;
  models?: { name: string; alias?: string }[];
}

export interface CodexCompatibilityEntry {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  headers?: Record<string, string>;
  models?: { name: string; alias?: string }[];
}

export interface CustomProviderDrafts {
  "openai-compatibility": OpenAICompatibilityEntry[];
  "claude-api-key": ClaudeCompatibilityEntry[];
  "gemini-api-key": GeminiCompatibilityEntry[];
  "codex-api-key": CodexCompatibilityEntry[];
}

export const EMPTY_CUSTOM_PROVIDER_DRAFTS: CustomProviderDrafts = {
  "openai-compatibility": [],
  "claude-api-key": [],
  "gemini-api-key": [],
  "codex-api-key": [],
};

export type OAuthExcludedModelsConfig = Record<string, string[]>;
export type OAuthAccountExcludedModelsConfig = Record<
  string,
  Record<string, string[]>
>;

export interface OAuthModelAliasEntry {
  name: string;
  alias: string;
  fork?: boolean;
}

export type OAuthModelAliasConfig = Record<string, OAuthModelAliasEntry[]>;

export const OAUTH_SOURCE_OPTIONS_BY_PROVIDER: Record<string, string[]> = {
  gemini: ["gemini-cli", "vertex", "aistudio"],
  antigravity: ["antigravity"],
  claude: ["claude"],
  codex: ["codex"],
  qwen: ["qwen"],
  iflow: ["iflow"],
};
