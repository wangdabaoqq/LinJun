import axios from "axios";
import { ipcMain } from "electron";

import { proxyManager, type ProxyConfig } from "../proxy/manager";
import { managementAPI } from "../proxy/api";
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

function unwrapManagementApiCallPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const objectPayload = payload as {
    status_code?: unknown;
    success?: unknown;
    error?: unknown;
    body?: unknown;
    data?: unknown;
  };

  const statusCode =
    typeof objectPayload.status_code === "number"
      ? objectPayload.status_code
      : undefined;

  if (statusCode && statusCode >= 400) {
    const bodyText =
      typeof objectPayload.body === "string" ? objectPayload.body : "";
    throw new Error(
      bodyText
        ? `Model list request failed (${statusCode}): ${bodyText}`
        : `Model list request failed (${statusCode})`,
    );
  }

  if (objectPayload.success === false) {
    throw new Error(
      typeof objectPayload.error === "string"
        ? objectPayload.error
        : "Model list request failed",
    );
  }

  if (typeof objectPayload.body === "string") {
    try {
      return JSON.parse(objectPayload.body) as unknown;
    } catch {
      return objectPayload.body;
    }
  }

  if (objectPayload.data !== undefined) {
    return objectPayload.data;
  }

  return payload;
}

function extractModelsFromApiCallPayload(payload: unknown): {
  id: string;
  owned_by?: string;
}[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const model = item as {
        id?: unknown;
        name?: unknown;
        owned_by?: unknown;
        ownedBy?: unknown;
      };

      const modelId =
        typeof model.id === "string"
          ? model.id
          : typeof model.name === "string"
            ? model.name
            : "";

      if (!modelId.trim()) {
        return [];
      }

      const ownedBy =
        typeof model.owned_by === "string"
          ? model.owned_by
          : typeof model.ownedBy === "string"
            ? model.ownedBy
            : undefined;

      return [{ id: modelId, ...(ownedBy ? { owned_by: ownedBy } : {}) }];
    });
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as {
      data?: unknown;
      models?: unknown;
      items?: unknown;
      result?: unknown;
      object?: unknown;
      success?: unknown;
    };

    if (objectPayload.data !== undefined) {
      const models = extractModelsFromApiCallPayload(objectPayload.data);
      if (models.length > 0) {
        return models;
      }
    }

    if (objectPayload.models !== undefined) {
      const models = extractModelsFromApiCallPayload(objectPayload.models);
      if (models.length > 0) {
        return models;
      }
    }

    if (objectPayload.items !== undefined) {
      const models = extractModelsFromApiCallPayload(objectPayload.items);
      if (models.length > 0) {
        return models;
      }
    }

    if (objectPayload.result !== undefined) {
      const models = extractModelsFromApiCallPayload(objectPayload.result);
      if (models.length > 0) {
        return models;
      }
    }
  }

  return [];
}

function buildModelsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (/\/v\d+$/i.test(normalized)) {
    return `${normalized}/models`;
  }
  return `${normalized}/v1/models`;
}

function buildChatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (/\/v\d+$/i.test(normalized)) {
    return `${normalized}/chat/completions`;
  }
  return `${normalized}/v1/chat/completions`;
}

