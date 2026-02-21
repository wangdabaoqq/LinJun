import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

import { app, ipcMain } from "electron";

import { managementAPI } from "../proxy/api";
import { proxyManager } from "../proxy/manager";
import { refreshKiroTokenManually, scanTokenFiles } from "../quota";
import log from "../utils/logger";
import { validateApiKey } from "../utils/validation";

import {
  OAuthAccountExcludedModelsConfig,
  OAuthExcludedModelsConfig,
  OAUTH_SOURCE_OPTIONS_BY_PROVIDER,
} from "./types";

function registerHandle(
  channel: string,
  handler: Parameters<typeof ipcMain.handle>[1],
): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}

function normalizeOAuthSourceKey(source: unknown): string | null {
  if (typeof source !== "string") return null;
  const normalized = source.trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z0-9-]+$/.test(normalized)) return null;
  return normalized;
}

function normalizeAccountKey(accountKey: unknown): string | null {
  if (typeof accountKey !== "string") return null;
  const normalized = accountKey.trim();
  if (!normalized || normalized.length > 255) return null;
  return normalized;
}

function sanitizeModelPatterns(patterns: unknown): string[] {
  if (!Array.isArray(patterns)) return [];

  const seen = new Set<string>();
  const sanitized: string[] = [];

  patterns.forEach((item) => {
    if (typeof item !== "string") return;
    const pattern = item.trim();
    if (!pattern || pattern.length > 120) return;
    if (seen.has(pattern)) return;
    seen.add(pattern);
    sanitized.push(pattern);
  });

  return sanitized.slice(0, 200);
}

function normalizeOAuthExcludedModels(
  value: unknown,
): OAuthExcludedModelsConfig {
  if (!value || typeof value !== "object") return {};

  const source = value as Record<string, unknown>;
  const normalized: OAuthExcludedModelsConfig = {};

  Object.entries(source).forEach(([sourceKey, patterns]) => {
    const normalizedSourceKey = normalizeOAuthSourceKey(sourceKey);
    if (!normalizedSourceKey) return;

    const sanitizedPatterns = sanitizeModelPatterns(patterns);
    if (sanitizedPatterns.length > 0) {
      normalized[normalizedSourceKey] = sanitizedPatterns;
    }
  });

  return normalized;
}

function normalizeOAuthAccountExcludedModels(
  value: unknown,
): OAuthAccountExcludedModelsConfig {
  if (!value || typeof value !== "object") return {};

  const source = value as Record<string, unknown>;
  const normalized: OAuthAccountExcludedModelsConfig = {};

  Object.entries(source).forEach(([sourceKey, accountMap]) => {
    const normalizedSourceKey = normalizeOAuthSourceKey(sourceKey);
    if (!normalizedSourceKey || !accountMap || typeof accountMap !== "object") {
      return;
    }

    const normalizedAccounts: Record<string, string[]> = {};
    Object.entries(accountMap as Record<string, unknown>).forEach(
      ([accountKey, patterns]) => {
        const normalizedAccountKey = normalizeAccountKey(accountKey);
        if (!normalizedAccountKey) return;
        const sanitizedPatterns = sanitizeModelPatterns(patterns);
        if (sanitizedPatterns.length > 0) {
          normalizedAccounts[normalizedAccountKey] = sanitizedPatterns;
        }
      },
    );

    if (Object.keys(normalizedAccounts).length > 0) {
      normalized[normalizedSourceKey] = normalizedAccounts;
    }
  });

  return normalized;
}

function resolveOAuthSourceKeyForAccount(
  providerId: string,
  accountKey: string,
  tokenSourceKey: string | undefined,
  accountRules: OAuthAccountExcludedModelsConfig,
): string | undefined {
  const sourceFromRules = Object.entries(accountRules).find(
    ([, accountMap]) => accountMap[accountKey],
  )?.[0];
  if (sourceFromRules) {
    return sourceFromRules;
  }

  const normalizedTokenSourceKey = normalizeOAuthSourceKey(tokenSourceKey);
  if (normalizedTokenSourceKey && normalizedTokenSourceKey !== "file") {
    return normalizedTokenSourceKey;
  }

  const sourceOptions = OAUTH_SOURCE_OPTIONS_BY_PROVIDER[providerId] || [];
  return sourceOptions[0];
}

