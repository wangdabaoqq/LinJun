export type ProtocolType = "openai" | "claude" | "gemini" | "codex";

export interface ModelEntry {
  name: string;
  alias?: string;
}

export interface OpenAIApiKeyEntry {
  "api-key": string;
  "proxy-url"?: string;
}

export interface ClaudeApiKeyEntry {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  prefix?: string;
  models?: ModelEntry[];
}

export interface GeminiApiKeyEntry {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  prefix?: string;
  headers?: Record<string, string>;
  models?: ModelEntry[];
}

export interface CodexApiKeyEntry {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  prefix?: string;
  models?: ModelEntry[];
}

export interface OpenAIProviderData {
  name: string;
  "base-url": string;
  prefix?: string;
  "api-key-entries": OpenAIApiKeyEntry[];
  "system-access-token"?: string;
  "new-api-user"?: string;
  models?: ModelEntry[];
}

export interface OpenAICompatProvider {
  name: string;
  "base-url": string;
  "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
  models?: { name: string; alias?: string }[];
  "system-access-token"?: string;
  "new-api-user"?: string;
  prefix?: string;
}

export interface ClaudeCompatProvider {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  prefix?: string;
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

export interface CustomProviderFormProps {
  onClose: () => void;
  onSaved: () => void;
  editProvider?: OpenAICompatProvider;
  editClaudeProvider?: ClaudeCompatProvider;
  editGeminiProvider?: GeminiCompatProvider;
  editCodexProvider?: CodexCompatProvider;
  initialProtocol?: ProtocolType;
}
