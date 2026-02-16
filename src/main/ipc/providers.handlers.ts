import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

import { app, ipcMain } from "electron";

import { managementAPI } from "../proxy/api";
import { proxyManager } from "../proxy/manager";
import {
  isKiroRefreshBlocked,
  isKiroTokenValid,
  refreshKiroTokenManually,
  scanProviderTokenFiles,
  scanTokenFiles,
} from "../quota";
import log from "../utils/logger";
import { isPathSafe, validateApiKey } from "../utils/validation";

import {
  OAuthAccountExcludedModelsConfig,
  OAuthExcludedModelsConfig,
  OAUTH_SOURCE_OPTIONS_BY_PROVIDER,
} from "./types";

function getManagedAuthDirs(): {
  activeAuthDir: string;
  disabledAuthDir: string;
} {
  const config = proxyManager.loadConfigFromYaml();
  const activeAuthDir = config?.["auth-dir"] || proxyManager.getAuthDir();
  const disabledAuthDir = path.join(
    path.dirname(activeAuthDir),
    "auth-disabled",
  );
  return { activeAuthDir, disabledAuthDir };
}

function isTokenPathInDirectory(filePath: string, baseDir: string): boolean {
  const relativePath = path.relative(baseDir, filePath);
  return isPathSafe(baseDir, relativePath);
}

async function moveTokenFileToDirectory(
  sourcePath: string,
  targetDir: string,
): Promise<string> {
  if (!fs.existsSync(targetDir)) {
    await fsp.mkdir(targetDir, { recursive: true });
  }

  const sourceName = path.basename(sourcePath);
  let targetPath = path.join(targetDir, sourceName);

  if (fs.existsSync(targetPath)) {
    const ext = path.extname(sourceName);
    const base = path.basename(sourceName, ext);
    const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    targetPath = path.join(targetDir, `${base}-${suffix}${ext}`);
  }

  try {
    await fsp.rename(sourcePath, targetPath);
  } catch {
    await fsp.copyFile(sourcePath, targetPath);
    await fsp.unlink(sourcePath);
  }

  return targetPath;
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
  if (normalizedTokenSourceKey) {
    return normalizedTokenSourceKey;
  }

  const sourceOptions = OAUTH_SOURCE_OPTIONS_BY_PROVIDER[providerId] || [];
  return sourceOptions[0];
}

function buildAccountKey(providerId: string, filePath: string): string {
  return `${providerId}:${path.basename(filePath)}`;
}

export function setupProvidersHandlers(): void {
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

  ipcMain.handle("oauthRules:get", async () => {
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

  ipcMain.handle(
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

  ipcMain.handle(
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

  ipcMain.handle(
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

  ipcMain.handle("providers:getAccounts", async () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const accountRules = normalizeOAuthAccountExcludedModels(
        config?.["oauth-account-excluded-models"],
      );
      const tokens = await scanProviderTokenFiles();
      const accounts = [];

      for (const token of tokens) {
        if (token.enabled && token.provider === "kiro") {
          if (isKiroRefreshBlocked(token.filePath)) {
            continue;
          }
          const isValid = await isKiroTokenValid(token);
          if (!isValid) {
            log.info(`[IPC] Skipping expired Kiro account: ${token.filePath}`);
            continue;
          }
        }

        const accountKey =
          token.accountKey || buildAccountKey(token.provider, token.filePath);
        const oauthSourceKey = resolveOAuthSourceKeyForAccount(
          token.provider,
          accountKey,
          token.oauthSourceKey,
          accountRules,
        );

        accounts.push({
          id: `${token.provider}-${token.email}`,
          provider: token.provider,
          email: token.email,
          accountKey,
          oauthSourceKey,
          status: token.enabled ? ("online" as const) : ("offline" as const),
          enabled: token.enabled,
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
        const { activeAuthDir, disabledAuthDir } = getManagedAuthDirs();
        const isInActiveDir = isTokenPathInDirectory(filePath, activeAuthDir);
        const isInDisabledDir = isTokenPathInDirectory(
          filePath,
          disabledAuthDir,
        );

        if (!isInActiveDir && !isInDisabledDir) {
          log.warn(
            `[IPC] Rejected unsafe path for account removal: ${filePath}`,
          );
          return { success: false, error: "Invalid file path" };
        }
        if (fs.existsSync(filePath)) {
          await fsp.unlink(filePath);
          return { success: true };
        }
        return { success: false, error: "Token file not found" };
      } catch (error) {
        log.error("[IPC] Failed to remove account:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(
    "providers:setAccountEnabled",
    async (_event, filePath: string, enabled: boolean) => {
      try {
        const { activeAuthDir, disabledAuthDir } = getManagedAuthDirs();
        const sourceDir = enabled ? disabledAuthDir : activeAuthDir;
        const targetDir = enabled ? activeAuthDir : disabledAuthDir;

        if (!isTokenPathInDirectory(filePath, sourceDir)) {
          log.warn(
            `[IPC] Rejected unsafe path for account toggle: ${filePath}`,
          );
          return { success: false, error: "Invalid file path" };
        }

        if (!fs.existsSync(filePath)) {
          return { success: false, error: "Token file not found" };
        }

        const nextPath = await moveTokenFileToDirectory(filePath, targetDir);
        return { success: true, filePath: nextPath };
      } catch (error) {
        log.error("[IPC] Failed to toggle account enabled state:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("qwen:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getQwenAuthUrl();
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get Qwen auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("antigravity:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getAntigravityAuthUrl();
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get Antigravity auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("iflow:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getIFlowAuthUrl();
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get iFlow auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("claude:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getClaudeAuthUrl();
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get Claude auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("gemini:getAuthUrl", async (_event, projectId?: string) => {
    try {
      const result = await managementAPI.getGeminiAuthUrl(projectId);
      return result;
    } catch (error) {
      log.error("[IPC] Failed to get Gemini auth URL:", error);
      return { status: "error", url: "", state: "" };
    }
  });

  ipcMain.handle("codex:getAuthUrl", async () => {
    try {
      const result = await managementAPI.getCodexAuthUrl();
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

  ipcMain.handle(
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

  ipcMain.handle("kiro:getAuthStatus", async (_event, state: string) => {
    try {
      return await managementAPI.getKiroAuthStatus(state);
    } catch (error) {
      log.error("[IPC] Failed to get Kiro auth status:", error);
      return { status: "error" };
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

  ipcMain.handle("kiro:importFromToken", async (_event, tokenJson: string) => {
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

  ipcMain.handle("kiro:refreshToken", async (_event, filePath: string) => {
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
