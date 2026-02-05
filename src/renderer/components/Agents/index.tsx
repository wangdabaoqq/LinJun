import { useState, useEffect } from "react";
import log from "@renderer/utils/logger";
import { useTranslations, useSettingsStore } from "../../stores/settings";
import { X, Zap, Box, Globe, RefreshCw, Loader2 } from "lucide-react";
import { DEFAULT_PORT } from "../../../shared/constants";

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
  },
  kiro: {
    "kiro-claude-haiku-4-5": {
      limit: { context: 200000, output: 64000 },
      name: "Kiro Claude Haiku 4 5",
    },
    "kiro-claude-haiku-4-5-agentic": {
      limit: { context: 200000, output: 64000 },
      name: "Kiro Claude Haiku 4 5 Agentic",
    },
    "kiro-claude-opus-4-5": {
      limit: { context: 200000, output: 64000 },
      name: "Kiro Claude Opus 4 5",
    },
    "kiro-claude-opus-4-5-agentic": {
      limit: { context: 200000, output: 64000 },
      name: "Kiro Claude Opus 4 5 Agentic",
    },
    "kiro-claude-sonnet-4": {
      limit: { context: 200000, output: 64000 },
      name: "Kiro Claude Sonnet 4",
    },
    "kiro-claude-sonnet-4-5": {
      limit: { context: 200000, output: 64000 },
      name: "Kiro Claude Sonnet 4 5",
    },
    "kiro-claude-sonnet-4-5-agentic": {
      limit: { context: 200000, output: 64000 },
      name: "Kiro Claude Sonnet 4 5 Agentic",
    },
    "kiro-claude-sonnet-4-agentic": {
      limit: { context: 200000, output: 64000 },
      name: "Kiro Claude Sonnet 4 Agentic",
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
  const [saving, setSaving] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(`http://127.0.0.1:${port}`);
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
  const [activeTab, setActiveTab] = useState<
    "connection" | "config" | "auth" | "env"
  >("connection");

  const hasConfigFiles =
    tool.name === "Codex CLI" ||
    tool.name === "Claude Code" ||
    tool.name === "OpenCode";
  const hasAuthFile = tool.name === "Codex CLI";
  const hasEnvConfig =
    tool.name === "Claude Code" || tool.name === "Gemini CLI";

  // 监听端口变化，自动更新 proxyUrl
  useEffect(() => {
    setProxyUrl(`http://127.0.0.1:${port}`);
  }, [port]);

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

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const result = await window.electronAPI?.providers.getAccounts();
        if (result?.success && result.accounts) {
          const providerIds = [
            ...new Set(
              result.accounts.map((acc: { provider: string }) => acc.provider),
            ),
          ] as string[];
          setActiveProviders(providerIds);
        }
      } catch (error) {
        log.error("Failed to load providers:", error);
      }
    };
    loadProviders();
  }, []);

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
    return `# CLIProxyAPI Configuration for Codex CLI
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
    return `# CLIProxyAPI Configuration for Claude Code
export ANTHROPIC_BASE_URL="${proxyUrl}"
export ANTHROPIC_AUTH_TOKEN="${apiKey}"
export ANTHROPIC_DEFAULT_OPUS_MODEL="gemini-claude-opus-4-5-thinking"
export ANTHROPIC_DEFAULT_SONNET_MODEL="gemini-claude-sonnet-4-5"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="gemini-3-flash-preview"`;
  };

  const getDefaultGeminiEnv = () => {
    return `# CLIProxyAPI Configuration for Gemini CLI
