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
  name?: string;
  "api-key": string;
  "base-url"?: string;
  "proxy-url"?: string;
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  prefix?: string;
  headers?: Record<string, string>;
  models?: OpenAICompatibilityModel[];
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
  models?: OpenAICompatibilityModel[];
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
  models?: OpenAICompatibilityModel[];
}

export interface AmpcodeUpstreamApiKeysEntry {
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
  "upstream-api-keys"?: AmpcodeUpstreamApiKeysEntry[];
  "restrict-management-to-localhost"?: boolean;
  "force-model-mappings"?: boolean;
  "model-mappings"?: AmpcodeModelMappingEntry[];
}

export interface OpenAICompatibilityProvider {
  name: string;
  "base-url": string;
  prefix?: string;
  "api-key-entries": OpenAICompatibilityApiKeyEntry[];
  "system-access-token"?: string;
  "new-api-user"?: string;
  "enable-usage-query"?: boolean;
  headers?: Record<string, string>;
  models?: OpenAICompatibilityModel[];
}

export type OAuthExcludedModelsConfig = Record<string, string[]>;
export type OAuthAccountExcludedModelsConfig = Record<
  string,
  Record<string, string[]>
>;
export type OAuthModelAliasConfig = Record<
  string,
  Array<{ name: string; alias: string; fork?: boolean }>
>;

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
  "oauth-excluded-models"?: OAuthExcludedModelsConfig;
  "oauth-account-excluded-models"?: OAuthAccountExcludedModelsConfig;
  "oauth-model-alias"?: OAuthModelAliasConfig;
  "request-retry"?: number;
  "max-retry-interval"?: number;
  "openai-compatibility"?: OpenAICompatibilityProvider[];
  "claude-api-key"?: ClaudeApiKeyEntry[];
  "gemini-api-key"?: GeminiApiKeyEntry[];
  "codex-api-key"?: CodexApiKeyEntry[];
  ampcode?: AmpcodeProvider | null;
  "incognito-browser"?: boolean;
  "request-log"?: boolean;
}

