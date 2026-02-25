import fs from "fs";
import fsp from "fs/promises";
import path from "path";

import { managementAPI } from "../proxy/api";
import log from "../utils/logger";
import { proxyManager } from "../proxy/manager";

function getActiveAuthDir(): string {
  const config = proxyManager.loadConfigFromYaml();
  if (config?.["auth-dir"]) {
    return config["auth-dir"];
  }
  return proxyManager.getAuthDir();
}

function getDisabledAuthDir(activeAuthDir: string): string {
  return path.join(path.dirname(activeAuthDir), "auth-disabled");
}

export type ProviderType =
  | "codex"
  | "antigravity"
  | "claude"
  | "gemini"
  | "kiro"
  | "copilot"
  | "qwen"
  | "iflow"
  | "custom";

export interface TokenFile {
  // Common fields
  access_token?: string;
  refresh_token?: string;
  email?: string;
  expired?: string;
  expires_at?: string;
  type?: ProviderType | "github-copilot";

  // Gemini
  token?: {
    access_token: string;
    refresh_token: string;
    expiry?: string;
  };
  project_id?: string;

  // Codex specific
  account_id?: string;
  id_token?:
    | string
    | {
        chatgpt_account_id?: string;
      };
  last_refresh?: string;

  // Antigravity specific
  expires_in?: number;
  timestamp?: number;
  tier_id?: string;
  tier_name?: string;
  paid_tier_id?: string;
  paid_tier_name?: string;

  // Kiro specific (camelCase)
  accessToken?: string;
  refreshToken?: string;
  profileArn?: string;
  expiresAt?: string;
  authMethod?: string;
  provider?: string;

  // GitHub Copilot specific
  token_type?: string;
  scope?: string;
  username?: string;

  "oauth-source"?: string;
  oauth_source?: string;
  auth_index?: string;
  authIndex?: string;
}

export interface TokenReadResult {
  provider: ProviderType;
  email: string;
  accountKey: string;
  accountId?: string;
  oauthSourceKey?: string;
  authIndex?: string;
  accessToken: string;
  refreshToken: string;
  expired: Date;
  filePath: string;
  enabled: boolean;
  raw: TokenFile;
}

export async function scanTokenFiles(): Promise<TokenReadResult[]> {
  return await readTokenFilesFromManagement();
}

export async function scanProviderTokenFiles(): Promise<TokenReadResult[]> {
  const activeAuthDir = getActiveAuthDir();
  const disabledAuthDir = getDisabledAuthDir(activeAuthDir);

  const activeTokens = await readTokenFilesFromDir(activeAuthDir, true, true);
  const disabledTokens = await readTokenFilesFromDir(
    disabledAuthDir,
    false,
    false,
  );

  log.info(
    `[TokenReader] Provider token scan active=${activeTokens.length}, disabled=${disabledTokens.length}`,
  );

  return [...activeTokens, ...disabledTokens];
}

async function readTokenFilesFromDir(
  authDir: string,
  enabled: boolean,
  warnIfMissing: boolean,
): Promise<TokenReadResult[]> {
  if (!fs.existsSync(authDir)) {
    if (warnIfMissing) {
      log.warn(`[TokenReader] Auth directory not found: ${authDir}`);
    }
    return [];
  }

  const files = await fsp.readdir(authDir);
  const tokenFiles: TokenReadResult[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(authDir, file);
    const stat = await fsp.stat(filePath);

    if (!stat.isFile()) continue;

    const result = await readTokenFile(filePath, enabled);
    if (result) {
      tokenFiles.push(result);
    }
  }

  log.info(
    `[TokenReader] Found ${tokenFiles.length} token files in ${authDir} (enabled=${enabled})`,
  );
  return tokenFiles;
}

function parseTokenPayload(payload: unknown): TokenFile | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const recordPayload = payload as Record<string, unknown>;
  const nested = recordPayload.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as TokenFile;
  }

  return payload as TokenFile;
}

async function readTokenFilesFromManagement(): Promise<TokenReadResult[]> {
  try {
    const authFiles = await managementAPI.listAuthFiles();
    const remoteTokens: TokenReadResult[] = [];

    for (const authFile of authFiles) {
      const name =
        (typeof authFile.name === "string" && authFile.name.trim()) ||
        (typeof authFile.id === "string" && authFile.id.trim()) ||
        "";
      if (!name.endsWith(".json")) {
        continue;
      }
      if (authFile.disabled === true) {
        continue;
      }

      const payload = await managementAPI.downloadAuthFile(name);
      const tokenData = parseTokenPayload(payload);
      if (!tokenData) {
        continue;
      }

      const remoteFilePath =
        (typeof authFile.path === "string" && authFile.path.trim()) ||
        path.join(getActiveAuthDir(), name);

      const parsed = parseTokenFileData(
        remoteFilePath,
        tokenData,
        true,
        authFile.auth_index,
        authFile.email || authFile.account || authFile.label,
        getAuthFileAccountId(authFile),
      );
      if (parsed) {
        remoteTokens.push(parsed);
      }
    }

    if (remoteTokens.length > 0) {
      log.info(
        `[TokenReader] Loaded ${remoteTokens.length} token files from management auth-files`,
      );
    }

    return remoteTokens;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    log.warn("[TokenReader] Failed to read management auth-files:", error);
    throw new Error(
      `Management auth-files unavailable: ${reason}. Ensure CLIProxyAPIPlus is running and management API is reachable.`,
    );
  }
}