export CODE_ASSIST_ENDPOINT="${proxyUrl}"
export GEMINI_MODEL="gemini-3-pro-preview"`;
  };

  const getDefaultOpenCodeConfig = () => {
    const models: ProviderModels = {};
    for (const providerId of activeProviders) {
      const providerModels = PROVIDER_MODEL_MAP[providerId];
      if (providerModels) {
        Object.assign(models, providerModels);
      }
    }

    const config: Record<string, unknown> = {
      $schema: "https://opencode.ai/config.json",
      provider: {
        linjun: {
          ...(Object.keys(models).length > 0 && { models }),
          name: "LinJun Proxy",
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

  const [configContent, setConfigContent] = useState(
    tool.name === "Claude Code"
      ? getDefaultClaudeConfig()
      : tool.name === "OpenCode"
        ? getDefaultOpenCodeConfig()
        : getDefaultCodexConfig(),
  );
  const [authContent, setAuthContent] = useState(getDefaultCodexAuth());
  const [envContent, setEnvContent] = useState(
    tool.name === "Claude Code" ? getDefaultClaudeEnv() : getDefaultGeminiEnv(),
  );

  useEffect(() => {
    if (tool.name === "Claude Code") {
      setConfigContent(getDefaultClaudeConfig());
      setEnvContent(getDefaultClaudeEnv());
    } else if (tool.name === "Gemini CLI") {
      setEnvContent(getDefaultGeminiEnv());
    } else if (tool.name === "OpenCode") {
      setConfigContent(getDefaultOpenCodeConfig());
    } else {
      setConfigContent(getDefaultCodexConfig());
    }
    setAuthContent(getDefaultCodexAuth());
  }, [proxyUrl, apiKey, activeProviders]);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const result = await window.electronAPI?.cli.testConnection(
        proxyUrl,
        apiKey || undefined,
      );
      setConnectionResult(result || { success: false, error: "No response" });
    } catch (error) {
      setConnectionResult({ success: false, error: String(error) });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const configResult = await window.electronAPI?.cli.readConfig(tool.name);
      const configPath = configResult?.config?.configPath;
      if (!configResult?.success || !configPath) {
        setSaveMessage({
          type: "error",
          message: `保存失败: ${configResult?.error || "无法获取配置路径"}`,
        });
        return;
      }

      const result = await window.electronAPI?.cli.writeConfig(
        configPath,
        configContent,
        true,
      );
      if (result?.success) {
        setSaveMessage({
          type: "success",
          message: `配置已保存\n保存路径: ${configPath}${
            result.backupPath ? `\n备份文件: ${result.backupPath}` : ""
          }`,
        });
      } else {
        setSaveMessage({
          type: "error",
          message: `保存失败: ${result?.error}`,
        });
      }
    } catch (error) {
      setSaveMessage({ type: "error", message: `保存失败: ${String(error)}` });
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
          message: `保存失败: ${configResult?.error || "无法获取认证路径"}`,
        });
        return;
      }

      const result = await window.electronAPI?.cli.writeConfig(
        authPath,
        authContent,
        true,
      );
      if (result?.success) {
        setSaveMessage({
          type: "success",
          message: `认证文件已保存\n保存路径: ${authPath}${
            result.backupPath ? `\n备份文件: ${result.backupPath}` : ""
          }`,
        });
      } else {
        setSaveMessage({
          type: "error",
          message: `保存失败: ${result?.error}`,
        });
      }
    } catch (error) {
      setSaveMessage({ type: "error", message: `保存失败: ${String(error)}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      />
      <div className="relative w-full max-w-[800px] max-h-[85vh] flex flex-col overflow-hidden animate-scale-in shadow-[0_0_60px_-15px_rgba(0,0,0,0.3)] border border-[var(--glass-border)] rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] z-0" />
        <div className="absolute inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-2xl z-0" />

        <div className="relative z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/30">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              {tool.name} {t.agents.proxyConfig || "配置"}
            </h2>
            <p className="text-xs text-[var(--text-primary)]/70 mt-1 font-mono">
              {tool.path || "未找到安装路径"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="flex gap-2 p-1 bg-[var(--bg-deep)] rounded-xl border border-white/5">
            <button
              className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeTab === "connection"
                  ? "bg-white/10 text-[var(--accent-teal)] shadow-sm"
                  : "text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] hover:bg-white/5"
              }`}
              onClick={() => setActiveTab("connection")}
            >
              连接信息
            </button>
            {hasConfigFiles && (
              <button
                className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === "config"
                    ? "bg-white/10 text-[var(--accent-teal)] shadow-sm"
                    : "text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] hover:bg-white/5"
                }`}
                onClick={() => setActiveTab("config")}
              >
                {tool.name === "Claude Code"
                  ? "settings.json"
                  : tool.name === "OpenCode"
                    ? "config.json"
                    : "config.toml"}
              </button>
            )}
            {hasAuthFile && (
              <button
                className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === "auth"
                    ? "bg-white/10 text-[var(--accent-teal)] shadow-sm"
                    : "text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] hover:bg-white/5"
                }`}
                onClick={() => setActiveTab("auth")}
              >
                auth.json
              </button>
            )}
            {hasEnvConfig && (
              <button
                className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === "env"
                    ? "bg-white/10 text-[var(--accent-teal)] shadow-sm"
                    : "text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] hover:bg-white/5"
                }`}
                onClick={() => setActiveTab("env")}
              >
                环境变量
              </button>
            )}
          </div>

          <div className="animate-fade-in">
            {saveMessage && (
              <div
                className={`mb-4 rounded-2xl border px-4 py-3 flex items-start justify-between gap-3 transition-all duration-300 animate-scale-in origin-top ${
                  saveMessage.type === "success"
                    ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                <div className="whitespace-pre-line text-sm font-medium">
                  {saveMessage.message}
                </div>
                <button
                  onClick={() => setSaveMessage(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-primary)]/70"
                  aria-label="Close message"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {activeTab === "connection" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)]/70 uppercase tracking-widest mb-2 px-1">
                    代理服务器 URL
                  </label>
                  <input
                    type="text"
                    value={proxyUrl}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    className="glass-input w-full bg-[var(--bg-deep)] border-white/10 text-[var(--text-primary)] font-mono"
                    placeholder={`http://127.0.0.1:${DEFAULT_PORT}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)]/70 uppercase tracking-widest mb-2 px-1">
                    API 密钥 (可选)
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="glass-input w-full bg-[var(--bg-deep)] border-white/10 text-[var(--text-primary)] font-mono"
                    placeholder="输入 API 密钥"
                  />
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 font-bold shadow-lg active:scale-95 group ${
                    testingConnection
                      ? "bg-white/10 text-[var(--text-primary)]/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-blue-500/20"
                  }`}
                >
                  {testingConnection ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>正在测试...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-white/20 group-hover:scale-125 group-hover:rotate-12 transition-transform" />
                      <span>测试连接</span>
                    </>
                  )}
                </button>

                {connectionResult && (
                  <div
                    className={`overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-500 animate-scale-in origin-top ${
                      connectionResult.success
                        ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 shadow-[0_0_20px_-5px_rgba(var(--accent-primary-rgb),0.3)]"
                        : "bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    <div className="p-5 flex items-start gap-4">
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                          connectionResult.success
                            ? "bg-[var(--accent-primary)] text-white shadow-blue-500/20"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {connectionResult.success ? (
                          <Zap className="w-6 h-6" />
                        ) : (
                          <X className="w-6 h-6" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-lg font-bold mb-1 ${
                            connectionResult.success
                              ? "text-[var(--accent-primary)]"
                              : "text-red-500"
                          }`}
                        >
                          {connectionResult.success ? "连接成功" : "连接失败"}
                        </h4>

                        {connectionResult.success && (
                          <div className="flex items-center gap-2 text-sm text-[var(--text-primary)] font-medium">
                            <span className="opacity-70">响应时间:</span>
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded-lg bg-black/20 ${
                                (connectionResult.latency || 0) < 200
                                  ? "text-[var(--success)]"
                                  : (connectionResult.latency || 0) < 500
                                    ? "text-[var(--warning)]"
                                    : "text-[var(--error)]"
                              }`}
                            >
                              {connectionResult.latency}ms
                            </span>
                          </div>
                        )}

                        {connectionResult.error && (
                          <div className="mt-3 text-xs font-mono bg-black/40 p-3 rounded-xl border border-white/5 text-red-400 break-all shadow-inner leading-relaxed">
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
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]/50 font-mono">
                    {tool.name === "Claude Code"
                      ? "~/.claude/settings.json"
                      : tool.name === "OpenCode"
                        ? "~/.config/opencode/opencode.json"
                        : "~/.codex/config.toml"}
                  </span>
                  <button
                    onClick={() => handleCopyToClipboard(configContent)}
                    className="glass-btn text-[10px] font-bold uppercase tracking-widest py-1 px-3 bg-white/5 hover:bg-white/10"
                  >
                    复制内容
                  </button>
                </div>
                <div className="relative group">
                  <textarea
                    value={configContent}
                    onChange={(e) => setConfigContent(e.target.value)}
                    className="glass-input w-full h-72 font-mono text-xs bg-[var(--bg-deep)] border-white/10 text-[var(--text-primary)] focus:border-[var(--accent-teal)]/50 resize-none custom-scrollbar"
                    spellCheck={false}
                  />
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Box className="w-4 h-4 text-white/10" />
                  </div>
                </div>
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存配置文件"}
                </button>
                <p className="text-[10px] text-[var(--text-primary)]/40 text-center font-medium">
                  💡 保存时会自动备份现有配置文件
                </p>
              </div>
            )}

            {activeTab === "auth" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]/50 font-mono">
                    ~/.codex/auth.json
                  </span>
                  <button
                    onClick={() => handleCopyToClipboard(authContent)}
                    className="glass-btn text-[10px] font-bold uppercase tracking-widest py-1 px-3 bg-white/5 hover:bg-white/10"
                  >
                    复制内容
                  </button>
                </div>
                <textarea
                  value={authContent}
                  onChange={(e) => setAuthContent(e.target.value)}
                  className="glass-input w-full h-72 font-mono text-xs bg-[var(--bg-deep)] border-white/10 text-[var(--text-primary)] focus:border-[var(--accent-teal)]/50 resize-none custom-scrollbar"
                  spellCheck={false}
                />
                <button
                  onClick={handleSaveAuth}
                  disabled={saving}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存认证文件"}
                </button>
              </div>
            )}

            {activeTab === "env" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]/50 font-mono uppercase tracking-wider">
                    ENV CONFIG (bash/zsh)
                  </span>
                  <button
                    onClick={() => handleCopyToClipboard(envContent)}
                    className="glass-btn text-[10px] font-bold uppercase tracking-widest py-1 px-3 bg-white/5 hover:bg-white/10"
                  >
                    复制命令
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    value={envContent}
                    readOnly
                    className="glass-input w-full h-72 font-mono text-xs bg-[var(--bg-deep)] border-white/10 text-[var(--text-primary)] resize-none custom-scrollbar leading-relaxed"
                    spellCheck={false}
                  />
                  <div className="absolute top-4 right-4 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" />
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-5 border border-white/5 space-y-3">
                  <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    使用指南
                  </p>
                  <ol className="text-xs text-[var(--text-primary)]/70 space-y-2.5 ml-4 list-decimal font-medium leading-relaxed">
                    <li>复制上面的环境变量配置</li>
                    <li>粘贴到终端执行（立即在该终端窗口生效）</li>
                    <li>
                      或将其添加到{" "}
                      <code className="bg-black/30 px-1 rounded text-[var(--accent-teal)]">
                        ~/.bashrc
                      </code>{" "}
                      或{" "}
                      <code className="bg-black/30 px-1 rounded text-[var(--accent-teal)]">
                        ~/.zshrc
                      </code>{" "}
                      中（全局永久生效）
                    </li>
                    <li>
                      执行{" "}
                      <code className="bg-black/30 px-1 rounded text-[var(--accent-teal)]">
                        source ~/.zshrc
                      </code>{" "}
                      使其立即生效
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
        return t.agents.configured || "已安装";
      default:
        return t.agents.notFound || "未找到";
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
                扫描中...
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
              检测中...
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
                      {agent.path || `命令: ${agent.command}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {agent.version && (
                    <span className="text-xs terminal-text text-[var(--text-muted)]">
                      {agent.version}
                    </span>
                  )}
                  {agent.status === "installed" ? (
                    <button
                      className="glass-btn glass-btn-primary text-xs py-1 px-4 flex items-center gap-1.5 group active:scale-95 transition-all"
                      onClick={() => setSelectedTool(agent)}
                    >
                      <Box className="w-3 h-3 group-hover:scale-110 transition-transform" />
                      配置
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
