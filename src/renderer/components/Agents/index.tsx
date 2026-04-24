import { useState, useEffect, useMemo } from "react";
import log from "@renderer/utils/logger";
import { useTranslations, useSettingsStore } from "../../stores/settings";
import {
  X,
  Zap,
  Box,
  Globe,
  RefreshCw,
  Loader2,
  Save,
  Copy,
  Check,
  XCircle,
} from "lucide-react";
import { DEFAULT_PORT } from "../../../shared/constants";
import { Modal } from "../ui/Modal";
import { copyTextToClipboard } from "@renderer/utils/clipboard";

interface CLIToolInfo {
  name: string;
  command: string;
  status: "installed" | "not_found";
  path?: string;
  version?: string;
  configPath?: string;
  authPath?: string;
}

interface ConfigModalProps {
  tool: CLIToolInfo;
  onClose: () => void;
}

interface ProviderModels {
  [modelName: string]: {
    limit: { context: number; output: number };
    name: string;
    options?: Record<string, unknown>;
    reasoning?: boolean;
  };
}

interface DroidModelConfig {
  provider: string;
  name: string;
  apiKey: string;
  displayName: string;
  baseUrl: string;
}

const PROVIDER_MODEL_MAP: Record<string, ProviderModels> = {
  claude: {
    "claude-sonnet-4-5": {
      limit: { context: 200000, output: 64000 },
      name: "Claude Sonnet 4.5",
    },
    "claude-opus-4-5-thinking": {
      limit: { context: 200000, output: 64000 },
      name: "Claude Opus 4.5 Thinking",
      options: { thinking: { budgetTokens: 10000, type: "enabled" } },
      reasoning: true,
    },
  },
  gemini: {
    "gemini-2.5-pro": {
      limit: { context: 1000000, output: 65536 },
      name: "Gemini 2.5 Pro",
    },
    "gemini-2.5-flash": {
      limit: { context: 1000000, output: 65536 },
      name: "Gemini 2.5 Flash",
    },
  },
  codex: {
    "gpt-5": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5",
      options: { reasoning: { effort: "medium" } },
      reasoning: true,
    },
    "gpt-5-codex": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5 Codex",
      options: { reasoning: { effort: "medium" } },
      reasoning: true,
    },
    "gpt-5-codex-mini": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5 Codex Mini",
      options: { reasoning: { effort: "low" } },
      reasoning: true,
    },
    "gpt-5-mini": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5 Mini",
      options: { reasoning: { effort: "low" } },
      reasoning: true,
    },
    "gpt-5.1": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5.1",
      options: { reasoning: { effort: "medium" } },
      reasoning: true,
    },
    "gpt-5.1-codex": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5.1 Codex",
      options: { reasoning: { effort: "medium" } },
      reasoning: true,
    },
    "gpt-5.1-codex-max": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5.1 Codex Max",
      options: { reasoning: { effort: "high" } },
      reasoning: true,
    },
    "gpt-5.1-codex-mini": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5.1 Codex Mini",
      options: { reasoning: { effort: "low" } },
      reasoning: true,
    },
    "gpt-5.2": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5.2",
      options: { reasoning: { effort: "medium" } },
      reasoning: true,
    },
    "gpt-5.2-codex": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5.2 Codex",
      options: { reasoning: { effort: "medium" } },
      reasoning: true,
    },
    "gpt-5.3-codex": {
      limit: { context: 400000, output: 32768 },
      name: "Gpt 5.3 Codex",
      options: { reasoning: { effort: "medium" } },
      reasoning: true,
    },
  },
  antigravity: {
    "gemini-2.5-computer-use-preview-10-2025": {
      limit: { context: 1048576, output: 65536 },
      name: "Gemini 2.5 Computer Use Preview 10 2025",
    },
    "gemini-2.5-flash": {
      limit: { context: 1048576, output: 65536 },
      name: "Gemini 2.5 Flash",
    },
    "gemini-2.5-flash-lite": {
      limit: { context: 1048576, output: 65536 },
      name: "Gemini 2.5 Flash Lite",
    },
    "gemini-3-flash-preview": {
      limit: { context: 1048576, output: 65536 },
      name: "Gemini 3 Flash Preview",
    },
    "gemini-3-pro-image-preview": {
      limit: { context: 1048576, output: 65536 },
      name: "Gemini 3 Pro Image Preview",
    },
    "gemini-3-pro-preview": {
      limit: { context: 1048576, output: 65536 },
      name: "Gemini 3 Pro Preview",
    },
    "gemini-claude-opus-4-5-thinking": {
      limit: { context: 200000, output: 64000 },
      name: "Gemini Claude Opus 4 5 Thinking",
      options: { thinking: { budgetTokens: 10000, type: "enabled" } },
      reasoning: true,
    },
    "gemini-claude-sonnet-4-5": {
      limit: { context: 200000, output: 64000 },
      name: "Gemini Claude Sonnet 4 5",
    },
    "gemini-claude-sonnet-4-5-thinking": {
      limit: { context: 200000, output: 64000 },
      name: "Gemini Claude Sonnet 4 5 Thinking",
      options: { thinking: { budgetTokens: 10000, type: "enabled" } },
      reasoning: true,
    },
  },
};

