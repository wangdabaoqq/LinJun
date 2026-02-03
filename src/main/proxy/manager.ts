import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import net from "net";
import crypto from "crypto";
import { app } from "electron";
import { EventEmitter } from "events";
import yaml from "js-yaml";

import log from "../utils/logger";
import { store } from "../utils/store";
import { DEFAULT_PORT } from "../../shared/constants";

function generateSecret(): string {
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex").toUpperCase();
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}

function isBcryptHash(value?: string): boolean {
  return Boolean(
    value && (value.startsWith("$2a$") || value.startsWith("$2b$")),
  );
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }
  return String(error);
}

export interface OpenAICompatibilityApiKeyEntry {
  "api-key": string;
  "proxy-url"?: string;
}

export interface OpenAICompatibilityModel {
  name: string;
  alias?: string;
}

export interface ClaudeApiKeyEntry {
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  models?: OpenAICompatibilityModel[];
}

export interface GeminiApiKeyEntry {
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  headers?: Record<string, string>;
  models?: OpenAICompatibilityModel[];
}

export interface CodexApiKeyEntry {
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  prefix?: string;
  models?: OpenAICompatibilityModel[];
}

export interface OpenAICompatibilityProvider {
  name: string;
  "base-url": string;
  prefix?: string;
  "api-key-entries": OpenAICompatibilityApiKeyEntry[];
  models?: OpenAICompatibilityModel[];
}

export interface ProxyConfig {
  host: string;
  port: number;
  "auth-dir": string;
  "proxy-url"?: string;
  "api-keys"?: string[];
  "remote-management"?: {
    "allow-remote": boolean;
    "secret-key": string;
    "panel-github-repository"?: string;
  };
  debug?: boolean;
  "logging-to-file"?: boolean;
  "usage-statistics-enabled"?: boolean;
  routing?: {
    strategy: string;
  };
  "quota-exceeded"?: {
    "switch-project"?: boolean;
    "switch-preview-model"?: boolean;
  };
  "request-retry"?: number;
  "max-retry-interval"?: number;
  "openai-compatibility"?: OpenAICompatibilityProvider[];
  "claude-api-key"?: ClaudeApiKeyEntry[];
  "gemini-api-key"?: GeminiApiKeyEntry[];
  "codex-api-key"?: CodexApiKeyEntry[];
  "incognito-browser"?: boolean;
  "request-log"?: boolean;
}

function getDefaultConfig(authDir: string, secret: string): string {
  const config = {
    host: "127.0.0.1",
    port: DEFAULT_PORT,
    "auth-dir": authDir,
    "api-keys": [],
    debug: false,
    "remote-management": {
      "allow-remote": false,
      "secret-key": secret,
    },
    "incognito-browser": true,
    "logging-to-file": true,
    "request-log": true,
    "usage-statistics-enabled": true,
  };
  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: true,
  });
  return `# CLIProxyAPIPlus Configuration (managed by linjun)\n${yamlContent}`;
}

class ProxyManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private port: number = DEFAULT_PORT;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastKnownRunning: boolean = false;

  getConfigDir(): string {
    return path.join(app.getPath("userData"), "cli-proxy");
  }

  getAuthDir(): string {
    return path.join(this.getConfigDir(), "auth");
  }

  getConfigPath(): string {
    return path.join(this.getConfigDir(), "config.yaml");
  }

  ensureConfig(): void {
    const configDir = this.getConfigDir();
    const authDir = this.getAuthDir();
    const configPath = this.getConfigPath();

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const existingSecret = store.get("managementSecret");
    let secret = "";
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf-8");
        const config = yaml.load(content) as Partial<ProxyConfig>;
        const configSecret = config?.["remote-management"]?.["secret-key"];
        if (configSecret && !isBcryptHash(configSecret)) {
          secret = configSecret;
        }
      } catch (error) {
        log.warn(
          "[ProxyManager] Failed to read config secret:",
          formatError(error),
        );
      }
    }
    if (!secret) {
      secret =
        existingSecret && !isBcryptHash(existingSecret)
          ? existingSecret
          : generateSecret();
    }
    if (secret && secret !== existingSecret) {
      store.set("managementSecret", secret);
    }

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, getDefaultConfig(authDir, secret), "utf-8");
      log.info("[ProxyManager] Created default config at:", configPath);
      log.info("[ProxyManager] Auth directory:", authDir);
    } else {
      this.migrateConfig(configPath, secret);
    }
  }

  private migrateConfig(configPath: string, secret: string): void {
    try {
      let content = fs.readFileSync(configPath, "utf-8");
      const missing: string[] = [];

      if (!content.includes("logging-to-file")) {
        missing.push("logging-to-file: true");
      }

      if (!content.includes("request-log")) {
        missing.push("request-log: true");
      }

      if (!content.includes("usage-statistics-enabled")) {
        missing.push("usage-statistics-enabled: true");
      }

      let parsedConfig: Partial<ProxyConfig> | null = null;
      try {
        parsedConfig = yaml.load(content) as Partial<ProxyConfig>;
      } catch (error) {
        log.warn(
          "[ProxyManager] Failed to parse config for migration:",
          formatError(error),
        );
      }

      this.migrateConfigYaml({
        content,
        missing,
        parsedConfig,
        secret,
        configPath,
      });
    } catch (error) {
      log.error("[ProxyManager] Config migration failed:", formatError(error));
    }
  }

  private migrateConfigYaml({
    content,
    missing,
    parsedConfig,
    secret,
    configPath,
  }: {
    content: string;
    missing: string[];
    parsedConfig: Partial<ProxyConfig> | null;
    secret: string;
    configPath: string;
  }): void {
    const updates: Partial<ProxyConfig> = {};

    if (!parsedConfig || typeof parsedConfig !== "object") {
      if (missing.length > 0) {
        const updatedContent =
          content.trimEnd() + "\n" + missing.join("\n") + "\n";
        fs.writeFileSync(configPath, updatedContent, "utf-8");
        log.info("[ProxyManager] Migrated config: added", missing.join(", "));
      }
      return;
    }

    if (parsedConfig["logging-to-file"] === undefined) {
      updates["logging-to-file"] = true;
    }

    if (parsedConfig["request-log"] === undefined) {
      updates["request-log"] = true;
    }

    if (parsedConfig["usage-statistics-enabled"] === undefined) {
      updates["usage-statistics-enabled"] = true;
    }

    const remoteManagement: {
      "allow-remote"?: boolean;
      "secret-key"?: string;
      "panel-github-repository"?: string;
    } = parsedConfig["remote-management"] || {};
    const hasSecret =
      Boolean(remoteManagement["secret-key"]) &&
      !isBcryptHash(remoteManagement["secret-key"]);
    const hasAllowRemote = remoteManagement["allow-remote"] !== undefined;

    if (!hasSecret || !hasAllowRemote) {
      updates["remote-management"] = {
        ...remoteManagement,
        "allow-remote": remoteManagement["allow-remote"] ?? false,
        "secret-key": hasSecret ? remoteManagement["secret-key"] : secret,
      } as ProxyConfig["remote-management"];
    }

    if (Object.keys(updates).length > 0) {
      const success = this.updateConfigYaml(updates);
      if (success) {
        const addedKeys = [...missing];
        if (!hasSecret) {
          addedKeys.push("remote-management.secret-key");
        }
        if (!hasAllowRemote) {
          addedKeys.push("remote-management.allow-remote");
        }
        if (addedKeys.length > 0) {
          log.info(
            "[ProxyManager] Migrated config: added",
            addedKeys.join(", "),
          );
        }
      }
    }
  }

  getBinaryPath(): string {
    const platform = process.platform;
    const arch = process.arch;
    const binaryName = platform === "win32" ? "cliproxy.exe" : "cliproxy";

    if (app.isPackaged) {
      return path.join(
        process.resourcesPath,
        "binaries",
        `${platform}-${arch}`,
        binaryName,
      );
    }

    return path.join(
      app.getAppPath(),
      "resources/binaries",
      `${platform}-${arch}`,
      binaryName,
    );
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error("Proxy already running");
    }

    this.ensureConfig();

    const config = this.loadConfigFromYaml();
    if (config?.port && config.port !== this.port) {
      log.info(
        `[ProxyManager] Syncing port from config: ${this.port} -> ${config.port}`,
      );
      this.port = config.port;
    }

    const binaryPath = this.getBinaryPath();
    const configPath = this.getConfigPath();

    log.info("[ProxyManager] Starting proxy with config:", configPath);

    this.process = spawn(binaryPath, ["--config", configPath], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    this.process.stdout?.on("data", (data) => {
      log.info(`[Proxy] ${data}`);
      this.emit("log", { type: "stdout", data: data.toString() });
    });

    this.process.stderr?.on("data", (data) => {
      log.error(`[Proxy Error] ${data}`);
      this.emit("log", { type: "stderr", data: data.toString() });
    });

    this.process.on("exit", (code) => {
      log.info(`Proxy exited with code ${code}`);
      this.process = null;
      this.stopHealthCheck();
      this.emit("statusChange", false);
    });

    this.emit("statusChange", true);
    this.startHealthCheck();
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      const process = this.process!;
      const timeout = setTimeout(() => {
        log.warn(
          "[ProxyManager] Process did not exit gracefully, force killing",
        );
        process.kill("SIGKILL");
      }, 3000);

      process.once("exit", () => {
        clearTimeout(timeout);
        this.process = null;
        this.stopHealthCheck();
        this.emit("statusChange", false);
        log.info("[ProxyManager] Process stopped successfully");
        resolve();
      });

      this.stopHealthCheck();
      process.kill("SIGTERM");
    });
  }

  isRunning(): boolean {
    return this.process !== null;
  }

  getPort(): number {
    return this.port;
  }

  setPort(port: number): void {
    if (this.isRunning()) {
      throw new Error("Cannot change port while proxy is running");
    }
    this.port = port;
  }

  /**
   * Perform health check by verifying TCP connectivity
   */
  private async checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 3000;

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.setTimeout(timeout);

      socket.once("connect", () => {
        cleanup();
        resolve(true);
      });

      socket.once("timeout", () => {
        cleanup();
        resolve(false);
      });

      socket.once("error", () => {
        cleanup();
        resolve(false);
      });

      socket.connect(this.port, "127.0.0.1");
    });
  }

  /**
   * Start health check polling
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.lastKnownRunning = true;

    // Check immediately
    this.checkHealth()
      .then((healthy) => {
        if (!healthy && this.process) {
          log.info(
            "[ProxyManager] Health check failed immediately after start",
          );
        }
      })
      .catch((error) => {
        log.error(
          "[ProxyManager] Initial health check failed:",
          formatError(error),
        );
      });

    // Then check every 3 seconds
    this.healthCheckInterval = setInterval(async () => {
      if (!this.process) {
        this.lastKnownRunning = false;
        return;
      }

      const healthy = await this.checkHealth();
      const currentlyRunning = this.process !== null;

      if (currentlyRunning && !healthy && this.lastKnownRunning) {
        // Process reference exists but not responding - external kill detected
        log.info(
          "[ProxyManager] Health check failed - process was externally killed",
        );
        this.process = null;
        this.emit("statusChange", false);
        this.lastKnownRunning = false;
        this.stopHealthCheck();
      } else if (healthy && !this.lastKnownRunning) {
        // Recovered or started
        this.lastKnownRunning = true;
      }
    }, 3000);
  }

  /**
   * Stop health check polling
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.lastKnownRunning = false;
  }

  /**
   * Load and parse config.yaml, returning the parsed config object.
   * Creates default config if it doesn't exist.
   * Attempts auto-repair if YAML parsing fails (e.g., Windows path escaping issues).
   */
  loadConfigFromYaml(): ProxyConfig | null {
    this.ensureConfig();
    const configPath = this.getConfigPath();

    try {
      const content = fs.readFileSync(configPath, "utf-8");
      const config = yaml.load(content) as ProxyConfig;
      log.info("[ProxyManager] Loaded config from:", configPath);
      return config;
    } catch (error) {
      log.warn(
        "[ProxyManager] Failed to parse config, attempting repair:",
        formatError(error),
      );
      return this.attemptConfigRepair(configPath);
    }
  }

  /**
   * Attempt to repair a corrupted config.yaml file.
   * Specifically handles Windows path escaping issues with auth-dir.
   */
  private attemptConfigRepair(configPath: string): ProxyConfig | null {
    try {
      const rawContent = fs.readFileSync(configPath, "utf-8");

      // Extract auth-dir value from raw content using regex
      const authDirMatch = rawContent.match(/^auth-dir:\s*(.+)$/m);
      let extractedAuthDir = authDirMatch ? authDirMatch[1].trim() : null;
      if (extractedAuthDir) {
        // Remove inline comments
        const commentIndex = extractedAuthDir.indexOf(" #");
        if (commentIndex > -1) {
          extractedAuthDir = extractedAuthDir.slice(0, commentIndex).trim();
        }
        // Strip surrounding quotes if present
        if (
          (extractedAuthDir.startsWith('"') &&
            extractedAuthDir.endsWith('"')) ||
          (extractedAuthDir.startsWith("'") && extractedAuthDir.endsWith("'"))
        ) {
          extractedAuthDir = extractedAuthDir.slice(1, -1);
        }
      }

      // Try to parse partial config to preserve other keys
      let existingConfig: Partial<ProxyConfig> = {};
      try {
        // Remove auth-dir line to avoid Windows path parsing issues
        const contentWithoutAuthDir = rawContent.replace(/^auth-dir:.*$/m, "");
        existingConfig = yaml.load(
          contentWithoutAuthDir,
        ) as Partial<ProxyConfig>;
      } catch {
        // Parsing failed completely, we'll use defaults
        log.warn(
          "[ProxyManager] Could not parse any config values, using defaults",
        );
      }

      // Build repaired config with defaults and extracted values
      const repairedConfig: ProxyConfig = {
        host: existingConfig.host ?? "127.0.0.1",
        port: existingConfig.port ?? DEFAULT_PORT,
        "auth-dir": extractedAuthDir ?? this.getAuthDir(),
        "api-keys": existingConfig["api-keys"] ?? [],
        debug: existingConfig.debug ?? false,
        "incognito-browser": existingConfig["incognito-browser"] ?? true,
        "logging-to-file": existingConfig["logging-to-file"] ?? true,
        "request-log": existingConfig["request-log"] ?? true,
        "usage-statistics-enabled":
          existingConfig["usage-statistics-enabled"] ?? true,
      };

      // Write repaired config using yaml.dump with same options as updateConfigYaml
      const yamlContent = yaml.dump(repairedConfig, {
        indent: 2,
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: true,
      });
      fs.writeFileSync(configPath, yamlContent, "utf-8");
      log.info("[ProxyManager] Repaired and rewrote config at:", configPath);

      // Retry loading the repaired config
      const repairedContent = fs.readFileSync(configPath, "utf-8");
      const config = yaml.load(repairedContent) as ProxyConfig;
      log.info("[ProxyManager] Successfully loaded repaired config");
      return config;
    } catch (repairError) {
      log.error(
        "[ProxyManager] Config repair failed:",
        formatError(repairError),
      );
      return null;
    }
  }

  syncConfigToStore(store: {
    set: (key: string, value: unknown) => void;
    get: (key: string) => unknown;
  }): boolean {
    const config = this.loadConfigFromYaml();
    if (!config) {
      return false;
    }

    if (typeof config.port === "number") {
      this.setPort(config.port);
      store.set("port", config.port);
    }

    if (config.routing?.strategy) {
      const strategy = config.routing.strategy;
      if (strategy === "round-robin" || strategy === "fill-first") {
        store.set("routingStrategy", strategy);
      }
    }

    // DO NOT sync managementSecret from YAML to store
    // The YAML may contain bcrypt-encrypted value, but we keep plaintext in store
    // Only sync if store doesn't have a value yet
    const existingSecret = store.get("managementSecret");
    if (!existingSecret && config["remote-management"]?.["secret-key"]) {
      const yamlSecret = config["remote-management"]["secret-key"];
      // Only set if it doesn't look like a bcrypt hash (bcrypt starts with $2a$ or $2b$)
      if (!yamlSecret.startsWith("$2a$") && !yamlSecret.startsWith("$2b$")) {
        store.set("managementSecret", yamlSecret);
      }
    }

    log.info("[ProxyManager] Synced config to store, port:", this.port);
    return true;
  }

  updateConfigYaml(updates: Partial<ProxyConfig>): boolean {
    const configPath = this.getConfigPath();
    if (!fs.existsSync(configPath)) {
      log.info("[ProxyManager] No config file exists, returning false");
      return false;
    }

    let config: ProxyConfig | null = null;
    try {
      const content = fs.readFileSync(configPath, "utf-8");
      config = yaml.load(content) as ProxyConfig;
    } catch (error) {
      log.error(
        "[ProxyManager] Failed to parse config for update:",
        formatError(error),
      );
      return false;
    }

    if (!config) {
      log.info("[ProxyManager] No config loaded, returning false");
      return false;
    }

    const updatedConfig = {
      ...config,
      ...updates,
      "remote-management": {
        ...(config["remote-management"] || {}),
        ...((updates["remote-management"] as Record<string, unknown>) || {}),
      },
    };

    if (updates.port !== undefined && !this.isRunning()) {
      this.setPort(updates.port);
    }

    try {
      const configPath = this.getConfigPath();
      const yamlContent = yaml.dump(updatedConfig, {
        indent: 2,
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: true,
      });
      fs.writeFileSync(configPath, yamlContent, "utf-8");
      log.info("[ProxyManager] Updated config.yaml with:", updates);
      return true;
    } catch (error) {
      log.error("[ProxyManager] Failed to write config:", formatError(error));
      return false;
    }
  }

  async runCliLogin(
    provider: string,
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      this.ensureConfig();
      const binaryPath = this.getBinaryPath();
      const configPath = this.getConfigPath();

      log.info("[CLI Login] Binary path:", binaryPath);
      log.info("[CLI Login] Config path:", configPath);
      log.info("[CLI Login] Config path exists:", fs.existsSync(configPath));

      const providerParts = provider.split(" ");
      const providerName = providerParts[0];
      const extraArgs = providerParts.slice(1);

      const cliCommand = `"${binaryPath}" --config "${configPath}" --${providerName}-login ${extraArgs.join(" ")}`;
      log.info("[CLI Login] Full command:", cliCommand);

      const platform = process.platform;

      if (platform === "darwin") {
        const appleScript = `tell application "Terminal"
          activate
          do script "${cliCommand.replace(/"/g, '\\"')}"
        end tell`;

        const terminalProcess = spawn("osascript", ["-e", appleScript], {
          stdio: ["ignore", "pipe", "pipe"],
          detached: true,
        });

        terminalProcess.on("exit", (code) => {
          if (code === 0) {
            resolve({
              success: true,
              output: "Terminal opened for authentication",
            });
          } else {
            resolve({
              success: false,
              error: `Failed to open terminal: exit code ${code}`,
            });
          }
        });

        terminalProcess.on("error", (err) => {
          resolve({ success: false, error: err.message });
        });
      } else if (platform === "win32") {
        const terminalProcess = spawn(
          "cmd.exe",
          ["/c", "start", "cmd.exe", "/k", cliCommand],
          {
            stdio: ["ignore", "pipe", "pipe"],
            detached: true,
            shell: true,
          },
        );

        terminalProcess.on("exit", () => {
          resolve({
            success: true,
            output: "Terminal opened for authentication",
          });
        });

        terminalProcess.on("error", (err) => {
          resolve({ success: false, error: err.message });
        });
      } else {
        const terminalProcess = spawn(
          "x-terminal-emulator",
          ["-e", cliCommand],
          {
            stdio: ["ignore", "pipe", "pipe"],
            detached: true,
          },
        );

        terminalProcess.on("exit", () => {
          resolve({
            success: true,
            output: "Terminal opened for authentication",
          });
        });

        terminalProcess.on("error", (err) => {
          resolve({ success: false, error: err.message });
        });
      }
    });
  }
}

export const proxyManager = new ProxyManager();
