export type ProtocolType = "openai" | "claude" | "gemini" | "codex";

export type PresetProviderId = "manual" | "new-api" | "openrouter";

export interface PresetProvider {
  id: PresetProviderId;
  labelKey: string;
  protocol: ProtocolType;
  defaults: {
    name?: string;
    "base-url"?: string;
    prefix?: string;
  };
  showFields: {
    systemAccessToken: boolean;
    newApiUser: boolean;
  };
  requiredFields: {
    systemAccessToken: boolean;
    newApiUser: boolean;
  };
}

export const PRESET_PROVIDERS: PresetProvider[] = [
  {
    id: "manual",
    labelKey: "customPresetManual",
    protocol: "openai",
    defaults: {},
    showFields: {
      systemAccessToken: false,
      newApiUser: false,
    },
    requiredFields: {
      systemAccessToken: false,
      newApiUser: false,
    },
  },
  {
    id: "new-api",
    labelKey: "customPresetNewApi",
    protocol: "openai",
    defaults: {
      name: "New API",
    },
    showFields: {
      systemAccessToken: true,
      newApiUser: true,
    },
    requiredFields: {
      systemAccessToken: true,
      newApiUser: true,
    },
  },
  {
    id: "openrouter",
    labelKey: "customPresetOpenRouter",
    protocol: "openai",
    defaults: {
      name: "OpenRouter",
      "base-url": "https://openrouter.ai/api",
    },
    showFields: {
      systemAccessToken: false,
      newApiUser: false,
    },
    requiredFields: {
      systemAccessToken: false,
      newApiUser: false,
    },
  },
];

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
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  headers?: Record<string, string>;
  models?: ModelEntry[];
}

export interface GeminiApiKeyEntry {
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
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
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  headers?: Record<string, string>;
  models?: ModelEntry[];
}

export interface AmpcodeApiKeyMappingEntry {
  "upstream-api-key": string;
  "api-keys": string[];
}

export interface AmpcodeModelMappingEntry {
  from: string;
  to: string;
}

export interface AmpcodeProvider {
  "upstream-url": string;
  "upstream-api-key"?: string;
  "upstream-api-keys"?: AmpcodeApiKeyMappingEntry[];
  "restrict-management-to-localhost"?: boolean;
  "force-model-mappings"?: boolean;
  "model-mappings"?: AmpcodeModelMappingEntry[];
}

export interface OpenAIProviderData {
  name: string;
  "base-url": string;
  prefix?: string;
  "api-key-entries": OpenAIApiKeyEntry[];
  "system-access-token"?: string;
  "new-api-user"?: string;
  headers?: Record<string, string>;
  models?: ModelEntry[];
}

export interface OpenAICompatProvider {
  name: string;
  "base-url": string;
  "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
  models?: { name: string; alias?: string }[];
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  headers?: Record<string, string>;
}

export interface ClaudeCompatProvider {
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

export interface GeminiCompatProvider {
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

export interface CodexCompatProvider {
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
