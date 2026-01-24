import { useState, useEffect } from "react";
import { useTranslations, useSettingsStore } from "../../stores/settings";

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
    console.error("Failed to read cache:", error);
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
    console.error("Failed to write cache:", error);
  }
}

function ConfigModal({ tool, onClose }: ConfigModalProps) {
  const t = useTranslations();
  const port = useSettingsStore((s) => s.port);
  const [saving, setSaving] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(`http://127.0.0.1:${port}`);
  const [apiKey, setApiKey] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    error?: string;
    latency?: number;
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
        console.error("Failed to load API key:", error);
      }
    };
    loadApiKey();
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
    const port = proxyUrl.split(":").pop() || "8317";
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
    return JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        model: "opencode/minimax-m2.1",
        provider: {
          quotio: {
            models: {
              "gemini-claude-opus-4-5-thinking": {
                limit: {
                  context: 200000,
                  output: 64000,
                },
                name: "Gemini Claude Opus 4 5 Thinking",
                options: {
                  thinking: {
                    budgetTokens: 10000,
                    type: "enabled",
                  },
                },
                reasoning: true,
              },
              "gemini-claude-sonnet-4-5": {
                limit: {
                  context: 200000,
                  output: 64000,
                },
                name: "Gemini Claude Sonnet 4 5",
              },
              "gpt-5.2-codex": {
                limit: {
                  context: 400000,
                  output: 32768,
                },
                name: "Gpt 5.2 Codex",
                options: {
                  reasoning: {
                    effort: "medium",
                  },
                },
                reasoning: true,
              },
            },
            name: "Quotio",
            npm: "@ai-sdk/anthropic",
            options: {
              apiKey: apiKey || "your-api-key",
              baseURL: `${proxyUrl}/v1`,
            },
          },
        },
      },
      null,
      2,
    );
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
  }, [proxyUrl, apiKey]);

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
    try {
      const homeDir =
        process.platform === "win32"
          ? process.env.USERPROFILE
          : process.env.HOME;

      const configPath =
        tool.name === "Claude Code"
          ? `${homeDir}/.claude/settings.json`
          : tool.name === "OpenCode"
            ? `${homeDir}/.opencode/config.json`
            : `${homeDir}/.codex/config.toml`;

      const result = await window.electronAPI?.cli.writeConfig(
        configPath,
        configContent,
        true,
      );
      if (result?.success) {
        alert(
          `配置已保存${result.backupPath ? `\n备份文件: ${result.backupPath}` : ""}`,
        );
      } else {
        alert(`保存失败: ${result?.error}`);
      }
    } catch (error) {
      alert(`保存失败: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAuth = async () => {
    setSaving(true);
    try {
      const homeDir =
        process.platform === "win32"
          ? process.env.USERPROFILE
          : process.env.HOME;
      const authPath = `${homeDir}/.codex/auth.json`;

      const result = await window.electronAPI?.cli.writeConfig(
        authPath,
        authContent,
        true,
      );
      if (result?.success) {
        alert(
          `认证文件已保存${result.backupPath ? `\n备份文件: ${result.backupPath}` : ""}`,
        );
      } else {
        alert(`保存失败: ${result?.error}`);
      }
    } catch (error) {
      alert(`保存失败: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-fade-in"
        style={{ WebkitBackdropFilter: "blur(24px)" }}
        onClick={onClose}
      />
      <div className="relative glass-card glass-card-teal p-6 w-full max-w-[800px] max-h-[80vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {tool.name} 配置
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {tool.path || "未找到安装路径"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-soft hover:bg-muted text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-subtle">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "connection"
                ? "text-[var(--accent-teal)] border-b-2 border-[var(--accent-teal)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
            onClick={() => setActiveTab("connection")}
          >
            连接信息
          </button>
          {hasConfigFiles && (
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "config"
                  ? "text-[var(--accent-teal)] border-b-2 border-[var(--accent-teal)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "auth"
                  ? "text-[var(--accent-teal)] border-b-2 border-[var(--accent-teal)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("auth")}
            >
              auth.json
            </button>
          )}
          {hasEnvConfig && (
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "env"
                  ? "text-[var(--accent-teal)] border-b-2 border-[var(--accent-teal)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("env")}
            >
              环境变量
            </button>
          )}
        </div>

        {activeTab === "connection" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                代理服务器 URL
              </label>
              <input
                type="text"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                className="glass-input w-full"
                placeholder="http://127.0.0.1:8317"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                API 密钥 (可选)
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="glass-input w-full"
                placeholder="输入 API 密钥"
              />
            </div>

            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 font-medium group ${
                testingConnection
                  ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed border border-transparent"
                  : "glass-btn glass-btn-teal shadow-lg hover:shadow-teal-500/20 active:scale-[0.99]"
              }`}
            >
              {testingConnection ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-[var(--text-muted)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>正在连接...</span>
                </>
              ) : (
                <>
                  <span className="text-lg transition-transform group-hover:scale-110 duration-300">
                    ⚡
                  </span>
                  <span>测试连接</span>
                </>
              )}
            </button>

            {connectionResult && (
              <div
                className={`mt-4 overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-500 animate-scale-in origin-top ${
                  connectionResult.success
                    ? "bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]/30 shadow-[0_4px_20px_-10px_rgba(var(--accent-teal-rgb),0.3)]"
                    : "bg-[var(--accent-magenta)]/10 border-[var(--accent-magenta)]/30 shadow-[0_4px_20px_-10px_rgba(var(--accent-magenta-rgb),0.3)]"
                }`}
              >
                <div className="p-4 flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${
                      connectionResult.success
                        ? "bg-[var(--accent-teal)]/20 text-[var(--accent-teal)]"
                        : "bg-[var(--accent-magenta)]/20 text-[var(--accent-magenta)]"
                    }`}
                  >
                    {connectionResult.success ? (
                      <svg
                        className="w-5 h-5 animate-[scale-in_0.3s_ease-out_0.1s_both]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 animate-[scale-in_0.3s_ease-out_0.1s_both]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-semibold mb-1 flex items-center gap-2 ${
                        connectionResult.success
                          ? "text-[var(--accent-teal)]"
                          : "text-[var(--accent-magenta)]"
                      }`}
                    >
                      {connectionResult.success ? "连接成功" : "连接失败"}
                    </h4>

                    {connectionResult.success && (
                      <div className="flex items-center gap-2 text-sm text-[var(--accent-teal)]/80">
                        <span>响应时间:</span>
                        <span
                          className={`font-mono font-bold ${
                            (connectionResult.latency || 0) < 200
                              ? "text-[var(--accent-teal)]"
                              : (connectionResult.latency || 0) < 500
                                ? "text-[var(--accent-yellow)]"
                                : "text-[var(--accent-orange)]"
                          }`}
                        >
                          {connectionResult.latency}ms
                        </span>
                      </div>
                    )}

                    {connectionResult.error && (
                      <div className="mt-3 text-xs font-mono bg-[var(--accent-magenta)]/10 p-3 rounded-lg border border-[var(--accent-magenta)]/20 text-[var(--accent-magenta)] break-all shadow-inner">
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)]">
                {tool.name === "Claude Code"
                  ? "~/.claude/settings.json"
                  : tool.name === "OpenCode"
                    ? "~/.opencode/config.json"
                    : "~/.codex/config.toml"}
              </span>
              <button
                onClick={() => handleCopyToClipboard(configContent)}
                className="glass-btn text-xs py-1 px-3"
              >
                复制
              </button>
            </div>
            <textarea
              value={configContent}
              onChange={(e) => setConfigContent(e.target.value)}
              className="glass-input w-full h-64 font-mono text-xs"
              spellCheck={false}
            />
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="glass-btn glass-btn-teal w-full py-2 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存配置"}
            </button>
            <p className="text-xs text-[var(--text-muted)] text-center">
              保存时会自动备份现有配置文件
            </p>
          </div>
        )}

        {activeTab === "auth" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)]">
                ~/.codex/auth.json
              </span>
              <button
                onClick={() => handleCopyToClipboard(authContent)}
                className="glass-btn text-xs py-1 px-3"
              >
                复制
              </button>
            </div>
            <textarea
              value={authContent}
              onChange={(e) => setAuthContent(e.target.value)}
              className="glass-input w-full h-64 font-mono text-xs"
              spellCheck={false}
            />
            <button
              onClick={handleSaveAuth}
              disabled={saving}
              className="glass-btn glass-btn-teal w-full py-2 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存配置"}
            </button>
            <p className="text-xs text-[var(--text-muted)] text-center">
              保存时会自动备份现有配置文件
            </p>
          </div>
        )}

        {activeTab === "env" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)]">
                环境变量配置 (bash/zsh)
              </span>
              <button
                onClick={() => handleCopyToClipboard(envContent)}
                className="glass-btn text-xs py-1 px-3"
              >
                复制
              </button>
            </div>
            <textarea
              value={envContent}
              readOnly
              className="glass-input w-full h-64 font-mono text-xs bg-[var(--bg-secondary)]"
              spellCheck={false}
            />
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-muted)]">💡 使用方法：</p>
              <ol className="text-xs text-[var(--text-muted)] space-y-1 ml-4 list-decimal">
                <li>复制上面的环境变量配置</li>
                <li>粘贴到终端执行（临时生效）</li>
                <li>或添加到 ~/.bashrc 或 ~/.zshrc（永久生效）</li>
                <li>执行 source ~/.bashrc 或 source ~/.zshrc 重新加载</li>
              </ol>
            </div>
          </div>
        )}
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
      console.log("[Agents] Skipping detection, last scan was recent");
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
      console.error("Failed to detect CLI tools:", error);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "installed":
        return "status-dot-online";
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
    <div className="space-y-6">
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
            className="glass-btn glass-btn-teal text-xs py-1.5"
            onClick={() => detectTools(true)}
            disabled={scanning}
          >
            {scanning ? (
              <>
                <span className="animate-spin inline-block mr-1">◌</span>
                扫描中...
              </>
            ) : (
              t.agents.scanSystem
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <span className="animate-spin inline-block">◌</span> 检测中...
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className={`flex items-center justify-between p-4 rounded-xl border backdrop-blur-sm ${
                  agent.status === "installed"
                    ? "bg-[var(--accent-teal)]/5 border-[var(--accent-teal)]/20"
                    : "bg-soft border-subtle"
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
                      className="glass-btn glass-btn-teal text-xs py-1 px-3"
                      onClick={() => setSelectedTool(agent)}
                    >
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