function getAuthFileAccountId(authFile: {
  id_token?: unknown;
}): string | undefined {
  const maybeIdToken = authFile.id_token;
  if (!maybeIdToken || typeof maybeIdToken !== "object") {
    return undefined;
  }

  const chatgptAccountId = (maybeIdToken as { chatgpt_account_id?: unknown })
    .chatgpt_account_id;
  if (typeof chatgptAccountId !== "string") {
    return undefined;
  }

  const trimmed = chatgptAccountId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseTokenFileData(
  filePath: string,
  data: TokenFile,
  enabled: boolean,
  authIndex?: string,
  fallbackEmail?: string,
  fallbackAccountId?: string,
): TokenReadResult | null {
  const filename = path.basename(filePath);
  const provider: ProviderType | null =
    parseProviderFromFilename(filename) ||
    (data.type === "github-copilot" ? "copilot" : data.type) ||
    null;

  const accessToken =
    data.access_token || data.token?.access_token || data.accessToken;
  const refreshToken =
    data.refresh_token || data.token?.refresh_token || data.refreshToken;
  const expiredStr =
    data.expired || data.expires_at || data.token?.expiry || data.expiresAt;

  const isCopilot = provider === "copilot";
  const requiresRefreshToken = provider === "kiro";
  if (
    !provider ||
    !accessToken ||
    (requiresRefreshToken && !refreshToken && !isCopilot)
  ) {
    log.warn(`[TokenReader] Invalid token file: ${filePath}`);
    return null;
  }

  const oauthSourceKey =
    sanitizeOAuthSourceKey(data["oauth-source"] || data.oauth_source) ||
    getDefaultOAuthSourceKey(provider);
  const resolvedAuthIndex =
    authIndex || data.auth_index || data.authIndex || undefined;
  const normalizedFallbackEmail =
    typeof fallbackEmail === "string" && fallbackEmail.trim()
      ? fallbackEmail.trim()
      : undefined;

  return {
    provider,
    email:
      data.email ||
      data.username ||
      normalizedFallbackEmail ||
      path.basename(filePath, ".json"),
    accountKey: buildAccountKey(provider, filePath),
    accountId: fallbackAccountId || data.account_id,
    oauthSourceKey,
    authIndex: resolvedAuthIndex,
    accessToken,
    refreshToken: refreshToken || "",
    expired: expiredStr ? new Date(expiredStr) : new Date(),
    filePath,
    enabled,
    raw: data,
  };
}

/**
 * Parse provider type from filename
 * Examples:
 *   codex-wangdabao221@outlook.com-Plus.json -> codex
 *   antigravity-wangdabao221_gmail_com.json -> antigravity
 *   kiro-google-EHGA3GRVQMUK.json -> kiro
 */
function parseProviderFromFilename(filename: string): ProviderType | null {
  const providers: ProviderType[] = [
    "codex",
    "antigravity",
    "claude",
    "gemini",
    "kiro",
    "copilot",
    "qwen",
    "iflow",
  ];

  for (const provider of providers) {
    if (filename.toLowerCase().startsWith(provider)) {
      return provider;
    }
  }
  return null;
}

function getDefaultOAuthSourceKey(provider: ProviderType): string | undefined {
  if (provider === "gemini") return "gemini-cli";
  if (provider === "claude") return "claude";
  if (provider === "codex") return "codex";
  if (provider === "qwen") return "qwen";
  if (provider === "iflow") return "iflow";
  if (provider === "antigravity") return "antigravity";
  if (provider === "copilot") return "copilot";
  if (provider === "kiro") return "kiro";
  return undefined;
}

function sanitizeOAuthSourceKey(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const source = value.trim().toLowerCase();
  if (!source) return undefined;
  if (!/^[a-z0-9-]+$/.test(source)) return undefined;
  return source;
}

function buildAccountKey(provider: ProviderType, filePath: string): string {
  return `${provider}:${path.basename(filePath)}`;
}

/**
 * Read and parse a single token file
 */
async function readTokenFile(
  filePath: string,
  enabled: boolean,
): Promise<TokenReadResult | null> {
  try {
    const content = await fsp.readFile(filePath, "utf-8");
    const data: TokenFile = JSON.parse(content);
    return parseTokenFileData(filePath, data, enabled);
  } catch (error) {
    log.error(`[TokenReader] Failed to read token file: ${filePath}`, error);
    return null;
  }
}

/**
 * Get tokens filtered by provider type
 */
export async function getTokensByProvider(
  provider: ProviderType,
): Promise<TokenReadResult[]> {
  const tokens = await scanTokenFiles();
  return tokens.filter((t) => t.provider === provider);
}

/**
 * Get unique providers with account counts
 */
export async function getProviderSummary(): Promise<
  Array<{
    provider: ProviderType;
    accountCount: number;
  }>
> {
  const tokens = await scanTokenFiles();
  const providerMap = new Map<ProviderType, number>();

  for (const token of tokens) {
    const count = providerMap.get(token.provider) || 0;
    providerMap.set(token.provider, count + 1);
  }

  return Array.from(providerMap.entries()).map(([provider, accountCount]) => ({
    provider,
    accountCount,
  }));
}

/**
 * Update a token file with new token data
 */
export async function updateTokenFile(
  filePath: string,
  updates: Partial<TokenFile>,
): Promise<boolean> {
  try {
    const content = await fsp.readFile(filePath, "utf-8");
    const data: TokenFile = JSON.parse(content);

    const updatedData = {
      ...data,
      ...updates,
      last_refresh: new Date().toISOString(),
    };

    await fsp.writeFile(
      filePath,
      JSON.stringify(updatedData, null, 2),
      "utf-8",
    );
    log.info(`[TokenReader] Updated token file: ${filePath}`);
    return true;
  } catch (error) {
    log.error(`[TokenReader] Failed to update token file: ${filePath}`, error);
    return false;
  }
}
