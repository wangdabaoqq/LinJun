import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { app } from "electron";
import { EventEmitter } from "events";
import yaml from "js-yaml";

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
}

function getDefaultConfig(authDir: string): string {
  return `# CLIProxyAPIPlus Configuration (managed by linjun)
host: "127.0.0.1"
port: 8317
auth-dir: "${authDir}"
api-keys: []
debug: false
incognito-browser: true
`;
}

class ProxyManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private port: number = 8317;

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

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, getDefaultConfig(authDir), "utf-8");
      console.log("[ProxyManager] Created default config at:", configPath);
      console.log("[ProxyManager] Auth directory:", authDir);
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
    const binaryPath = this.getBinaryPath();
    const configPath = this.getConfigPath();

    console.log("[ProxyManager] Starting proxy with config:", configPath);

    this.process = spawn(binaryPath, ["--config", configPath], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    this.process.stdout?.on("data", (data) => {
      console.log(`[Proxy] ${data}`);
      this.emit("log", { type: "stdout", data: data.toString() });
    });

    this.process.stderr?.on("data", (data) => {
      console.error(`[Proxy Error] ${data}`);
      this.emit("log", { type: "stderr", data: data.toString() });
    });

    this.process.on("exit", (code) => {
      console.log(`Proxy exited with code ${code}`);
      this.process = null;
      this.emit("statusChange", false);
    });

    this.emit("statusChange", true);
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
      this.emit("statusChange", false);
    }
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
   * Load and parse config.yaml, returning the parsed config object.
   * Creates default config if it doesn't exist.
   */
  loadConfigFromYaml(): ProxyConfig | null {
    this.ensureConfig();
    const configPath = this.getConfigPath();

    try {
      const content = fs.readFileSync(configPath, "utf-8");
      const config = yaml.load(content) as ProxyConfig;
      console.log("[ProxyManager] Loaded config from:", configPath);
      return config;
    } catch (error) {
      console.error("[ProxyManager] Failed to load config:", error);
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

    console.log("[ProxyManager] Synced config to store, port:", this.port);
    return true;
  }

  updateConfigYaml(updates: Partial<ProxyConfig>): boolean {
    const config = this.loadConfigFromYaml();
    if (!config) {
      console.log("[ProxyManager] No config loaded, returning false");
      return false;
    }

    console.log(
      "[ProxyManager] Original config remote-management:",
      JSON.stringify(config["remote-management"], null, 2),
    );
    console.log(
      "[ProxyManager] Updates remote-management:",
      JSON.stringify(updates["remote-management"], null, 2),
    );

    const updatedConfig = {
      ...config,
      ...updates,
      "remote-management": {
        ...(config["remote-management"] || {}),
        ...((updates["remote-management"] as Record<string, unknown>) || {}),
      },
    };

    console.log(
      "[ProxyManager] Final remote-management:",
      JSON.stringify(updatedConfig["remote-management"], null, 2),
    );

    if (updates.port !== undefined && !this.isRunning()) {
      this.setPort(updates.port);
    }

    try {
      const configPath = this.getConfigPath();
      const yamlContent = yaml.dump(updatedConfig, {
        indent: 2,
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: false,
      });
      fs.writeFileSync(configPath, yamlContent, "utf-8");
      console.log("[ProxyManager] Updated config.yaml with:", updates);
      return true;
    } catch (error) {
      console.error("[ProxyManager] Failed to write config:", error);
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

      console.log("[CLI Login] Binary path:", binaryPath);
      console.log("[CLI Login] Config path:", configPath);
      console.log("[CLI Login] Config path exists:", fs.existsSync(configPath));

      const providerParts = provider.split(" ");
      const providerName = providerParts[0];
      const extraArgs = providerParts.slice(1);

      const cliCommand = `"${binaryPath}" --config "${configPath}" --${providerName}-login ${extraArgs.join(" ")}`;
      console.log("[CLI Login] Full command:", cliCommand);

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