export function setupCustomProvidersHandlers(): void {
  ipcMain.removeHandler("customProvider:fetchModels");
  ipcMain.handle(
    "customProvider:fetchModels",
    async (
      _event,
      params: {
        baseUrl: string;
        apiKey: string;
        headers?: Record<string, string>;
      },
    ) => {
      try {
        const baseUrl = params.baseUrl.trim().replace(/\/+$/, "");
        const apiKey = params.apiKey.trim();
        const inputHeaders = Object.fromEntries(
          Object.entries(params.headers || {}).filter(
            ([key, value]) => key.trim().length > 0 && value.trim().length > 0,
          ),
        );
        const hasAuthorizationHeader = Object.entries(inputHeaders).some(
          ([key, value]) =>
            key.trim().toLowerCase() === "authorization" &&
            value.trim().length > 0,
        );

        if (!baseUrl) {
          return { success: false, models: [], error: "Base URL is required" };
        }

        if (!apiKey && !hasAuthorizationHeader) {
          return {
            success: false,
            models: [],
            error: "API key or Authorization header is required",
          };
        }

        const headers: Record<string, string> = { ...inputHeaders };
        if (apiKey && !hasAuthorizationHeader) {
          headers.Authorization = `Bearer ${apiKey}`;
        }

        const modelsUrl = buildModelsUrl(baseUrl);

        let payload: unknown;
        try {
          payload = await managementAPI.callManagementApi({
            method: "GET",
            url: modelsUrl,
            header: headers,
          });
        } catch (error) {
          const status = axios.isAxiosError(error)
            ? error.response?.status
            : undefined;

          if (status === 404) {
            const direct = await axios.get(modelsUrl, {
              headers,
              timeout: 15000,
            });
            payload = direct.data;
          } else {
            throw error;
          }
        }

        const normalizedPayload = unwrapManagementApiCallPayload(payload);

        const models = extractModelsFromApiCallPayload(normalizedPayload).map(
          (model) => ({
            id: model.id,
            ownedBy:
              typeof model.owned_by === "string" ? model.owned_by : "custom",
          }),
        );

        return { success: true, models };
      } catch (error) {
        log.error("[IPC] Failed to fetch custom provider models:", error);
        return { success: false, models: [], error: String(error) };
      }
    },
  );

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
          headers?: Record<string, string>;
          models?: { name: string; alias?: string }[];
          prefix?: string;
        }[];
        "claude-api-key"?: {
          name?: string;
          "api-key": string;
          "base-url"?: string;
          "proxy-url"?: string;
          "system-access-token"?: string;
          headers?: Record<string, string>;
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
          headers?: Record<string, string>;
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
            "new-api-user"?: string;
            headers?: Record<string, string>;
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
        headers?: Record<string, string>;
      },
    ) => {
      const { baseUrl, apiKey, headers } = params;

      if (!baseUrl) {
        return { success: false, error: "Base URL is required" };
      }

      const inputHeaders = Object.fromEntries(
        Object.entries(headers || {}).filter(
          ([key, value]) => key.trim().length > 0 && value.trim().length > 0,
        ),
      );
      const hasAuthorizationHeader = Object.entries(inputHeaders).some(
        ([key, value]) =>
          key.trim().toLowerCase() === "authorization" &&
          value.trim().length > 0,
      );

      if (!apiKey.trim() && !hasAuthorizationHeader) {
        return {
          success: false,
          error: "API key or Authorization header is required",
        };
      }

      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...inputHeaders,
      };
      if (apiKey.trim() && !hasAuthorizationHeader) {
        requestHeaders.Authorization = `Bearer ${apiKey.trim()}`;
      }

      const requestUrl = buildChatCompletionsUrl(baseUrl);
      const startTime = Date.now();

      try {
        let payload: unknown;
        try {
          payload = await managementAPI.callManagementApi({
            method: "POST",
            url: requestUrl,
            header: requestHeaders,
            body: {
              model: "gpt-5-nano",
              messages: [{ role: "user", content: "Hi" }],
              stream: false,
              max_tokens: 5,
            },
          });
        } catch (error) {
          const status = axios.isAxiosError(error)
            ? error.response?.status
            : undefined;

          if (status === 404) {
            const direct = await axios.post(
              requestUrl,
              {
                model: "gpt-5-nano",
                messages: [{ role: "user", content: "Hi" }],
                stream: false,
                max_tokens: 5,
              },
              {
                headers: requestHeaders,
                timeout: 15000,
              },
            );
            payload = direct.data;
          } else {
            throw error;
          }
        }

        const objectPayload =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? (payload as Record<string, unknown>)
            : null;

        if (objectPayload?.success === false) {
          return {
            success: false,
            error:
              typeof objectPayload.error === "string"
                ? objectPayload.error
                : "Connection test failed",
            latency: Date.now() - startTime,
          };
        }

        return {
          success: true,
          latency: Date.now() - startTime,
          serviceType: "custom" as const,
        };
      } catch (error) {
        log.error("[IPC] Failed to test custom provider connection:", error);
        return { success: false, error: String(error) };
      }
    },
  );
}