function getDefaultConfig(authDir: string, secret: string): string {
  const config = {
    host: "",
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

function extractQuotedAuthDir(content: string): string | null {
  const match = content.match(/^auth-dir:\s*"([^"]*)"(?:\s+#.*)?$/m);
  return match ? match[1] : null;
}

function hasOddBackslashRun(value: string): boolean {
  let runLength = 0;

  for (const char of value) {
    if (char === "\\") {
      runLength += 1;
      continue;
    }

    if (runLength > 0) {
      if (runLength % 2 !== 0) {
        return true;
      }
      runLength = 0;
    }
  }

  return runLength > 0 && runLength % 2 !== 0;
}

function shouldMigrateLegacyWindowsAuthDir(
  content: string,
  authDir: unknown,
): authDir is string {
  if (typeof authDir !== "string") {
    return false;
  }

  if (!/^[A-Za-z]:[\\/]/.test(authDir)) {
    return false;
  }

  const rawQuotedAuthDir = extractQuotedAuthDir(content);
  if (!rawQuotedAuthDir) {
    return false;
  }

  return hasOddBackslashRun(rawQuotedAuthDir);
}

class ProxyManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private port: number = DEFAULT_PORT;
  private host: string = "";
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastKnownRunning: boolean = false;

  getConfigDir(): string {
    return path.join(app.getPath("userData"), "cli-proxy");
  }

  getAuthDir(): string {
    return path.join(this.getConfigDir(), "auth");
  }

  getDisabledAuthDir(): string {
    return path.join(this.getConfigDir(), "auth-disabled");
  }

  getConfigPath(): string {
    return path.join(this.getConfigDir(), "config.yaml");
  }

  ensureConfig(): void {
    const configDir = this.getConfigDir();
    const authDir = this.getAuthDir();
    const disabledAuthDir = this.getDisabledAuthDir();
    const configPath = this.getConfigPath();

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    if (!fs.existsSync(disabledAuthDir)) {
      fs.mkdirSync(disabledAuthDir, { recursive: true });
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
      const content = fs.readFileSync(configPath, "utf-8");
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

    const configuredAuthDir = parsedConfig["auth-dir"];
    const hasValidAuthDir =
      typeof configuredAuthDir === "string" &&
      configuredAuthDir.trim().length > 0;
    const shouldMigrateAuthDir = shouldMigrateLegacyWindowsAuthDir(
      content,
      configuredAuthDir,
    );

    if (shouldMigrateAuthDir) {
      updates["auth-dir"] = configuredAuthDir;
    } else if (!hasValidAuthDir) {
      updates["auth-dir"] = this.getAuthDir();
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
        if (shouldMigrateAuthDir || !hasValidAuthDir) {
          addedKeys.push("auth-dir");
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
    const managedBinaryPath = this.getManagedBinaryPath();
    if (fs.existsSync(managedBinaryPath)) {
      return managedBinaryPath;
    }

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

  getManagedBinaryPath(): string {
    const binaryName =
      process.platform === "win32" ? "cliproxy.exe" : "cliproxy";
    return path.join(
      this.getConfigDir(),
      "bin",
      `${process.platform}-${process.arch}`,
      binaryName,
    );
  }

  private checkPortAvailable(port: number, host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once("error", (err: NodeJS.ErrnoException) => {
        server.close();
        if (err.code === "EADDRINUSE") {
          reject(
            Object.assign(new Error("portInUse"), { code: "portInUse", port }),
          );
        } else if (err.code === "EACCES") {
          reject(
            Object.assign(new Error("permissionDenied"), {
              code: "permissionDenied",
              port,
            }),
          );
        } else {
          reject(
            Object.assign(new Error("startFailed"), {
              code: "startFailed",
              port,
            }),
          );
        }
      });
      server.once("listening", () => {
        server.close(() => resolve());
      });
      server.listen(port, host || "127.0.0.1");
    });
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
    if (config?.host !== undefined && config.host !== this.host) {
      log.info(
        `[ProxyManager] Syncing host from config: "${this.host}" -> "${config.host}"`,
      );
      this.host = config.host;
    }

    const binaryPath = this.getBinaryPath();
    const configPath = this.getConfigPath();
    const configDir = this.getConfigDir();

    try {
      fs.mkdirSync(path.join(configDir, "logs"), { recursive: true });
    } catch (error) {
      log.warn("[ProxyManager] Failed to prepare config log directory:", error);
    }

    log.info("[ProxyManager] Checking port availability:", this.port);
    try {
      await this.checkPortAvailable(this.port, this.host);
    } catch (portError) {
      const code = (portError as { code?: string }).code ?? "startFailed";
      log.error("[ProxyManager] Port check failed:", code, "port:", this.port);
      throw Object.assign(new Error(code), { code, port: this.port });
    }

    log.info("[ProxyManager] Starting proxy with config:", configPath);

    return new Promise((resolve, reject) => {
      const proc = spawn(binaryPath, ["--config", configPath], {
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
        cwd: configDir,
      });

      const stderrChunks: string[] = [];
      let settled = false;

      const settle = (success: boolean, errorMessage?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(stabilityTimer);

        if (success) {
          proc.removeListener("exit", onEarlyExit);
          proc.on("exit", (code) => {
            log.info(`Proxy exited with code ${code}`);
            this.process = null;
            this.stopHealthCheck();
            this.emit("statusChange", false);
          });
          this.process = proc;
          this.emit("statusChange", true);
          this.startHealthCheck();
          resolve();
        } else {
          this.process = null;
          this.stopHealthCheck();
          this.emit("proxyError", errorMessage!);
          this.emit("statusChange", false);
          reject(new Error(errorMessage));
        }
      };

      proc.stdout?.on("data", (data) => {
        const text = data.toString();
        log.info(`[Proxy] ${text}`);
        this.emit("log", { type: "stdout", data: text });
        if (text.includes("API server started successfully")) {
          settle(true);
        }
      });

      proc.stderr?.on("data", (data) => {
        const text = data.toString();
        log.error(`[Proxy Error] ${text}`);
        stderrChunks.push(text);
        this.emit("log", { type: "stderr", data: text });
      });

      const onEarlyExit = (code: number | null) => {
        const stderr = stderrChunks.join("");
        const errorMessage = this.classifyStartError(stderr, code);
        log.error("[ProxyManager] Process exited early:", errorMessage);
        settle(false, errorMessage);
      };

      proc.once("error", (err) => {
        const errorMessage =
          err.message.includes("ENOENT") || err.message.includes("spawn")
            ? "Binary not found. Please download the proxy binary first."
            : err.message;
        settle(false, errorMessage);
      });

      proc.once("exit", onEarlyExit);

      const stabilityTimer = setTimeout(() => {
        if (!settled) {
          settle(true);
        }
      }, 3000);
    });
  }

  private classifyStartError(stderr: string, code: number | null): string {
    const lower = stderr.toLowerCase();
    if (
      lower.includes("address already in use") ||
      lower.includes("bind: address") ||
      lower.includes("eaddrinuse")
    ) {
      return "portInUse";
    }
    if (lower.includes("permission denied") || lower.includes("eacces")) {
      return "permissionDenied";
    }
    if (lower.includes("no such file") || lower.includes("enoent")) {
      return "binaryNotFound";
    }
    if (code === 0) {
      return "portInUse";
    }
    return "startFailed";
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

  getHost(): string {
    return this.host;
  }

  setHost(host: string): void {
    this.host = host;
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

      socket.connect(this.port, this.host || "127.0.0.1");
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
        host: existingConfig.host ?? "",
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

    if (typeof config.host === "string") {
      this.setHost(config.host);
      store.set("host", config.host);
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

    if (updates.host !== undefined) {
      this.setHost(updates.host);
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
