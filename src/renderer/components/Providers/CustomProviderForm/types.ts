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
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  models?: ModelEntry[];
}

export interface GeminiApiKeyEntry {
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  headers?: Record<string, string>;
  models?: ModelEntry[];
}

export interface CodexApiKeyEntry {
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  models?: ModelEntry[];
}

export interface OpenAIProviderData {
  name: string;
  "base-url": string;
  prefix?: string;
  "api-key-entries": OpenAIApiKeyEntry[];
  models?: ModelEntry[];
}

export interface CustomProviderFormProps {
  onClose: () => void;
  onSaved: () => void;
  editProvider?: OpenAIProviderData;
  editClaudeProvider?: ClaudeApiKeyEntry[];
  editGeminiProvider?: GeminiApiKeyEntry[];
  editCodexProvider?: CodexApiKeyEntry[];
  initialProtocol?: ProtocolType;
}