function buildAccountKey(providerId: string, filePath: string): string {
  return `${providerId}:${path.basename(filePath)}`;
}

function normalizeAuthFileName(value: string): string {
  return path.basename(value || "").trim();
}

function isValidAuthFileName(value: string): boolean {
  return /^[a-zA-Z0-9@._-]+\.json$/.test(value);
}

function resolveProviderId(value: {
  provider?: string;
  type?: string;
  accountType?: string;
  name?: string;
}): string {
  const knownProviders = new Set([
    "codex",
    "claude",
    "gemini",
    "qwen",
    "iflow",
    "antigravity",
    "copilot",
    "kiro",
  ]);
  const providerAliases: Record<string, string> = {
    openai: "codex",
    "openai-chatgpt": "codex",
    chatgpt: "codex",
    "github-copilot": "copilot",
  };

  const candidates = [value.provider, value.type, value.accountType].filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.trim().toLowerCase();
    if (knownProviders.has(normalizedCandidate)) {
      return normalizedCandidate;
    }
    if (providerAliases[normalizedCandidate]) {
      return providerAliases[normalizedCandidate];
    }
  }

  const filename = (value.name || "").toLowerCase();
  const matched = Array.from(knownProviders).find((provider) =>
    filename.startsWith(provider),
  );

  return matched || "custom";
}

