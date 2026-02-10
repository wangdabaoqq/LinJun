import { app, ipcMain, shell } from "electron";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import type { IncomingMessage } from "http";

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
  isKiroRefreshBlocked,
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

  ipcMain.handle(
    "customProviders:import",
    (
      _event,
      data: {
        "openai-compatibility"?: {
          name: string;
          "base-url": string;
          "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
          "system-access-token"?: string;
          "new-api-user"?: string;
          models?: { name: string; alias?: string }[];
          prefix?: string;
        }[];
        "claude-api-key"?: {
          name?: string;
          "api-key": string;
          "base-url"?: string;
          "proxy-url"?: string;
          "system-access-token"?: string;
          models?: { name: string; alias?: string }[];
          prefix?: string;
        }[];
        "gemini-api-key"?: {
          name?: string;
          "api-key": string;
          "base-url"?: string;
          "proxy-url"?: string;
          "system-access-token"?: string;
          headers?: Record<string, string>;
          models?: { name: string; alias?: string }[];
          prefix?: string;
        }[];
        "codex-api-key"?: {
          name?: string;
          "api-key": string;
          "base-url"?: string;
          "proxy-url"?: string;
          "system-access-token"?: string;
          models?: { name: string; alias?: string }[];
          prefix?: string;
        }[];
      },
      strategy: "overwrite" | "skip" = "overwrite",
    ) => {
      try {
        const config = proxyManager.loadConfigFromYaml();
        if (!config) {
          return { success: false, error: "Failed to load config" };
        }

        const summary = {
          added: 0,
          updated: 0,
          skipped: 0,
        };

        const mergeOpenAI = (
          incoming: {
            name: string;
            "base-url": string;
            "api-key-entries": { "api-key": string; "proxy-url"?: string }[];
            "system-access-token"?: string;
            models?: { name: string; alias?: string }[];
            prefix?: string;
          }[],
        ) => {
          const current = config["openai-compatibility"] || [];
          const result = [...current];

          incoming.forEach((provider) => {
            if (!provider.name?.trim() || !provider["base-url"]?.trim()) {
              summary.skipped += 1;
              return;
            }
            if (!provider["api-key-entries"]?.length) {
              summary.skipped += 1;
              return;
            }

            const index = result.findIndex(
              (p) =>
                p.name === provider.name &&
                p["base-url"] === provider["base-url"],
            );
            if (index === -1) {
              result.push(provider);
              summary.added += 1;
            } else {
              if (strategy === "skip") {
                summary.skipped += 1;
              } else {
                result[index] = provider;
                summary.updated += 1;
              }
            }
          });

          return result;
        };

        const mergeByApiKey = <T extends { "api-key": string }>(
          current: T[] | undefined,
          incoming: T[] | undefined,
        ) => {
          const result = [...(current || [])];
          (incoming || []).forEach((entry) => {
            if (!entry["api-key"]?.trim()) {
              summary.skipped += 1;
              return;
            }

            const index = result.findIndex(
              (existing) => existing["api-key"] === entry["api-key"],
            );
            if (index === -1) {
              result.push(entry);
              summary.added += 1;
            } else {
              if (strategy === "skip") {
                summary.skipped += 1;
              } else {
                result[index] = entry;
                summary.updated += 1;
              }
            }
          });
          return result;
        };

        const updates = {
          ...(data["openai-compatibility"]
            ? {
                "openai-compatibility": mergeOpenAI(
                  data["openai-compatibility"],
                ),
              }
            : {}),
          ...(data["claude-api-key"]
            ? {
                "claude-api-key": mergeByApiKey(
                  config["claude-api-key"],
                  data["claude-api-key"],
                ),
              }
            : {}),
          ...(data["gemini-api-key"]
            ? {
                "gemini-api-key": mergeByApiKey(
                  config["gemini-api-key"],
                  data["gemini-api-key"],
                ),
              }
            : {}),
          ...(data["codex-api-key"]
            ? {
                "codex-api-key": mergeByApiKey(
                  config["codex-api-key"],
                  data["codex-api-key"],
                ),
              }
            : {}),
        };

        if (Object.keys(updates).length === 0) {
          return { success: false, error: "No valid entries to import" };
        }

        const success = proxyManager.updateConfigYaml(updates);
        return { success, summary };
      } catch (error) {
        log.error("[IPC] Failed to import custom providers:", error);
        return { success: false, error: String(error) };
      }
    },
  );

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

  ipcMain.handle("app:getHomeDir", () => {
    try {
      return { success: true, homeDir: app.getPath("home") };
    } catch (error) {
      log.error("[IPC] Failed to get home directory:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("app:getPlatform", () => {
    return { success: true, platform: process.platform };
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
        "system-access-token"?: string;
        "new-api-user"?: string;
        "enable-usage-query"?: boolean;
        prefix?: string;
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
        "system-access-token"?: string;
        "new-api-user"?: string;
        "enable-usage-query"?: boolean;
        prefix?: string;
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
        name?: string;
        "api-key": string;
        "base-url"?: string;
        "proxy-url"?: string;
        "system-access-token"?: string;
        "new-api-user"?: string;
        "enable-usage-query"?: boolean;
        prefix?: string;
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
        name?: string;
        "api-key": string;
        "base-url"?: string;
        "proxy-url"?: string;
        "system-access-token"?: string;
        "new-api-user"?: string;
        "enable-usage-query"?: boolean;
        prefix?: string;
        models?: { name: string; alias?: string }[];
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
        const relativePath = path.isAbsolute(filePath)
          ? path.relative(homeDir, filePath)
          : filePath;
        if (!isPathSafe(homeDir, relativePath)) {
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
          if (isKiroRefreshBlocked(token.filePath)) {
            continue;
          }
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
      // Keep this precheck for a clear user-facing error message.
      // The actual import is performed by the managed cliproxy binary.

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

      proxyManager.ensureConfig();
      const binaryPath = proxyManager.getBinaryPath();
      const configPath = proxyManager.getConfigPath();

      if (!fs.existsSync(binaryPath)) {
        return {
          success: false,
          error:
            "Proxy binary not found. Please download/install CLIProxyAPIPlus first.",
        };
      }
      if (!fs.existsSync(configPath)) {
        return {
          success: false,
          error:
            "Proxy config not found. Please start proxy once to initialize config.",
        };
      }

      return await new Promise<{
        success: boolean;
        filePath?: string;
        error?: string;
      }>((resolve) => {
        const child = spawn(
          binaryPath,
          ["--config", configPath, "--kiro-import"],
          {
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
          },
        );

        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", (data) => {
          stdout += data.toString();
        });
        child.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        child.once("error", (error) => {
          resolve({ success: false, error: String(error) });
        });

        child.once("exit", (code) => {
          if (code === 0) {
            const match = stdout.match(/Authentication saved to\s+(.+)\s*/);
            const filePath = match?.[1]?.trim();
            resolve({ success: true, filePath });
            return;
          }

          const message = (stderr || stdout).trim() || `Exit code ${code}`;
          resolve({ success: false, error: message });
        });
      });
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

  ipcMain.handle(
    "customProvider:testConnection",
    async (
      _event,
      params: {
        protocol: "openai" | "claude" | "gemini" | "codex";
        baseUrl: string;
        apiKey: string;
        newApiUser?: string;
      },
    ) => {
      const { baseUrl, apiKey, newApiUser } = params;

      if (!baseUrl || !apiKey) {
        return { success: false, error: "Base URL and API Key are required" };
      }

      const normalizedUrl = baseUrl.replace(/\/+$/, "");
      const startTime = Date.now();

      const tryEndpoint = (
        testUrl: string,
        headers: Record<string, string>,
      ): Promise<{
        success: boolean;
        statusCode: number;
        latency: number;
      }> => {
        return new Promise(async (resolve) => {
          try {
            const urlObj = new URL(testUrl);
            const isHttps = urlObj.protocol === "https:";
            const httpModule = await import(isHttps ? "https" : "http");

            const options = {
              hostname: urlObj.hostname,
              port: urlObj.port || (isHttps ? 443 : 80),
              path: urlObj.pathname + urlObj.search,
              method: "GET",
              headers,
              timeout: 10000,
            };

            const req = httpModule.request(options, (res: IncomingMessage) => {
              const latency = Date.now() - startTime;
              res.on("data", () => {});
              res.on("end", () => {
                resolve({
                  success:
                    (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
                  statusCode: res.statusCode || 0,
                  latency,
                });
              });
            });

            req.on("error", () => {
              resolve({
                success: false,
                statusCode: 0,
                latency: Date.now() - startTime,
              });
            });

            req.on("timeout", () => {
              req.destroy();
              resolve({
                success: false,
                statusCode: 0,
                latency: Date.now() - startTime,
              });
            });

            req.end();
          } catch {
            resolve({
              success: false,
              statusCode: 0,
              latency: Date.now() - startTime,
            });
          }
        });
      };

      try {
        const newApiHeaders: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
        };
        if (newApiUser) {
          newApiHeaders["New-Api-User"] = newApiUser;
        }

        const newApiResult = await tryEndpoint(
          `${normalizedUrl}/api/pricing`,
          newApiHeaders,
        );

        if (newApiResult.success) {
          return {
            success: true,
            latency: newApiResult.latency,
            serviceType: "new-api" as const,
          };
        }

        if (newApiResult.statusCode === 404) {
          const openRouterResult = await tryEndpoint(
            `${normalizedUrl}/api/v1/key`,
            { Authorization: `Bearer ${apiKey}` },
          );

          if (openRouterResult.success) {
            return {
              success: true,
              latency: openRouterResult.latency,
              serviceType: "openrouter" as const,
            };
          }

          if (openRouterResult.statusCode === 404) {
            return {
              success: false,
              error: "Unsupported service (neither New API nor OpenRouter)",
              latency: openRouterResult.latency,
            };
          }

          if (
            openRouterResult.statusCode === 401 ||
            openRouterResult.statusCode === 403
          ) {
            return {
              success: false,
              error: `Authentication failed (HTTP ${openRouterResult.statusCode})`,
              latency: openRouterResult.latency,
            };
          }

          return {
            success: false,
            error: `Connection failed (HTTP ${openRouterResult.statusCode})`,
            latency: openRouterResult.latency,
          };
        }

        if (
          newApiResult.statusCode === 401 ||
          newApiResult.statusCode === 403
        ) {
          return {
            success: false,
            error: `Authentication failed (HTTP ${newApiResult.statusCode})`,
            latency: newApiResult.latency,
          };
        }

        return {
          success: false,
          error: `Connection failed (HTTP ${newApiResult.statusCode})`,
          latency: newApiResult.latency,
        };
      } catch (error) {
        log.error("[IPC] Failed to test custom provider connection:", error);
        return { success: false, error: String(error) };
      }
    },
  );
}
