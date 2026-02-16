import type { IncomingMessage } from "http";

import { ipcMain } from "electron";

import { proxyManager, type ProxyConfig } from "../proxy/manager";
import log from "../utils/logger";
import { store } from "../utils/store";

import {
  ClaudeCompatibilityEntry,
  CodexCompatibilityEntry,
  CustomProviderDrafts,
  CustomProviderType,
  EMPTY_CUSTOM_PROVIDER_DRAFTS,
  GeminiCompatibilityEntry,
  OpenAICompatibilityEntry,
} from "./types";

function parseCustomProviderDrafts(value: unknown): CustomProviderDrafts {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    "openai-compatibility": Array.isArray(source["openai-compatibility"])
      ? (source["openai-compatibility"] as OpenAICompatibilityEntry[])
      : [],
    "claude-api-key": Array.isArray(source["claude-api-key"])
      ? (source["claude-api-key"] as ClaudeCompatibilityEntry[])
      : [],
    "gemini-api-key": Array.isArray(source["gemini-api-key"])
      ? (source["gemini-api-key"] as GeminiCompatibilityEntry[])
      : [],
    "codex-api-key": Array.isArray(source["codex-api-key"])
      ? (source["codex-api-key"] as CodexCompatibilityEntry[])
      : [],
  };
}

function getCustomProviderDrafts(): CustomProviderDrafts {
  return parseCustomProviderDrafts(store.get("customProviderDrafts"));
}

function setCustomProviderDrafts(drafts: CustomProviderDrafts): void {
  store.set("customProviderDrafts", drafts);
}

function getCustomProviderConfigKey(
  type: CustomProviderType,
): keyof CustomProviderDrafts {
  if (type === "openai") return "openai-compatibility";
  if (type === "claude") return "claude-api-key";
  if (type === "gemini") return "gemini-api-key";
  return "codex-api-key";
}

function isSameCustomProviderEntry(
  type: CustomProviderType,
  left: unknown,
  right: unknown,
): boolean {
  if (
    !left ||
    !right ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }

  if (type === "openai") {
    return (
      (left as OpenAICompatibilityEntry).name ===
      (right as OpenAICompatibilityEntry).name
    );
  }

  const leftEntry = left as ClaudeCompatibilityEntry;
  const rightEntry = right as ClaudeCompatibilityEntry;

  return (
    (leftEntry.name || "") === (rightEntry.name || "") &&
    leftEntry["api-key"] === rightEntry["api-key"] &&
    (leftEntry["base-url"] || "") === (rightEntry["base-url"] || "")
  );
}

function registerCompatHandlers(channel: string, configKey: string): void {
  const label = channel.charAt(0).toUpperCase() + channel.slice(1);

  ipcMain.handle(`${channel}Compat:getAll`, () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const entries =
        (config as Record<string, unknown> | null)?.[configKey] || [];
      return { success: true, entries };
    } catch (error) {
      log.error(`[IPC] Failed to get ${label} API key entries:`, error);
      return { success: false, entries: [], error: String(error) };
    }
  });

  ipcMain.handle(
    `${channel}Compat:save`,
    (_event: Electron.IpcMainInvokeEvent, entries: unknown[]) => {
      try {
        const success = proxyManager.updateConfigYaml({
          [configKey]: entries,
        });
        return { success };
      } catch (error) {
        log.error(`[IPC] Failed to save ${label} API key entries:`, error);
        return { success: false, error: String(error) };
      }
    },
  );
}

