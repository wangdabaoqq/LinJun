import { app, ipcMain, shell } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { proxyManager } from "../proxy/manager";
import { managementAPI, Provider } from "../proxy/api";
import { store } from "../utils/store";
import { checkForUpdates } from "../update/checker";
import { readRecentRequestLogs, deleteAllLogs } from "../logging";
import {
  detectAllCLITools,
  detectCLITool,
  readCLIConfig,
  writeConfig,
  testProxyConnection,
} from "../utils/cliDetector";
import {
  getProviders,
  getQuotaByProvider,
  refreshQuota,
  ProviderType,
  scanTokenFiles,
  isKiroTokenValid,
  refreshKiroTokenManually,
} from "../quota";

export function setupIpcHandlers(): void {
  ipcMain.handle("proxy:start", async () => {
    try {
      await proxyManager.start();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("proxy:stop", async () => {
    try {
      await proxyManager.stop();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("proxy:status", () => {
    return {
      running: proxyManager.isRunning(),
      port: proxyManager.getPort(),
    };
  });

  ipcMain.handle("logs:request", (_event, limit: number = 30) => {
    try {
      return readRecentRequestLogs(limit);
    } catch (error) {
      console.error("[IPC] Failed to read request logs:", error);
      return [];
    }
  });

  ipcMain.handle("logs:deleteAll", () => {
    try {
      return deleteAllLogs();
    } catch (error) {
      console.error("[IPC] Failed to delete logs:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("api:getAccounts", async () => {
    try {
      return await managementAPI.getAccounts();
    } catch (error) {
      console.error("[IPC] Failed to get accounts:", error);
      return [];
    }
  });

  ipcMain.handle("api:getQuota", async () => {
    try {
      return await managementAPI.getQuota();
    } catch (error) {
      console.error("[IPC] Failed to get quota:", error);
      return [];
    }
  });

  ipcMain.handle("api:startAuth", async (_event, provider: Provider) => {
    try {
      const { authUrl } = await managementAPI.startAuth(provider);
      await shell.openExternal(authUrl);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("api:cliLogin", async (_event, provider: string) => {
    try {
      return await proxyManager.runCliLogin(provider);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(
    "api:removeAccount",
    async (_event, provider: Provider, accountId: string) => {
      try {
        await managementAPI.removeAccount(provider, accountId);
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(
    "api:validateApiKey",
    async (_event, provider: Provider, apiKey: string) => {
      try {
        return await managementAPI.validateApiKey(provider, apiKey);
      } catch (error) {
        return { valid: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("api:getLogs", async (_event, limit: number) => {
    try {
      return await managementAPI.getLogs(limit);
    } catch (error) {
      console.error("[IPC] Failed to get logs:", error);
      return [];
    }
  });

  ipcMain.handle("api:getStats", async () => {
    try {
      return await managementAPI.getStats();
    } catch (error) {
      console.error("[IPC] Failed to get stats:", error);
      return {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        totalTokens: 0,
        avgLatency: 0,
        uptime: 0,
      };
    }
  });

  ipcMain.handle("api:getHealth", async () => {
    try {
      return await managementAPI.getHealth();
    } catch (error) {
      console.error("[IPC] Failed to get health:", error);
      return { healthy: false, checks: {} };
    }
  });

  ipcMain.handle("settings:get", (_event, key: string) => {
    return store.get(key);
  });

  ipcMain.handle("settings:set", (_event, key: string, value: unknown) => {
    store.set(key, value);
    return { success: true };
  });

  ipcMain.handle("settings:getAll", () => {
    const storeData = store.store;
    const config = proxyManager.loadConfigFromYaml();

    return {
      ...storeData,
      port: config?.port ?? storeData.port,
      routingStrategy: config?.routing?.strategy ?? storeData.routingStrategy,
      requestRetry: config?.["request-retry"] ?? storeData.requestRetry ?? 3,
      maxRetryInterval:
        config?.["max-retry-interval"] ?? storeData.maxRetryInterval ?? 30,
      loggingToFile:
        config?.["logging-to-file"] ?? storeData.loggingToFile ?? false,
      proxyRunning: proxyManager.isRunning(),
    };
  });

  ipcMain.handle(
    "settings:syncToYaml",
    (
      _event,
      updates: {
        port?: number;
        apiKey?: string;
        routingStrategy?: "round-robin" | "fill-first";
        requestRetry?: number;
        maxRetryInterval?: number;
        loggingToFile?: boolean;
        managementSecret?: string;
      },
    ) => {
      try {
        const yamlUpdates: Record<string, unknown> = {};

        if (updates.port !== undefined) {
          yamlUpdates.port = updates.port;
          store.set("port", updates.port);
        }

        if (updates.apiKey !== undefined) {
          yamlUpdates["api-keys"] = [updates.apiKey];
          store.set("managementSecret", updates.apiKey);
        }

        if (updates.routingStrategy !== undefined) {
          yamlUpdates.routing = { strategy: updates.routingStrategy };
          store.set("routingStrategy", updates.routingStrategy);
        }

        if (updates.requestRetry !== undefined) {
          yamlUpdates["request-retry"] = updates.requestRetry;
          store.set("requestRetry", updates.requestRetry);
        }

        if (updates.maxRetryInterval !== undefined) {
          yamlUpdates["max-retry-interval"] = updates.maxRetryInterval;
          store.set("maxRetryInterval", updates.maxRetryInterval);
        }

        if (updates.loggingToFile !== undefined) {
          yamlUpdates["logging-to-file"] = updates.loggingToFile;
          store.set("loggingToFile", updates.loggingToFile);
        }

        if (updates.managementSecret !== undefined) {
          const currentRemoteMgmt =
            proxyManager.loadConfigFromYaml()?.["remote-management"] || {};
          yamlUpdates["remote-management"] = {
            ...currentRemoteMgmt,
            "secret-key": updates.managementSecret,
          };
          console.log(
            "[IPC] Setting managementSecret, yamlUpdates:",
            JSON.stringify(yamlUpdates, null, 2),
          );
          store.set("managementSecret", updates.managementSecret);
        }

        console.log(
          "[IPC] Calling updateConfigYaml with:",
          JSON.stringify(yamlUpdates, null, 2),
        );
        const success = proxyManager.updateConfigYaml(yamlUpdates);
        console.log("[IPC] updateConfigYaml result:", success);
        return { success };
      } catch (error) {
        console.error("[IPC] Failed to sync settings to YAML:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });

  ipcMain.handle("app:checkForUpdates", async () => {
    return await checkForUpdates();
  });

  ipcMain.handle("app:openExternal", async (_event, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // API Keys Management - CRUD operations for config.yaml api-keys field
  // ═══════════════════════════════════════════════════════════════════════════════

  ipcMain.handle("apiKeys:getAll", () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const apiKeys = config?.["api-keys"] || [];
      return { success: true, keys: apiKeys };
    } catch (error) {
      console.error("[IPC] Failed to get API keys:", error);
      return { success: false, keys: [], error: String(error) };
    }
  });

  ipcMain.handle("apiKeys:add", (_event, key: string) => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      if (!config) {
        return { success: false, error: "Failed to load config" };
      }

      const currentKeys = config["api-keys"] || [];
      if (currentKeys.includes(key)) {
        return { success: false, error: "Key already exists" };
      }

      const newKeys = [...currentKeys, key];
      const success = proxyManager.updateConfigYaml({ "api-keys": newKeys });
      return { success, keys: newKeys };
    } catch (error) {
      console.error("[IPC] Failed to add API key:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("apiKeys:update", (_event, oldKey: string, newKey: string) => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      if (!config) {
        return { success: false, error: "Failed to load config" };
      }

      const currentKeys = config["api-keys"] || [];
      const index = currentKeys.indexOf(oldKey);
      if (index === -1) {
        return { success: false, error: "Key not found" };
      }

      if (oldKey !== newKey && currentKeys.includes(newKey)) {
        return { success: false, error: "New key already exists" };
      }

      const newKeys = [...currentKeys];
      newKeys[index] = newKey;
      const success = proxyManager.updateConfigYaml({ "api-keys": newKeys });
      return { success, keys: newKeys };
    } catch (error) {
      console.error("[IPC] Failed to update API key:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("apiKeys:delete", (_event, key: string) => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      if (!config) {
        return { success: false, error: "Failed to load config" };
      }

      const currentKeys = config["api-keys"] || [];
      const newKeys = currentKeys.filter((k: string) => k !== key);

      if (newKeys.length === currentKeys.length) {
        return { success: false, error: "Key not found" };
      }

      const success = proxyManager.updateConfigYaml({ "api-keys": newKeys });
      return { success, keys: newKeys };
    } catch (error) {
      console.error("[IPC] Failed to delete API key:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("cli:detectAll", async () => {
    try {
      const tools = await detectAllCLITools();
      return { success: true, tools };
    } catch (error) {
      console.error("[IPC] Failed to detect CLI tools:", error);
      return { success: false, tools: [], error: String(error) };
    }
  });

  ipcMain.handle(
    "cli:detect",
    async (_event, toolName: string, command: string) => {
      try {
        const tool = await detectCLITool(toolName, command);
        return { success: true, tool };
      } catch (error) {
        console.error("[IPC] Failed to detect CLI tool:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("cli:readConfig", async (_event, toolName: string) => {
    try {
      const config = await readCLIConfig(toolName);
      return { success: true, config };
    } catch (error) {
      console.error("[IPC] Failed to read CLI config:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(
    "cli:writeConfig",
    async (
      _event,
      filePath: string,
      content: string,
      backup: boolean = true,
    ) => {
      try {
        const result = writeConfig(filePath, content, backup);
        return result;
      } catch (error) {
        console.error("[IPC] Failed to write CLI config:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(
    "cli:testConnection",
    async (_event, url: string, apiKey?: string) => {
      try {
        const result = await testProxyConnection(url, apiKey);
        return result;
      } catch (error) {
        console.error("[IPC] Failed to test connection:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("quota:getProviders", async () => {
    try {
      return { success: true, providers: await getProviders() };
    } catch (error) {
      console.error("[IPC] Failed to get providers:", error);
      return { success: false, providers: [], error: String(error) };
    }
  });

  ipcMain.handle(
    "quota:getByProvider",
    async (_event, provider: ProviderType) => {
      try {
        const accounts = await getQuotaByProvider(provider);
        return { success: true, accounts };
      } catch (error) {
        console.error("[IPC] Failed to get quota by provider:", error);
        return { success: false, accounts: [], error: String(error) };
      }
    },
  );

  ipcMain.handle("quota:refresh", async (_event, accountId: string) => {
    try {
      const account = await refreshQuota(accountId);
      return { success: true, account };
    } catch (error) {
      console.error("[IPC] Failed to refresh quota:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("quota:refreshAll", async () => {
    try {
      const providers = await getProviders();
      const allAccounts = [];
      for (const provider of providers) {
        const accounts = await getQuotaByProvider(provider.id);
        allAccounts.push(...accounts);
      }
      return { success: true, accounts: allAccounts };
    } catch (error) {
      console.error("[IPC] Failed to refresh all quotas:", error);
      return { success: false, accounts: [], error: String(error) };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Provider Accounts Management - Token-based account listing
  // ═══════════════════════════════════════════════════════════════════════════════

  ipcMain.handle("providers:getAccounts", async () => {
    try {
      const tokens = scanTokenFiles();
      const accounts = [];

      for (const token of tokens) {
        if (token.provider === "kiro") {
          const isValid = await isKiroTokenValid(token);
          if (!isValid) {
            console.log(
              `[IPC] Skipping expired Kiro account: ${token.filePath}`,
            );
            continue;
          }
        }

        accounts.push({
          id: `${token.provider}-${token.email}`,
          provider: token.provider,
          email: token.email,
          status: "online" as const,
          lastUsed: token.raw.last_refresh || token.expired,
          filePath: token.filePath,
        });
      }

      return { success: true, accounts };
    } catch (error) {
      console.error("[IPC] Failed to get provider accounts:", error);
      return { success: false, accounts: [], error: String(error) };
    }
  });

  ipcMain.handle(
    "providers:removeAccount",
    async (_event, filePath: string) => {
      try {
        const fs = await import("fs");
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          return { success: true };
        }
        return { success: false, error: "Token file not found" };
      } catch (error) {
        console.error("[IPC] Failed to remove account:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // Qwen OAuth - API-based authentication (avoids interactive terminal input)
  // ═══════════════════════════════════════════════════════════════════════════════

  ipcMain.handle("qwen:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getQwenAuthUrl();
      if (result.status === "ok" && result.url) {
        await shell.openExternal(result.url);
      }
      return result;
    } catch (error) {
      console.error("[IPC] Failed to get Qwen auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("antigravity:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getAntigravityAuthUrl();
      if (result.status === "ok" && result.url) {
        await shell.openExternal(result.url);
      }
      return result;
    } catch (error) {
      console.error("[IPC] Failed to get Antigravity auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("claude:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getClaudeAuthUrl();
      if (result.status === "ok" && result.url) {
        await shell.openExternal(result.url);
      }
      return result;
    } catch (error) {
      console.error("[IPC] Failed to get Claude auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("gemini:getAuthUrl", async (_event, projectId?: string) => {
    try {
      const result = await managementAPI.getGeminiAuthUrl(projectId);
      if (result.status === "ok" && result.url) {
        await shell.openExternal(result.url);
      }
      return result;
    } catch (error) {
      console.error("[IPC] Failed to get Gemini auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("codex:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getCodexAuthUrl();
      if (result.status === "ok" && result.url) {
        await shell.openExternal(result.url);
      }
      return result;
    } catch (error) {
      console.error("[IPC] Failed to get Codex auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("copilot:getAuthUrl", async () => {
    try {
      return await managementAPI.getCopilotAuthUrl();
    } catch (error) {
      console.error("[IPC] Failed to get Copilot auth URL:", error);
      return {
        status: "error",
        url: "",
        state: "",
        user_code: "",
        verification_uri: "",
      };
    }
  });

  ipcMain.handle("qwen:getAuthStatus", async (_event, state: string) => {
    try {
      return await managementAPI.getQwenAuthStatus(state);
    } catch (error) {
      console.error("[IPC] Failed to get Qwen auth status:", error);
      return { status: "error" };
    }
  });

  ipcMain.handle("kiro:import", async () => {
    try {
      const homeDir = app.getPath("home");
      const ssoDir = path.join(homeDir, ".aws", "sso", "cache");
      const authDir = proxyManager.getAuthDir();

      if (!fs.existsSync(ssoDir)) {
        return { success: false, error: "AWS SSO cache directory not found" };
      }

      const kiroFile = path.join(ssoDir, "kiro-auth-token.json");
      if (!fs.existsSync(kiroFile)) {
        return {
          success: false,
          error: "Kiro auth token not found. Please login to Kiro IDE first.",
        };
      }

      const randomId = crypto.randomBytes(8).toString("hex").toUpperCase();
      const destFilename = `kiro-google-${randomId}.json`;
      const destPath = path.join(authDir, destFilename);

      fs.copyFileSync(kiroFile, destPath);
      console.log(`[IPC] Kiro token imported: ${destPath}`);

      return { success: true, filePath: destPath };
    } catch (error) {
      console.error("[IPC] Failed to import Kiro token:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("kiro:refreshToken", async (_event, filePath: string) => {
    try {
      const tokens = scanTokenFiles();
      const token = tokens.find((t) => t.filePath === filePath);

      if (!token) {
        return { success: false, error: "Token file not found" };
      }

      if (token.provider !== "kiro") {
        return { success: false, error: "Not a Kiro token file" };
      }

      return await refreshKiroTokenManually(token);
    } catch (error) {
      console.error("[IPC] Failed to refresh Kiro token:", error);
      return { success: false, error: String(error) };
    }
  });
}