export function setupProvidersHandlers(): void {
  registerHandle("api:cliLogin", async (_event, provider: string) => {
    try {
      return await proxyManager.runCliLogin(provider);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  registerHandle("api:startAuth", async (_event, provider: string) => {
    try {
      return await proxyManager.runCliLogin(provider);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  registerHandle(
    "api:validateApiKey",
    async (_event, provider: string, apiKey: string) => {
      return validateApiKey(provider, apiKey);
    },
  );

  registerHandle("api:getUsage", async () => {
    try {
      return await managementAPI.getUsage();
    } catch (error) {
      log.error("[IPC] Failed to get usage:", error);
      return null;
    }
  });

  registerHandle("oauthRules:get", async () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const providerRules = normalizeOAuthExcludedModels(
        config?.["oauth-excluded-models"],
      );
      const accountRules = normalizeOAuthAccountExcludedModels(
        config?.["oauth-account-excluded-models"],
      );
      return {
        success: true,
        providerRules,
        accountRules,
        sourceOptionsByProvider: OAUTH_SOURCE_OPTIONS_BY_PROVIDER,
      };
    } catch (error) {
      log.error("[IPC] Failed to get OAuth model exclusion rules:", error);
      return {
        success: false,
        providerRules: {},
        accountRules: {},
        sourceOptionsByProvider: OAUTH_SOURCE_OPTIONS_BY_PROVIDER,
        error: String(error),
      };
    }
  });

  registerHandle(
    "oauthRules:setProviderRules",
    async (_event, sourceKey: string, patterns: unknown) => {
      try {
        const normalizedSourceKey = normalizeOAuthSourceKey(sourceKey);
        if (!normalizedSourceKey) {
          return { success: false, error: "Invalid OAuth source key" };
        }

        const normalizedPatterns = sanitizeModelPatterns(patterns);
        const config = proxyManager.loadConfigFromYaml();
        const providerRules = normalizeOAuthExcludedModels(
          config?.["oauth-excluded-models"],
        );

        if (normalizedPatterns.length > 0) {
          providerRules[normalizedSourceKey] = normalizedPatterns;
        } else {
          delete providerRules[normalizedSourceKey];
        }

        const success = proxyManager.updateConfigYaml({
          "oauth-excluded-models": providerRules,
        });

        return { success, providerRules };
      } catch (error) {
        log.error(
          "[IPC] Failed to save provider OAuth exclusion rules:",
          error,
        );
        return { success: false, error: String(error) };
      }
    },
  );

  registerHandle(
    "oauthRules:setAccountRules",
    async (
      _event,
      sourceKey: string,
      accountKey: string,
      patterns: unknown,
    ) => {
      try {
        const normalizedSourceKey = normalizeOAuthSourceKey(sourceKey);
        if (!normalizedSourceKey) {
          return { success: false, error: "Invalid OAuth source key" };
        }

        const normalizedAccountKey = normalizeAccountKey(accountKey);
        if (!normalizedAccountKey) {
          return { success: false, error: "Invalid account key" };
        }

        const normalizedPatterns = sanitizeModelPatterns(patterns);
        const config = proxyManager.loadConfigFromYaml();
        const accountRules = normalizeOAuthAccountExcludedModels(
          config?.["oauth-account-excluded-models"],
        );
        const sourceRules = { ...(accountRules[normalizedSourceKey] || {}) };

        if (normalizedPatterns.length > 0) {
          sourceRules[normalizedAccountKey] = normalizedPatterns;
          accountRules[normalizedSourceKey] = sourceRules;
        } else {
          delete sourceRules[normalizedAccountKey];
          if (Object.keys(sourceRules).length > 0) {
            accountRules[normalizedSourceKey] = sourceRules;
          } else {
            delete accountRules[normalizedSourceKey];
          }
        }

        const success = proxyManager.updateConfigYaml({
          "oauth-account-excluded-models": accountRules,
        });

        if (!success) {
          return {
            success: false,
            error:
              "Failed to update config file (check permissions or YAML syntax)",
          };
        }

        return { success, accountRules };
      } catch (error) {
        log.error("[IPC] Failed to save account OAuth exclusion rules:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  registerHandle(
    "oauthRules:clearAccountRules",
    async (_event, sourceKey: string, accountKey: string) => {
      try {
        const normalizedSourceKey = normalizeOAuthSourceKey(sourceKey);
        if (!normalizedSourceKey) {
          return { success: false, error: "Invalid OAuth source key" };
        }

        const normalizedAccountKey = normalizeAccountKey(accountKey);
        if (!normalizedAccountKey) {
          return { success: false, error: "Invalid account key" };
        }

        const config = proxyManager.loadConfigFromYaml();
        const accountRules = normalizeOAuthAccountExcludedModels(
          config?.["oauth-account-excluded-models"],
        );

        const sourceRules = { ...(accountRules[normalizedSourceKey] || {}) };
        delete sourceRules[normalizedAccountKey];

        if (Object.keys(sourceRules).length > 0) {
          accountRules[normalizedSourceKey] = sourceRules;
        } else {
          delete accountRules[normalizedSourceKey];
        }

        const success = proxyManager.updateConfigYaml({
          "oauth-account-excluded-models": accountRules,
        });

        if (!success) {
          return {
            success: false,
            error:
              "Failed to update config file (check permissions or YAML syntax)",
          };
        }

        return { success, accountRules };
      } catch (error) {
        log.error(
          "[IPC] Failed to clear account OAuth exclusion rules:",
          error,
        );
        return { success: false, error: String(error) };
      }
    },
  );

  registerHandle("providers:getAccounts", async () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const accountRules = normalizeOAuthAccountExcludedModels(
        config?.["oauth-account-excluded-models"],
      );
      const authFiles = await managementAPI.listAuthFiles();
      const accounts = [];

      for (const authFile of authFiles) {
        const fileName = normalizeAuthFileName(
          authFile.name || authFile.id || "",
        );
        if (!fileName) continue;
        const providerId = resolveProviderId({
          provider: authFile.provider,
          type: authFile.type,
          accountType: authFile.account_type,
          name: fileName,
        });
        const email =
          (typeof authFile.email === "string" && authFile.email.trim()) ||
          (typeof authFile.account === "string" && authFile.account.trim()) ||
          fileName;
        const accountName =
          (typeof authFile.name === "string" && authFile.name.trim()) ||
          fileName;
        const accountKey = buildAccountKey(providerId, fileName);
        const tokenSourceKey =
          typeof authFile.source === "string" ? authFile.source : undefined;
        const disabled = authFile.disabled === true;
        const unavailable = authFile.unavailable === true;
        const statusValue =
          typeof authFile.status === "string"
            ? authFile.status.toLowerCase()
            : "";
        const isEnabled = !disabled;
        const isOnline =
          isEnabled && !unavailable && statusValue !== "disabled";
        const lastUsed =
          authFile.updated_at ||
          authFile.modtime ||
          authFile.created_at ||
          new Date().toISOString();

        const oauthSourceKey = resolveOAuthSourceKeyForAccount(
          providerId,
          accountKey,
          tokenSourceKey,
          accountRules,
        );

        accounts.push({
          id: `${providerId}-${fileName}`,
          provider: providerId,
          nickname: accountName,
          email,
          accountKey,
          oauthSourceKey,
          status: isOnline ? ("online" as const) : ("offline" as const),
          enabled: isEnabled,
          lastUsed,
          filePath: fileName,
        });
      }

      return { success: true, accounts };
    } catch (error) {
      log.error("[IPC] Failed to get provider accounts:", error);
      return { success: false, accounts: [], error: String(error) };
    }
  });

  registerHandle(
    "providers:removeAccount",
    async (_event, filePath: string) => {
      try {
        const name = normalizeAuthFileName(filePath);
        if (!name) {
          return { success: false, error: "Invalid auth file name" };
        }
        return await managementAPI.removeAuthFile(name);
      } catch (error) {
        log.error("[IPC] Failed to remove account:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  registerHandle(
    "providers:setAccountEnabled",
    async (_event, filePath: string, enabled: boolean) => {
      try {
        const name = normalizeAuthFileName(filePath);
        if (!name) {
          return { success: false, error: "Invalid auth file name" };
        }
        const result = await managementAPI.setAuthFileStatus(name, !enabled);
        if (!result.success) {
          return result;
        }
        return { success: true, filePath: name };
      } catch (error) {
        log.error("[IPC] Failed to toggle account enabled state:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  registerHandle(
    "providers:getAccountPreview",
    async (_event, filePath: string) => {
      try {
        const name = normalizeAuthFileName(filePath);
        if (!name) {
          return { success: false, error: "Invalid auth file name" };
        }

        const payload = await managementAPI.downloadAuthFile(name);
        return { success: true, payload };
      } catch (error) {
        log.error("[IPC] Failed to get account preview:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  registerHandle(
    "providers:updateAccountMetadata",
    async (
      _event,
      filePath: string,
      updates: {
        priority?: number;
        prefix?: string;
        proxyUrl?: string;
      },
    ) => {
      try {
        const name = normalizeAuthFileName(filePath);
        if (!name) {
          return { success: false, error: "Invalid auth file name" };
        }

        const payload = await managementAPI.downloadAuthFile(name);
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          return { success: false, error: "Invalid auth file payload" };
        }

        const next = {
          ...(payload as Record<string, unknown>),
        };

        if (
          typeof updates.priority === "number" &&
          Number.isFinite(updates.priority)
        ) {
          next.priority = Math.max(0, Math.floor(updates.priority));
        }

        if (typeof updates.prefix === "string") {
          const trimmedPrefix = updates.prefix.trim();
          if (trimmedPrefix) {
            next.prefix = trimmedPrefix;
          } else {
            delete next.prefix;
          }
        }

        if (typeof updates.proxyUrl === "string") {
          const trimmedProxyUrl = updates.proxyUrl.trim();
          if (trimmedProxyUrl) {
            next.proxy_url = trimmedProxyUrl;
          } else {
            delete next.proxy_url;
          }
        }

        return await managementAPI.uploadAuthFile(name, next);
      } catch (error) {
        log.error("[IPC] Failed to update account metadata:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  registerHandle(
    "providers:getAccountModels",
    async (_event, filePath: string) => {
      try {
        const name = normalizeAuthFileName(filePath);
        if (!name) {
          return {
            success: false,
            models: [],
            error: "Invalid auth file name",
          };
        }

        const models = await managementAPI.fetchAuthFileModels(name);
        return { success: true, models };
      } catch (error) {
        log.error("[IPC] Failed to get account models:", error);
        return { success: false, models: [], error: String(error) };
      }
    },
  );

  registerHandle(
    "providers:importOAuthFile",
    async (_event, fileName: string, payload: unknown) => {
      try {
        const name = normalizeAuthFileName(fileName);
        if (!isValidAuthFileName(name)) {
          return { success: false, error: "Invalid auth file name" };
        }
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          return { success: false, error: "Invalid auth JSON payload" };
        }
        return await managementAPI.uploadAuthFile(name, payload);
      } catch (error) {
        log.error("[IPC] Failed to import oauth auth file:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  registerHandle("qwen:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getQwenAuthUrl();
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get Qwen auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  registerHandle("antigravity:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getAntigravityAuthUrl();
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get Antigravity auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  registerHandle("iflow:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getIFlowAuthUrl();
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get iFlow auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  registerHandle("claude:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getClaudeAuthUrl();
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get Claude auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  registerHandle("gemini:getAuthUrl", async (_event, projectId?: string) => {
    try {
      const result = await managementAPI.getGeminiAuthUrl(projectId);
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get Gemini auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  registerHandle("codex:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getCodexAuthUrl();
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get Codex auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  registerHandle("copilot:getAuthUrl", async () => {
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

  registerHandle(
    "kiro:getAuthUrl",
    async (
      _event,
      params?: { method?: string; startUrl?: string; region?: string },
    ) => {
      try {
        const result = await managementAPI.getKiroAuthUrl(params);
        return result;
      } catch (error) {
        log.error("[IPC] Failed to get Kiro auth URL:", error);
        return { status: "error", url: "", state: "" };
      }
    },
  );

  registerHandle("kiro:getAuthStatus", async (_event, state: string) => {
    try {
      return await managementAPI.getKiroAuthStatus(state);
    } catch (error) {
      log.error("[IPC] Failed to get Kiro auth status:", error);
      return { status: "error" };
    }
  });

  registerHandle("qwen:getAuthStatus", async (_event, state: string) => {
    try {
      return await managementAPI.getQwenAuthStatus(state);
    } catch (error) {
      log.error("[IPC] Failed to get Qwen auth status:", error);
      return { status: "error" };
    }
  });

  registerHandle("kiro:import", async () => {
    try {
      const homeDir = app.getPath("home");
      const ssoDir = path.join(homeDir, ".aws", "sso", "cache");

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

      const result = await new Promise<{
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
            if (filePath) {
              log.info(`[IPC] Kiro token imported via cliproxy: ${filePath}`);
            } else {
              log.info("[IPC] Kiro token imported via cliproxy");
            }
            resolve({ success: true, filePath });
            return;
          }

          const message = (stderr || stdout).trim() || `Exit code ${code}`;
          resolve({ success: false, error: message });
        });
      });

      return result;
    } catch (error) {
      log.error("[IPC] Failed to import Kiro token:", error);
      return { success: false, error: String(error) };
    }
  });

  registerHandle("kiro:importFromToken", async (_event, tokenJson: string) => {
    try {
      if (!tokenJson || !tokenJson.trim()) {
        return { success: false, error: "Token JSON is required" };
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(tokenJson);
      } catch {
        return { success: false, error: "Invalid token JSON" };
      }

      const nestedToken =
        parsed.token && typeof parsed.token === "object"
          ? (parsed.token as Record<string, unknown>)
          : undefined;

      const accessToken =
        (typeof parsed.accessToken === "string" ? parsed.accessToken : "") ||
        (typeof parsed.access_token === "string" ? parsed.access_token : "") ||
        (nestedToken && typeof nestedToken.access_token === "string"
          ? nestedToken.access_token
          : "");

      const refreshToken =
        (typeof parsed.refreshToken === "string" ? parsed.refreshToken : "") ||
        (typeof parsed.refresh_token === "string"
          ? parsed.refresh_token
          : "") ||
        (nestedToken && typeof nestedToken.refresh_token === "string"
          ? nestedToken.refresh_token
          : "");

      if (!accessToken || !refreshToken) {
        return {
          success: false,
          error: "Token JSON must include accessToken and refreshToken",
        };
      }

      const authMethodRaw =
        (typeof parsed.authMethod === "string" ? parsed.authMethod : "") ||
        (typeof parsed.auth_method === "string" ? parsed.auth_method : "") ||
        "builder-id";
      const authMethod = authMethodRaw.toLowerCase();
      const safeAuthMethod =
        authMethod.replace(/[^a-z0-9-]/g, "") || "builder-id";

      const expiresAt =
        (typeof parsed.expiresAt === "string" ? parsed.expiresAt : "") ||
        (typeof parsed.expired === "string" ? parsed.expired : "") ||
        (nestedToken && typeof nestedToken.expiry === "string"
          ? nestedToken.expiry
          : "") ||
        new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const email =
        (typeof parsed.email === "string" ? parsed.email : "") ||
        (typeof parsed.username === "string" ? parsed.username : "");
      const safeEmail = email
        ? email.toLowerCase().replace(/[^a-z0-9._-]/g, "-")
        : "";

      const authDir = proxyManager.getAuthDir();
      if (!fs.existsSync(authDir)) {
        await fsp.mkdir(authDir, { recursive: true });
      }

      const randomId = crypto.randomBytes(8).toString("hex").toUpperCase();
      const destFilename = safeEmail
        ? `kiro-${safeAuthMethod}-${safeEmail}.json`
        : `kiro-${safeAuthMethod}-${randomId}.json`;
      const destPath = path.join(authDir, destFilename);

      const profileArn =
        (typeof parsed.profileArn === "string" ? parsed.profileArn : "") ||
        (typeof parsed.profile_arn === "string" ? parsed.profile_arn : "");
      const providerName =
        typeof parsed.provider === "string" ? parsed.provider : "AWS";

      const tokenData: Record<string, unknown> = {
        type: "kiro",
        provider: providerName,
        auth_method: authMethod,
        profile_arn: profileArn,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        disabled: false,
      };

      if (safeEmail) tokenData.email = safeEmail;
      if (typeof parsed.clientId === "string")
        tokenData.client_id = parsed.clientId;
      if (typeof parsed.clientSecret === "string") {
        tokenData.client_secret = parsed.clientSecret;
      }
      if (typeof parsed.clientIdHash === "string") {
        tokenData.client_id_hash = parsed.clientIdHash;
      }
      if (typeof parsed.startUrl === "string")
        tokenData.start_url = parsed.startUrl;
      if (typeof parsed.region === "string") tokenData.region = parsed.region;

      await fsp.writeFile(
        destPath,
        JSON.stringify(tokenData, null, 2),
        "utf-8",
      );
      log.info(`[IPC] Kiro token imported from input: ${destPath}`);

      return { success: true, filePath: destPath };
    } catch (error) {
      log.error(
        "[IPC] Failed to import Kiro token from input:",
        error instanceof Error ? error.message : String(error),
      );
      return { success: false, error: String(error) };
    }
  });

  registerHandle("kiro:refreshToken", async (_event, filePath: string) => {
    try {
      const tokens = await scanTokenFiles();
      const token = tokens.find((t) => t.filePath === filePath);

      if (!token) {
        return { success: false, error: "Token file not found" };
      }

      if (token.provider !== "kiro") {
        return { success: false, error: "Not a Kiro token file" };
      }

      return await refreshKiroTokenManually(token);
    } catch (error) {
      log.error(
        "[IPC] Failed to refresh Kiro token:",
        error instanceof Error ? error.message : String(error),
      );
      return { success: false, error: String(error) };
    }
  });
}
