import { app, ipcMain, shell } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import log from "../utils/logger";
import { proxyManager } from "../proxy/manager";
import { managementAPI } from "../proxy/api";
import { store } from "../utils/store";
import { setAutoLaunch } from "../utils/autoLaunch";
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
import {
  validateApiKey,
  isValidSettingKey,
  isPathSafe,
} from "../utils/validation";

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
      log.error("[IPC] Failed to read request logs:", error);
      return [];
    }
  });

  ipcMain.handle("logs:deleteAll", () => {
    try {
      return deleteAllLogs();
    } catch (error) {
      log.error("[IPC] Failed to delete logs:", error);
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

  ipcMain.handle("api:startAuth", async (_event, provider: string) => {
    try {
      return await proxyManager.runCliLogin(provider);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(
    "api:validateApiKey",
    async (_event, provider: string, apiKey: string) => {
      return validateApiKey(provider, apiKey);
    },
  );

  ipcMain.handle("api:getUsage", async () => {
    try {
      return await managementAPI.getUsage();
    } catch (error) {
      log.error("[IPC] Failed to get usage:", error);
      return null;
    }
  });

  ipcMain.handle("settings:get", (_event, key: string) => {
    if (!isValidSettingKey(key)) {
      log.warn(`[IPC] Attempted to get invalid setting key: ${key}`);
      return undefined;
    }
    return store.get(key as keyof typeof store.store);
  });

  ipcMain.handle("settings:set", (_event, key: string, value: unknown) => {
    if (!isValidSettingKey(key)) {
      log.warn(`[IPC] Attempted to set invalid setting key: ${key}`);
      return { success: false, error: "Invalid setting key" };
    }
    store.set(key as keyof typeof store.store, value);
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
        switchProject?: boolean;
        switchPreviewModel?: boolean;
        developerMode?: boolean;
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

        if (
          updates.switchProject !== undefined ||
          updates.switchPreviewModel !== undefined
        ) {
          const currentConfig = proxyManager.loadConfigFromYaml();
          const currentQuotaExceeded = currentConfig?.["quota-exceeded"] || {};
          yamlUpdates["quota-exceeded"] = {
            ...currentQuotaExceeded,
            ...(updates.switchProject !== undefined && {
              "switch-project": updates.switchProject,
            }),
            ...(updates.switchPreviewModel !== undefined && {
              "switch-preview-model": updates.switchPreviewModel,
            }),
          };
        }

        if (updates.developerMode !== undefined) {
          store.set("developerMode", updates.developerMode);
        }

        if (updates.managementSecret !== undefined) {
          const currentRemoteMgmt =
            proxyManager.loadConfigFromYaml()?.["remote-management"] || {};
          yamlUpdates["remote-management"] = {
            ...currentRemoteMgmt,
            "secret-key": updates.managementSecret,
          };
          log.info(
            "[IPC] Setting managementSecret, yamlUpdates:",
            JSON.stringify(yamlUpdates, null, 2),
          );
          store.set("managementSecret", updates.managementSecret);
        }

        log.info(
          "[IPC] Calling updateConfigYaml with:",
          JSON.stringify(yamlUpdates, null, 2),
        );
        const success = proxyManager.updateConfigYaml(yamlUpdates);
        log.info("[IPC] updateConfigYaml result:", success);
        return { success };
      } catch (error) {
        log.error("[IPC] Failed to sync settings to YAML:", error);
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

  ipcMain.on("app:quit", () => {
    app.quit();
  });

  ipcMain.handle("apiKeys:getAll", () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const apiKeys = config?.["api-keys"] || [];
      return { success: true, keys: apiKeys };
    } catch (error) {
      log.error("[IPC] Failed to get API keys:", error);
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
      log.error("[IPC] Failed to add API key:", error);
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
      log.error("[IPC] Failed to update API key:", error);
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
      log.error("[IPC] Failed to delete API key:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("openaiCompat:getAll", () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const providers = config?.["openai-compatibility"] || [];
      return { success: true, providers };
    } catch (error) {
      log.error("[IPC] Failed to get OpenAI compatibility providers:", error);
      return { success: false, providers: [], error: String(error) };
    }
  });

  ipcMain.handle(
    "openaiCompat:add",
    (
      _event,
      provider: {
        name: string;
        "base-url": string;
        "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
        models?: { name: string; alias?: string }[];
      },
    ) => {
      try {
        const config = proxyManager.loadConfigFromYaml();
        if (!config) {
          return { success: false, error: "Failed to load config" };
        }

        const currentProviders = config["openai-compatibility"] || [];
        if (currentProviders.some((p) => p.name === provider.name)) {
          return {
            success: false,
            error: "Provider with this name already exists",
          };
        }

        const newProviders = [...currentProviders, provider];
        const success = proxyManager.updateConfigYaml({
          "openai-compatibility": newProviders,
        });
        return { success, providers: newProviders };
      } catch (error) {
        log.error("[IPC] Failed to add OpenAI compatibility provider:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(
    "openaiCompat:update",
    (
      _event,
      providerName: string,
      provider: {
        name: string;
        "base-url": string;
        "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
        models?: { name: string; alias?: string }[];
      },
    ) => {
      try {
        const config = proxyManager.loadConfigFromYaml();
        if (!config) {
          return { success: false, error: "Failed to load config" };
        }

        const currentProviders = config["openai-compatibility"] || [];
        const index = currentProviders.findIndex(
          (p) => p.name === providerName,
        );
        if (index === -1) {
          return { success: false, error: "Provider not found" };
        }

        const newProviders = [...currentProviders];
        newProviders[index] = provider;
        const success = proxyManager.updateConfigYaml({
          "openai-compatibility": newProviders,
        });
        return { success, providers: newProviders };
      } catch (error) {
        log.error(
          "[IPC] Failed to update OpenAI compatibility provider:",
          error,
        );
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("openaiCompat:delete", (_event, providerName: string) => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      if (!config) {
        return { success: false, error: "Failed to load config" };
      }

      const currentProviders = config["openai-compatibility"] || [];
      const newProviders = currentProviders.filter(
        (p) => p.name !== providerName,
      );
      if (newProviders.length === currentProviders.length) {
        return { success: false, error: "Provider not found" };
      }

      const success = proxyManager.updateConfigYaml({
        "openai-compatibility": newProviders,
      });
      return { success, providers: newProviders };
    } catch (error) {
      log.error("[IPC] Failed to delete OpenAI compatibility provider:", error);
      return { success: false, error: String(error) };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Claude API Key Management - CRUD operations for config.yaml claude-api-key field
  // ═══════════════════════════════════════════════════════════════════════════════

  ipcMain.handle("claudeCompat:getAll", () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const entries = config?.["claude-api-key"] || [];
      return { success: true, entries };
    } catch (error) {
      log.error("[IPC] Failed to get Claude API key entries:", error);
      return { success: false, entries: [], error: String(error) };
    }
  });

  ipcMain.handle(
    "claudeCompat:save",
    (
      _event,
      entries: {
        "api-key": string;
        "base-url"?: string;
        "proxy-url"?: string;
        models?: { name: string; alias?: string }[];
      }[],
    ) => {
      try {
        const success = proxyManager.updateConfigYaml({
          "claude-api-key": entries,
        });
        return { success };
      } catch (error) {
        log.error("[IPC] Failed to save Claude API key entries:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // Gemini API Key Management - CRUD operations for config.yaml gemini-api-key field
  // ═══════════════════════════════════════════════════════════════════════════════

  ipcMain.handle("geminiCompat:getAll", () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const entries = config?.["gemini-api-key"] || [];
      return { success: true, entries };
    } catch (error) {
      log.error("[IPC] Failed to get Gemini API key entries:", error);
      return { success: false, entries: [], error: String(error) };
    }
  });

  ipcMain.handle(
    "geminiCompat:save",
    (
      _event,
      entries: {
        "api-key": string;
        "base-url"?: string;
        "proxy-url"?: string;
        headers?: Record<string, string>;
      }[],
    ) => {
      try {
        const success = proxyManager.updateConfigYaml({
          "gemini-api-key": entries,
        });
        return { success };
      } catch (error) {
        log.error("[IPC] Failed to save Gemini API key entries:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("codexCompat:getAll", () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const entries = config?.["codex-api-key"] || [];
      return { success: true, entries };
    } catch (error) {
      log.error("[IPC] Failed to get Codex API key entries:", error);
      return { success: false, entries: [], error: String(error) };
    }
  });

  ipcMain.handle(
    "codexCompat:save",
    (
      _event,
      entries: {
        "api-key": string;
        "base-url"?: string;
        "proxy-url"?: string;
      }[],
    ) => {
      try {
        const success = proxyManager.updateConfigYaml({
          "codex-api-key": entries,
        });
        return { success };
      } catch (error) {
        log.error("[IPC] Failed to save Codex API key entries:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("cli:detectAll", async () => {
    try {
      const tools = await detectAllCLITools();
      return { success: true, tools };
    } catch (error) {
      log.error("[IPC] Failed to detect CLI tools:", error);
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
        log.error("[IPC] Failed to detect CLI tool:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("cli:readConfig", async (_event, toolName: string) => {
    try {
      const config = await readCLIConfig(toolName);
      return { success: true, config };
    } catch (error) {
      log.error("[IPC] Failed to read CLI config:", error);
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
        // Validate path is within user's home directory
        const homeDir = app.getPath("home");
        if (!isPathSafe(homeDir, filePath.replace(homeDir, ""))) {
          log.warn(`[IPC] Rejected unsafe path: ${filePath}`);
          return { success: false, error: "Invalid file path" };
        }
        const result = writeConfig(filePath, content, backup);
        return result;
      } catch (error) {
        log.error("[IPC] Failed to write CLI config:", error);
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
        log.error("[IPC] Failed to test connection:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("quota:getProviders", async () => {
    try {
      return { success: true, providers: await getProviders() };
    } catch (error) {
      log.error("[IPC] Failed to get providers:", error);
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
        log.error("[IPC] Failed to get quota by provider:", error);
        return { success: false, accounts: [], error: String(error) };
      }
    },
  );

  ipcMain.handle("quota:refresh", async (_event, accountId: string) => {
    try {
      const account = await refreshQuota(accountId);
      return { success: true, account };
    } catch (error) {
      log.error("[IPC] Failed to refresh quota:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("quota:refreshAll", async () => {
    try {
      const providers = await getProviders();
      const results = await Promise.allSettled(
        providers.map((provider) => getQuotaByProvider(provider.id)),
      );

      const allAccounts = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      );

      const failedCount = results.filter((r) => r.status === "rejected").length;
      if (failedCount > 0) {
        log.warn(
          `[IPC] ${failedCount}/${providers.length} providers failed to refresh`,
        );
      }

      return { success: true, accounts: allAccounts };
    } catch (error) {
      log.error("[IPC] Failed to refresh all quotas:", error);
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
            log.info(`[IPC] Skipping expired Kiro account: ${token.filePath}`);
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
      log.error("[IPC] Failed to get provider accounts:", error);
      return { success: false, accounts: [], error: String(error) };
    }
  });

  ipcMain.handle(
    "providers:removeAccount",
    async (_event, filePath: string) => {
      try {
        const authDir = proxyManager.getAuthDir();
        if (!isPathSafe(authDir, path.relative(authDir, filePath))) {
          log.warn(
            `[IPC] Rejected unsafe path for account removal: ${filePath}`,
          );
          return { success: false, error: "Invalid file path" };
        }
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          return { success: true };
        }
        return { success: false, error: "Token file not found" };
      } catch (error) {
        log.error("[IPC] Failed to remove account:", error);
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
      log.error("[IPC] Failed to get Qwen auth URL:", error);
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
      log.error("[IPC] Failed to get Antigravity auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("iflow:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getIFlowAuthUrl();
      if (result.status === "ok" && result.url) {
        await shell.openExternal(result.url);
      }
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get iFlow auth URL:", error);
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
      log.error("[IPC] Failed to get Claude auth URL:", error);
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
      log.error("[IPC] Failed to get Gemini auth URL:", error);
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
      log.error("[IPC] Failed to get Codex auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("copilot:getAuthUrl", async () => {
    try {
      return await managementAPI.getCopilotAuthUrl();
    } catch (error) {
      log.error("[IPC] Failed to get Copilot auth URL:", error);
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
      log.error("[IPC] Failed to get Qwen auth status:", error);
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
      log.info(`[IPC] Kiro token imported: ${destPath}`);

      return { success: true, filePath: destPath };
    } catch (error) {
      log.error("[IPC] Failed to import Kiro token:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("settings:setAutoLaunch", (_event, enabled: boolean) => {
    try {
      setAutoLaunch(enabled);
      store.set("autoLaunch", enabled);
      return { success: true };
    } catch (error) {
      log.error("[IPC] Failed to set auto launch:", error);
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
      log.error("[IPC] Failed to refresh Kiro token:", error);
      return { success: false, error: String(error) };
    }
  });
}