const DROID_PROVIDER_MAP: Record<string, string> = {
  claude: "anthropic",
  codex: "openai",
  gemini: "generic-chat-completion-api",
  antigravity: "generic-chat-completion-api",
};

const CACHE_KEY = "cli_tools_cache";
const CACHE_DURATION = 5 * 60 * 1000;

interface CachedData {
  tools: CLIToolInfo[];
  timestamp: number;
}

function getCachedTools(): CLIToolInfo[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedData = JSON.parse(cached);
    const now = Date.now();

    if (now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data.tools;
  } catch (error) {
    log.error("Failed to read cache:", error);
    return null;
  }
}

function setCachedTools(tools: CLIToolInfo[]): void {
  try {
    const data: CachedData = {
      tools,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    log.error("Failed to write cache:", error);
  }
}

function ConfigModal({ tool, onClose }: ConfigModalProps) {
  const t = useTranslations();
  const port = useSettingsStore((s) => s.port);
  const host = useSettingsStore((s) => s.host);
  const [saving, setSaving] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(
    `http://${host || "127.0.0.1"}:${port}`,
  );
  const [apiKey, setApiKey] = useState("");
  const [activeProviders, setActiveProviders] = useState<string[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    error?: string;
    latency?: number;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [hasDiskConfigContent, setHasDiskConfigContent] = useState(false);
  const [hasDiskAuthContent, setHasDiskAuthContent] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "connection" | "config" | "auth" | "env"
  >("connection");

  const hasConfigFiles =
    tool.name === "Codex CLI" ||
    tool.name === "Claude Code" ||
    tool.name === "OpenCode" ||
    tool.name === "Amp CLI" ||
    tool.name === "Droid CLI" ||
    tool.name === "iFlow CLI";
  const hasAuthFile = tool.name === "Codex CLI" || tool.name === "Amp CLI";
  const hasEnvConfig =
    tool.name === "Claude Code" ||
    tool.name === "Gemini CLI" ||
    tool.name === "Amp CLI" ||
    tool.name === "iFlow CLI";

  const tabItems = useMemo(() => {
    const items: Array<{
      id: "connection" | "config" | "auth" | "env";
      label: string;
    }> = [
      {
        id: "connection",
        label: t.agents.tabConnection,
      },
    ];

    if (hasConfigFiles) {
      items.push({
        id: "config",
        label:
          tool.name === "Claude Code" ||
          tool.name === "Amp CLI" ||
          tool.name === "iFlow CLI"
            ? t.agents.tabSettings
            : tool.name === "OpenCode"
              ? "opencode.json"
              : tool.name === "Droid CLI"
                ? t.agents.tabConfigJson
                : t.agents.tabConfigToml,
      });
    }

    if (hasAuthFile) {
      items.push({
        id: "auth",
        label: tool.name === "Amp CLI" ? t.agents.tabSecrets : t.agents.tabAuth,
      });
    }

    if (hasEnvConfig) {
      items.push({
        id: "env",
        label: t.agents.tabEnv,
      });
    }

    return items;
  }, [
    hasAuthFile,
    hasConfigFiles,
    hasEnvConfig,
    t.agents.tabAuth,
    t.agents.tabConfigJson,
    t.agents.tabConfigToml,
    t.agents.tabConnection,
    t.agents.tabEnv,
    t.agents.tabSettings,
    tool.name,
  ]);

  const activeTabIndex = Math.max(
    0,
    tabItems.findIndex((item) => item.id === activeTab),
  );

  const tabSliderLeft = useMemo(() => {
    if (tabItems.length === 4) {
      if (activeTabIndex === 0) return "4px";
      if (activeTabIndex === 1) return "calc(25% + 2px)";
      if (activeTabIndex === 2) return "calc(50% + 1px)";
      return "calc(75% - 1px)";
    }

    return `calc(${(100 / tabItems.length) * activeTabIndex}% + 2px)`;
  }, [activeTabIndex, tabItems.length]);

  useEffect(() => {
    if (!tabItems.some((item) => item.id === activeTab)) {
      setActiveTab(tabItems[0]?.id || "connection");
    }
  }, [activeTab, tabItems]);

  // 监听端口变化，自动更新 proxyUrl
  useEffect(() => {
    setProxyUrl(`http://${host || "127.0.0.1"}:${port}`);
  }, [port, host]);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const result = await window.electronAPI?.apiKeys.getAll();
        if (result?.success && result.keys && result.keys.length > 0) {
          setApiKey(result.keys[0]);
        }
      } catch (error) {
        log.error("Failed to load API key:", error);
      }
    };
    loadApiKey();
  }, []);

  const loadActiveProviders = async (): Promise<string[]> => {
    try {
      const result = await window.electronAPI?.providers.getAccounts();
      if (result?.success && result.accounts) {
        const providerIds = [
          ...new Set(
            result.accounts.map((acc: { provider: string }) => acc.provider),
          ),
        ] as string[];
        setActiveProviders(providerIds);
        return providerIds;
      }
    } catch (error) {
      log.error("Failed to load providers:", error);
    }

    setActiveProviders([]);
    return [];
  };

  useEffect(() => {
    void loadActiveProviders();
  }, []);

  useEffect(() => {
    let disposed = false;

    const loadConfigFromDisk = async () => {
      try {
        const result = await window.electronAPI?.cli.readConfig(tool.name);
        const config = result?.config;

        const hasConfig = typeof config?.configContent === "string";
        const hasAuth = typeof config?.authContent === "string";

        if (!disposed && hasConfig) {
          setConfigContent(config.configContent);
        }

        if (!disposed && hasAuth) {
          setAuthContent(config.authContent);
        }

        if (!disposed) {
          setHasDiskConfigContent(hasConfig);
          setHasDiskAuthContent(hasAuth);
        }
      } catch (error) {
        log.error("[Agents] Failed to load CLI config from disk:", error);
      }
    };

    void loadConfigFromDisk();

    return () => {
      disposed = true;
    };
  }, [tool.name]);

  const getDefaultClaudeConfig = () => {
    return JSON.stringify(
      {
        alwaysThinkingEnabled: true,
        env: {
          ANTHROPIC_AUTH_TOKEN: apiKey,
          ANTHROPIC_BASE_URL: proxyUrl,
          ANTHROPIC_DEFAULT_HAIKU_MODEL: "gemini-3-flash-preview",
          ANTHROPIC_DEFAULT_OPUS_MODEL: "gemini-claude-opus-4-5-thinking",
          ANTHROPIC_DEFAULT_SONNET_MODEL: "gemini-claude-sonnet-4-5",
          ANTHROPIC_MODEL: "gemini-claude-sonnet-4-5",
        },
        model: "gemini-claude-opus-4-5-thinking",
      },
      null,
      2,
    );
  };

  const getDefaultCodexConfig = () => {
    return `# ${t.agents.configCodexHeader}
model_provider = "cliproxyapi"
model = "gpt-5.2-codex"
model_reasoning_effort = "high"

[model_providers.cliproxyapi]
name = "cliproxyapi"
base_url = "${proxyUrl}/v1"
wire_api = "responses"`;
  };

  const getDefaultCodexAuth = () => {
    return JSON.stringify(
      {
        OPENAI_API_KEY: apiKey,
      },
      null,
      2,
    );
  };

  const getDefaultClaudeEnv = () => {
    return `# ${t.agents.configClaudeHeader}
export ANTHROPIC_BASE_URL="${proxyUrl}"
export ANTHROPIC_AUTH_TOKEN="${apiKey}"
export ANTHROPIC_DEFAULT_OPUS_MODEL="gemini-claude-opus-4-5-thinking"
export ANTHROPIC_DEFAULT_SONNET_MODEL="gemini-claude-sonnet-4-5"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="gemini-3-flash-preview"`;
  };

  const getDefaultGeminiEnv = () => {
    return `# ${t.agents.configGeminiHeader}
export CODE_ASSIST_ENDPOINT="${proxyUrl}"
export GEMINI_MODEL="gemini-3-pro-preview"`;
  };

  const getDefaultAmpConfig = () => {
    return JSON.stringify(
      {
        "amp.url": proxyUrl,
      },
      null,
      2,
    );
  };

  const getDefaultAmpSecrets = () => {
    return JSON.stringify(
      {
        [`apiKey@${proxyUrl}`]: apiKey || "your-api-key",
      },
      null,
      2,
    );
  };

  const getDefaultAmpEnv = () => {
    return `# ${t.agents.configAmpHeader}
export AMP_URL="${proxyUrl}"
export AMP_API_KEY="${apiKey}"`;
  };

  const buildDroidModels = (providerIds: string[]): DroidModelConfig[] => {
    const models: DroidModelConfig[] = [];

    for (const providerId of providerIds) {
      const providerModels = PROVIDER_MODEL_MAP[providerId];
      if (!providerModels) continue;
      const droidProvider =
        DROID_PROVIDER_MAP[providerId] || "generic-chat-completion-api";

      for (const [modelId, modelInfo] of Object.entries(providerModels)) {
        models.push({
          provider: droidProvider,
          name: modelId,
          apiKey: apiKey || "your-api-key",
          displayName: modelInfo.name,
          baseUrl: `${proxyUrl}/v1`,
        });
      }
    }

    if (models.length === 0) {
      models.push({
        provider: "anthropic",
        name: "claude-sonnet-4-5",
        apiKey: apiKey || "your-api-key",
        displayName: "Claude Sonnet 4.5",
        baseUrl: `${proxyUrl}/v1`,
      });
    }

    return models;
  };

  const getDefaultDroidConfig = (providerIds: string[] = activeProviders) => {
    const models = buildDroidModels(providerIds);
    return JSON.stringify({ models }, null, 2);
  };

  const getDefaultIFlowConfig = () => {
    return JSON.stringify(
      {
        apiKey: apiKey || "your-api-key",
        baseUrl: `${proxyUrl}/v1`,
        modelName: "claude-sonnet-4-5",
      },
      null,
      2,
    );
  };

  const getDefaultIFlowEnv = () => {
    return `# ${t.agents.configIFlowHeader}
export IFLOW_apiKey="${apiKey}"
export IFLOW_baseUrl="${proxyUrl}/v1"
export IFLOW_modelName="claude-sonnet-4-5"`;
  };

  const buildOpenCodeModels = (providerIds: string[]): ProviderModels => {
    const models: ProviderModels = {};
    for (const providerId of providerIds) {
      const providerModels = PROVIDER_MODEL_MAP[providerId];
      if (providerModels) {
        Object.assign(models, providerModels);
      }
    }

    return models;
  };

  const getDefaultOpenCodeConfig = (
    providerIds: string[] = activeProviders,
  ) => {
    const models = buildOpenCodeModels(providerIds);

    const config: Record<string, unknown> = {
      $schema: "https://opencode.ai/config.json",
      provider: {
        linjun: {
          ...(Object.keys(models).length > 0 && { models }),
          name: t.agents.linjunProxy,
          npm: "@ai-sdk/anthropic",
          options: {
            apiKey: apiKey || "your-api-key",
            baseURL: `${proxyUrl}/v1`,
          },
        },
      },
    };

    return JSON.stringify(config, null, 2);
  };

  const syncOpenCodeConfigModels = (
    rawConfig: string,
    providerIds: string[],
  ): string => {
    const models = buildOpenCodeModels(providerIds);

    try {
      const parsed = JSON.parse(rawConfig);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return getDefaultOpenCodeConfig(providerIds);
      }

      const config = parsed as Record<string, unknown>;
      const provider =
        config.provider &&
        typeof config.provider === "object" &&
        !Array.isArray(config.provider)
          ? (config.provider as Record<string, unknown>)
          : {};
      const existingLinjun =
        provider.linjun &&
        typeof provider.linjun === "object" &&
        !Array.isArray(provider.linjun)
          ? (provider.linjun as Record<string, unknown>)
          : {};

      const linjun: Record<string, unknown> = {
        name: t.agents.linjunProxy,
        npm: "@ai-sdk/anthropic",
        options: {
          apiKey: apiKey || "your-api-key",
          baseURL: `${proxyUrl}/v1`,
        },
        ...existingLinjun,
      };

      if (Object.keys(models).length > 0) {
        linjun.models = models;
      } else {
        delete linjun.models;
      }

      provider.linjun = linjun;
      config.provider = provider;

      return JSON.stringify(config, null, 2);
    } catch (error) {
      log.error("[Agents] Failed to sync OpenCode models:", error);
      return getDefaultOpenCodeConfig(providerIds);
    }
  };

  const syncDroidConfigModels = (
    rawConfig: string,
    providerIds: string[],
  ): string => {
    const models = buildDroidModels(providerIds);

    try {
      const parsed = JSON.parse(rawConfig);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return getDefaultDroidConfig(providerIds);
      }

      const config = parsed as Record<string, unknown>;
      config.models = models;

      return JSON.stringify(config, null, 2);
    } catch (error) {
      log.error("[Agents] Failed to sync Droid models:", error);
      return getDefaultDroidConfig(providerIds);
    }
  };

  const [configContent, setConfigContent] = useState(
    tool.name === "Claude Code"
      ? getDefaultClaudeConfig()
      : tool.name === "OpenCode"
        ? getDefaultOpenCodeConfig()
        : tool.name === "Amp CLI"
          ? getDefaultAmpConfig()
          : tool.name === "Droid CLI"
            ? getDefaultDroidConfig()
            : tool.name === "iFlow CLI"
              ? getDefaultIFlowConfig()
              : getDefaultCodexConfig(),
  );
  const [authContent, setAuthContent] = useState(
    tool.name === "Amp CLI" ? getDefaultAmpSecrets() : getDefaultCodexAuth(),
  );
  const [envContent, setEnvContent] = useState(
    tool.name === "Claude Code"
      ? getDefaultClaudeEnv()
      : tool.name === "Amp CLI"
        ? getDefaultAmpEnv()
        : tool.name === "iFlow CLI"
          ? getDefaultIFlowEnv()
          : getDefaultGeminiEnv(),
  );

  useEffect(() => {
    if (!hasDiskConfigContent) {
      if (tool.name === "Claude Code") {
        setConfigContent(getDefaultClaudeConfig());
        setEnvContent(getDefaultClaudeEnv());
      } else if (tool.name === "Gemini CLI") {
        setEnvContent(getDefaultGeminiEnv());
      } else if (tool.name === "OpenCode") {
        setConfigContent(getDefaultOpenCodeConfig());
      } else if (tool.name === "Amp CLI") {
        setConfigContent(getDefaultAmpConfig());
        setAuthContent(getDefaultAmpSecrets());
        setEnvContent(getDefaultAmpEnv());
      } else if (tool.name === "Droid CLI") {
        setConfigContent(getDefaultDroidConfig());
      } else if (tool.name === "iFlow CLI") {
        setConfigContent(getDefaultIFlowConfig());
        setEnvContent(getDefaultIFlowEnv());
      } else {
        setConfigContent(getDefaultCodexConfig());
      }
    }

    if (tool.name !== "Amp CLI" && !hasDiskAuthContent) {
      setAuthContent(getDefaultCodexAuth());
    }
  }, [
    proxyUrl,
    apiKey,
    activeProviders,
    hasDiskAuthContent,
    hasDiskConfigContent,
    tool.name,
  ]);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const result = await window.electronAPI?.cli.testConnection(
        proxyUrl,
        apiKey || undefined,
      );
      setConnectionResult(
        result || { success: false, error: t.agents.noResponse },
      );
    } catch (error) {
      setConnectionResult({ success: false, error: String(error) });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      const copied = await copyTextToClipboard(text);
      if (!copied) {
        throw new Error("copy not available");
      }
      setSaveMessage({
        type: "success",
        message: t.common.copied,
      });
      // Auto-clear success message after 2 seconds
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      log.error("[Agents] Failed to copy to clipboard:", error);
      setSaveMessage({
        type: "error",
        message: t.common.copyFailed,
      });
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      let contentToSave = configContent;
      if (tool.name === "OpenCode" || tool.name === "Droid CLI") {
        const latestProviderIds = await loadActiveProviders();
        contentToSave =
          tool.name === "OpenCode"
            ? syncOpenCodeConfigModels(configContent, latestProviderIds)
            : syncDroidConfigModels(configContent, latestProviderIds);
        setConfigContent(contentToSave);
      }

      const configResult = await window.electronAPI?.cli.readConfig(tool.name);
      const configPath = configResult?.config?.configPath;
      if (!configResult?.success || !configPath) {
        setSaveMessage({
          type: "error",
          message: t.agents.saveFailed.replace(
            "{error}",
            configResult?.error || t.agents.noPathError,
          ),
        });
        return;
      }

      const result = await window.electronAPI?.cli.writeConfig(
        configPath,
        contentToSave,
        true,
      );
      if (result?.success) {
        setHasDiskConfigContent(true);
        setSaveMessage({
          type: "success",
          message: `${t.agents.saveSuccess}\n${t.agents.savePath.replace(
            "{path}",
            configPath,
          )}${
            result.backupPath
              ? `\n${t.agents.backupFile.replace("{path}", result.backupPath)}`
              : ""
          }`,
        });
      } else {
        setSaveMessage({
          type: "error",
          message: t.agents.saveFailed.replace(
            "{error}",
            result?.error || t.agents.unknownError,
          ),
        });
      }
    } catch (error) {
      setSaveMessage({
        type: "error",
        message: t.agents.saveFailed.replace("{error}", String(error)),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAuth = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const configResult = await window.electronAPI?.cli.readConfig(tool.name);
      const authPath = configResult?.config?.authPath;
      if (!configResult?.success || !authPath) {
        setSaveMessage({
          type: "error",
          message: t.agents.saveFailed.replace(
            "{error}",
            configResult?.error || t.agents.noAuthPathError,
          ),
        });
        return;
      }

      const result = await window.electronAPI?.cli.writeConfig(
        authPath,
        authContent,
        true,
      );
      if (result?.success) {
        setHasDiskAuthContent(true);
        setSaveMessage({
          type: "success",
          message: `${t.agents.authSaveSuccess}\n${t.agents.savePath.replace(
            "{path}",
            authPath,
          )}${
            result.backupPath
              ? `\n${t.agents.backupFile.replace("{path}", result.backupPath)}`
              : ""
          }`,
        });
      } else {
        setSaveMessage({
          type: "error",
          message: t.agents.saveFailed.replace(
            "{error}",
            result?.error || t.agents.unknownError,
          ),
        });
      }
    } catch (error) {
      setSaveMessage({
        type: "error",
        message: t.agents.saveFailed.replace("{error}", String(error)),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-[0_0_15px_-3px_var(--accent-primary)]">
            <Box className="w-6 h-6 stroke-[2px]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              {tool.name} {t.agents.proxyConfig}
            </h2>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5 font-bold tracking-wider font-mono opacity-80">
              {tool.path || t.agents.pathNotFound}
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-[920px]"
      className="isolation-isolate rounded-3xl"
      bodyClassName="p-8 overflow-y-auto custom-scrollbar"
    >
      <div className="space-y-8">
        <div
          className="relative grid gap-1 p-1 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--glass-border)] shadow-inner"
          role="tablist"
          aria-label={t.agents.proxyConfig}
          style={{
            gridTemplateColumns: `repeat(${tabItems.length}, minmax(0, 1fr))`,
          }}
        >
          <div
            className="absolute top-1 bottom-1 rounded-xl bg-[var(--bg-primary)] shadow-soft-md transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{
              width: `calc(${100 / tabItems.length}% - 4px)`,
              left: tabSliderLeft,
            }}
          />
          {tabItems.map((item) => {
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={activeTab === item.id}
                aria-controls={`agent-config-tabpanel-${item.id}`}
                id={`agent-config-tab-${item.id}`}
                tabIndex={activeTab === item.id ? 0 : -1}
                className={`relative z-10 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center ${
                  activeTab === item.id
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                } motion-reduce:transition-none`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="animate-fade-in">
          {saveMessage && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 flex items-start justify-between gap-3 transition-all duration-300 animate-scale-in origin-top ${
                saveMessage.type === "success"
                  ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)] dark:border-[var(--glass-border)]"
                  : "bg-[var(--error)]/10 border-[var(--error)]/30 text-[var(--error)]"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {saveMessage.type === "success" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span className="whitespace-pre-line">
                  {saveMessage.message}
                </span>
              </div>
              <button
                onClick={() => setSaveMessage(null)}
                className="p-1 rounded-lg hover:bg-[var(--text-primary)]/10 text-[var(--text-primary)]/70"
                aria-label={t.common.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === "connection" && (
            <div
              className="space-y-6 animate-slide-fade-in"
              role="tabpanel"
              id="agent-config-tabpanel-connection"
              aria-labelledby="agent-config-tab-connection"
            >
              <div className="space-y-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] p-5">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-2 px-1">
                    {t.agents.proxyUrl}
                  </label>
                  <input
                    type="text"
                    value={proxyUrl}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    className="glass-input w-full font-mono text-sm"
                    placeholder={`http://${host || "127.0.0.1"}:${DEFAULT_PORT}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-2 px-1">
                    {t.agents.apiKey}
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="glass-input w-full font-mono text-sm"
                    placeholder={t.agents.apiKeyPlaceholder}
                  />
                </div>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className={`w-full h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  testingConnection
                    ? "border border-[var(--glass-border)] text-[var(--text-dim)] bg-[var(--bg-secondary)]/50"
                    : "glass-btn glass-btn-primary"
                }`}
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.agents.testing}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    {t.agents.testConnection}
                  </>
                )}
              </button>

              {connectionResult && (
                <div
                  className={`overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-500 animate-scale-in origin-top ${
                    connectionResult.success
                      ? "bg-[var(--success)]/8 border-[var(--glass-border)] shadow-inner dark:bg-[var(--success)]/18"
                      : "bg-[var(--error)]/10 border-[var(--error)]/30"
                  }`}
                >
                  <div className="p-4 flex items-center gap-4">
                    <div
                      className={`relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${
                        connectionResult.success
                          ? "bg-[var(--success)]/12 text-[var(--success)] border border-[var(--glass-border)] dark:bg-[var(--success)]/25 dark:border-[var(--glass-border)]"
                          : "bg-[var(--error)] text-white"
                      }`}
                    >
                      {connectionResult.success ? (
                        <>
                          <span className="absolute inset-0 rounded-xl bg-[var(--success)]/15 animate-pulse dark:bg-[var(--success)]/25" />
                          <Check className="relative w-6 h-6" />
                        </>
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4
                          className={`text-sm font-bold ${
                            connectionResult.success
                              ? "text-[var(--success)]"
                              : "text-[var(--error)]"
                          }`}
                        >
                          {connectionResult.success
                            ? t.agents.testSuccess
                            : t.agents.testFailed}
                        </h4>
                        {connectionResult.success && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--success)]/40 bg-[var(--success)]/12 text-[var(--success)] text-[10px] font-bold uppercase tracking-wide dark:bg-[var(--success)]/20 dark:border-[var(--glass-border)] dark:text-[var(--text-primary)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                            {t.status.online}
                          </span>
                        )}
                      </div>

                      {connectionResult.success && (
                        <p className="text-[11px] text-[var(--text-dim)] mb-2">
                          {t.agents.testSuccessReady}
                        </p>
                      )}

                      {connectionResult.success && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] font-medium">
                          <span className="opacity-70">{t.agents.latency}</span>
                          <span
                            className={`font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] ${
                              (connectionResult.latency || 0) < 200
                                ? "text-[var(--success)]"
                                : (connectionResult.latency || 0) < 500
                                  ? "text-[var(--warning)]"
                                  : "text-[var(--error)]"
                            }`}
                          >
                            {connectionResult.latency}
                            {t.agents.ms}
                          </span>
                        </div>
                      )}

                      {connectionResult.error && (
                        <div className="mt-2 text-[10px] font-mono bg-[var(--bg-tertiary)] p-2 rounded border border-[var(--glass-border)] text-[var(--error)] break-all shadow-inner leading-relaxed">
                          {connectionResult.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "config" && (
            <div
              className="space-y-4"
              role="tabpanel"
              id="agent-config-tabpanel-config"
              aria-labelledby="agent-config-tab-config"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-[var(--text-dim)] font-mono">
                  {tool.name === "Claude Code"
                    ? `~/.claude/${t.agents.tabSettings}`
                    : tool.name === "OpenCode"
                      ? "~/.config/opencode/opencode.json"
                      : tool.name === "Amp CLI"
                        ? `~/.config/amp/${t.agents.tabSettings}`
                        : tool.name === "Droid CLI"
                          ? `~/.factory/${t.agents.tabConfigJson}`
                          : tool.name === "iFlow CLI"
                            ? `~/.iflow/${t.agents.tabSettings}`
                            : `~/.codex/${t.agents.tabConfigToml}`}
                </span>
                <button
                  onClick={() => handleCopyToClipboard(configContent)}
                  className="glass-btn text-[10px] font-bold uppercase tracking-widest py-1 px-3 bg-[var(--text-primary)]/5 hover:bg-[var(--text-primary)]/10 flex items-center gap-1.5"
                >
                  <Copy className="w-3 h-3" />
                  {t.agents.copyContent}
                </button>
              </div>
              <div className="relative group">
                <textarea
                  value={configContent}
                  onChange={(e) => setConfigContent(e.target.value)}
                  className="glass-input w-full h-72 font-mono text-xs focus:border-[var(--accent-teal)]/50 resize-none custom-scrollbar"
                  spellCheck={false}
                />
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Box className="w-4 h-4 text-[var(--text-primary)]/10" />
                </div>
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="w-full h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed glass-btn glass-btn-primary flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.agents.saving}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t.agents.saveConfig}
                  </>
                )}
              </button>
              <p className="text-[10px] text-[var(--text-dim)] text-center font-medium">
                {t.agents.backupTip}
              </p>
            </div>
          )}

          {activeTab === "auth" && (
            <div
              className="space-y-4"
              role="tabpanel"
              id="agent-config-tabpanel-auth"
              aria-labelledby="agent-config-tab-auth"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-[var(--text-dim)] font-mono">
                  {tool.name === "Amp CLI"
                    ? `~/.local/share/amp/${t.agents.tabSecrets}`
                    : `~/.codex/${t.agents.tabAuth}`}
                </span>
                <button
                  onClick={() => handleCopyToClipboard(authContent)}
                  className="glass-btn text-[10px] font-bold uppercase tracking-widest py-1 px-3 bg-[var(--text-primary)]/5 hover:bg-[var(--text-primary)]/10 flex items-center gap-1.5"
                >
                  <Copy className="w-3 h-3" />
                  {t.agents.copyContent}
                </button>
              </div>
              <textarea
                value={authContent}
                onChange={(e) => setAuthContent(e.target.value)}
                className="glass-input w-full h-72 font-mono text-xs focus:border-[var(--accent-teal)]/50 resize-none custom-scrollbar"
                spellCheck={false}
              />
              <button
                onClick={handleSaveAuth}
                disabled={saving}
                className="w-full h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed glass-btn glass-btn-primary flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.agents.saving}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t.agents.saveAuth}
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === "env" && (
            <div
              className="space-y-5"
              role="tabpanel"
              id="agent-config-tabpanel-env"
              aria-labelledby="agent-config-tab-env"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-[var(--text-dim)] font-mono uppercase tracking-wider">
                  {t.agents.envConfigTitle}
                </span>
                <button
                  onClick={() => handleCopyToClipboard(envContent)}
                  className="glass-btn text-[10px] font-bold uppercase tracking-widest py-1 px-3 bg-[var(--text-primary)]/5 hover:bg-[var(--text-primary)]/10 flex items-center gap-1.5"
                >
                  <Copy className="w-3 h-3" />
                  {t.agents.copyCommand}
                </button>
              </div>
              <div className="relative">
                <textarea
                  value={envContent}
                  readOnly
                  className="glass-input w-full h-72 font-mono text-xs focus:border-[var(--accent-teal)]/50 resize-none custom-scrollbar leading-relaxed"
                  spellCheck={false}
                />
                <div className="absolute top-4 right-4 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" />
                </div>
              </div>
              <div className="bg-[var(--text-primary)]/5 rounded-xl p-5 border border-[var(--glass-border)] space-y-3">
                <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" />
                  {t.agents.guideTitle}
                </p>
                <ol className="text-xs text-[var(--text-primary)]/70 space-y-2.5 ml-4 list-decimal font-medium leading-relaxed">
                  <li>{t.agents.guideStep1}</li>
                  <li>{t.agents.guideStep2}</li>
                  <li>
                    {t.agents.guideStep3
                      .split("{file1}")[0]
                      .replace("{file2}", "")}
                    <code className="bg-[var(--bg-tertiary)] px-1 rounded text-[var(--accent-teal)]">
                      ~/.bashrc
                    </code>
                    {t.agents.guideOr}
                    <code className="bg-[var(--bg-tertiary)] px-1 rounded text-[var(--accent-teal)]">
                      ~/.zshrc
                    </code>
                    {t.agents.guideStep3.split("{file2}")[1]}
                  </li>
                  <li>
                    {t.agents.guideStep4.split("{command}")[0]}
                    <code className="bg-[var(--bg-tertiary)] px-1 rounded text-[var(--accent-teal)]">
                      source ~/.zshrc
                    </code>
                    {t.agents.guideStep4.split("{command}")[1]}
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function Agents() {
  const t = useTranslations();
  const [agents, setAgents] = useState<CLIToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedTool, setSelectedTool] = useState<CLIToolInfo | null>(null);
  const [lastDetectTime, setLastDetectTime] = useState<number>(0);

  useEffect(() => {
    const cachedTools = getCachedTools();
    if (cachedTools && cachedTools.length > 0) {
      setAgents(cachedTools);
      setLoading(false);
      setLastDetectTime(Date.now());
    } else {
      detectTools();
    }
  }, []);

  const detectTools = async (force = false) => {
    const now = Date.now();
    if (!force && lastDetectTime && now - lastDetectTime < 30000) {
      log.info("[Agents] Skipping detection, last scan was recent");
      return;
    }

    setScanning(true);
    try {
      const result = await window.electronAPI?.cli.detectAll();
      if (result?.success) {
        setAgents(result.tools);
        setCachedTools(result.tools);
        setLastDetectTime(now);
      }
    } catch (error) {
      log.error("Failed to detect CLI tools:", error);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "installed":
        return "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]";
      default:
        return "bg-[var(--text-dim)]";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "installed":
        return t.agents.configured;
      default:
        return t.agents.notFound;
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          {t.agents.title}
        </h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          {t.agents.subtitle}
        </p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold tracking-widest text-[var(--text-dim)]">
            {t.agents.detectedAgents}
          </h3>
          <button
            className="glass-btn glass-btn-primary text-xs py-1.5 flex items-center gap-2 group active:scale-95 transition-all"
            onClick={() => detectTools(true)}
            disabled={scanning}
          >
            {scanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                {t.agents.scanning}
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                {t.agents.scanSystem}
              </>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
            <p className="text-sm font-medium tracking-wide opacity-70">
              {t.agents.detecting}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className={`flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] backdrop-blur-sm ${
                  agent.status === "installed"
                    ? "bg-[var(--accent-primary)]/5"
                    : "bg-[var(--bg-secondary)]/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`status-dot ${getStatusColor(agent.status)}`}
                  />
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      {agent.name}
                    </div>
                    <div className="text-xs terminal-text text-[var(--text-dim)]">
                      {agent.path ||
                        `${t.agents.commandPrefix}${agent.command}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {agent.version && (
                    <span
                      className="text-xs terminal-text text-[var(--text-muted)] max-w-[180px] truncate"
                      title={agent.version}
                    >
                      {agent.version}
                    </span>
                  )}
                  {agent.status === "installed" ? (
                    <button
                      className="glass-btn glass-btn-primary text-xs py-1 px-4 flex items-center gap-1.5 group active:scale-95 transition-all flex-shrink-0"
                      onClick={() => setSelectedTool(agent)}
                    >
                      <Box className="w-3 h-3 group-hover:scale-110 transition-transform" />
                      {t.agents.configure}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--text-dim)]">
                      {getStatusText(agent.status)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTool && (
        <ConfigModal
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </div>
  );
}