export function setupCustomProvidersHandlers(): void {
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

  ipcMain.handle("customProviders:getAll", () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      if (!config) {
        return { success: false, error: "Failed to load config" };
      }

      return {
        success: true,
        active: {
          "openai-compatibility": config["openai-compatibility"] || [],
          "claude-api-key": config["claude-api-key"] || [],
          "gemini-api-key": config["gemini-api-key"] || [],
          "codex-api-key": config["codex-api-key"] || [],
        },
        drafts: getCustomProviderDrafts(),
      };
    } catch (error) {
      log.error("[IPC] Failed to get all custom providers:", error);
      return {
        success: false,
        error: String(error),
        active: EMPTY_CUSTOM_PROVIDER_DRAFTS,
        drafts: EMPTY_CUSTOM_PROVIDER_DRAFTS,
      };
    }
  });

  ipcMain.handle(
    "customProviders:setEnabled",
    (
      _event,
      payload: {
        type: CustomProviderType;
        rawData:
          | OpenAICompatibilityEntry
          | ClaudeCompatibilityEntry
          | GeminiCompatibilityEntry
          | CodexCompatibilityEntry;
      },
      enabled: boolean,
    ) => {
      try {
        const config = proxyManager.loadConfigFromYaml();
        if (!config) {
          return { success: false, error: "Failed to load config" };
        }

        const drafts = getCustomProviderDrafts();
        const key = getCustomProviderConfigKey(payload.type);
        const activeEntries = Array.isArray(config[key])
          ? [...(config[key] as unknown[])]
          : [];
        const draftEntries = [...(drafts[key] as unknown[])];

        const activeIndex = activeEntries.findIndex((entry) =>
          isSameCustomProviderEntry(payload.type, entry, payload.rawData),
        );
        const draftIndex = draftEntries.findIndex((entry) =>
          isSameCustomProviderEntry(payload.type, entry, payload.rawData),
        );

        if (enabled) {
          if (activeIndex >= 0) {
            return { success: true };
          }

          if (draftIndex === -1) {
            return { success: false, error: "Draft provider not found" };
          }

          const [entry] = draftEntries.splice(draftIndex, 1);
          activeEntries.push(entry);
        } else {
          if (draftIndex >= 0 && activeIndex === -1) {
            return { success: true };
          }

          if (activeIndex === -1) {
            return { success: false, error: "Provider not found" };
          }

          const [entry] = activeEntries.splice(activeIndex, 1);
          draftEntries.push(entry);
        }

        const success = proxyManager.updateConfigYaml({
          [key]: activeEntries,
        } as Partial<ProxyConfig>);
        if (!success) {
          return { success: false, error: "Failed to update config" };
        }

        const nextDrafts = {
          ...drafts,
          [key]: draftEntries,
        } as CustomProviderDrafts;
        setCustomProviderDrafts(nextDrafts);

        return { success: true };
      } catch (error) {
        log.error("[IPC] Failed to toggle custom provider state:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(
    "customProviders:removeDraft",
    (
      _event,
      payload: {
        type: CustomProviderType;
        rawData:
          | OpenAICompatibilityEntry
          | ClaudeCompatibilityEntry
          | GeminiCompatibilityEntry
          | CodexCompatibilityEntry;
      },
    ) => {
      try {
        const drafts = getCustomProviderDrafts();
        const key = getCustomProviderConfigKey(payload.type);
        const currentDrafts = drafts[key] as unknown[];
        const nextDraftsForType = currentDrafts.filter(
          (entry) =>
            !isSameCustomProviderEntry(payload.type, entry, payload.rawData),
        );

        if (nextDraftsForType.length === currentDrafts.length) {
          return { success: false, error: "Draft provider not found" };
        }

        const nextDrafts = {
          ...drafts,
          [key]: nextDraftsForType,
        } as CustomProviderDrafts;
        setCustomProviderDrafts(nextDrafts);
        return { success: true };
      } catch (error) {
        log.error("[IPC] Failed to remove custom provider draft:", error);
        return { success: false, error: String(error) };
      }
    },
  );

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
    (_event, provider: OpenAICompatibilityEntry) => {
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
    (_event, providerName: string, provider: OpenAICompatibilityEntry) => {
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

  registerCompatHandlers("claude", "claude-api-key");
  registerCompatHandlers("gemini", "gemini-api-key");
  registerCompatHandlers("codex", "codex-api-key");

  ipcMain.handle("ampcodeCompat:getAll", () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const provider = config?.ampcode || null;
      return { success: true, provider };
    } catch (error) {
      log.error("[IPC] Failed to get Ampcode provider:", error);
      return { success: false, provider: null, error: String(error) };
    }
  });

  ipcMain.handle(
    "ampcodeCompat:save",
    (
      _event,
      provider: {
        "upstream-url": string;
        "upstream-api-key"?: string;
        "upstream-api-keys"?: {
          "upstream-api-key": string;
          "api-keys": string[];
        }[];
        "restrict-management-to-localhost"?: boolean;
        "force-model-mappings"?: boolean;
        "model-mappings"?: { from: string; to: string }[];
      } | null,
    ) => {
      try {
        const success = proxyManager.updateConfigYaml({ ampcode: provider });
        return { success };
      } catch (error) {
        log.error("[IPC] Failed to save Ampcode provider:", error);
        return { success: false, error: String(error) };
      }
    },
  );

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
