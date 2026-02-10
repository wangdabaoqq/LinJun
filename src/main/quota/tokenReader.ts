import fs from "fs";
import path from "path";

import log from "../utils/logger";
import { proxyManager } from "../proxy/manager";

function getAuthDir(): string {
  const config = proxyManager.loadConfigFromYaml();
  if (config?.["auth-dir"]) {
    return config["auth-dir"];
  }
  return proxyManager.getAuthDir();
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
  id_token?: string;
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
}

export interface TokenReadResult {
  provider: ProviderType;
  email: string;
  accountId?: string;
  accessToken: string;
  refreshToken: string;
  expired: Date;
  filePath: string;
  raw: TokenFile;
}

export function scanTokenFiles(): TokenReadResult[] {
  const authDir = getAuthDir();

  if (!fs.existsSync(authDir)) {
    log.warn(`[TokenReader] Auth directory not found: ${authDir}`);
    return [];
  }

  const files = fs.readdirSync(authDir);
  const tokenFiles: TokenReadResult[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(authDir, file);
    const stat = fs.statSync(filePath);

    if (!stat.isFile()) continue;

    const result = readTokenFile(filePath);
    if (result) {
      tokenFiles.push(result);
    }
  }

  log.info(
    `[TokenReader] Found ${tokenFiles.length} token files in ${authDir}`,
  );
  return tokenFiles;
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

/**
 * Read and parse a single token file
 */
function readTokenFile(filePath: string): TokenReadResult | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data: TokenFile = JSON.parse(content);
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
    if (!provider || !accessToken || (!refreshToken && !isCopilot)) {
      log.warn(`[TokenReader] Invalid token file: ${filePath}`);
      return null;
    }

    return {
      provider,
      email: data.email || data.username || path.basename(filePath, ".json"),
      accountId: data.account_id,
      accessToken,
      refreshToken: refreshToken || "",
      expired: expiredStr ? new Date(expiredStr) : new Date(),
      filePath,
      raw: data,
    };
  } catch (error) {
    log.error(`[TokenReader] Failed to read token file: ${filePath}`, error);
    return null;
  }
}

/**
 * Get tokens filtered by provider type
 */
export function getTokensByProvider(provider: ProviderType): TokenReadResult[] {
  return scanTokenFiles().filter((t) => t.provider === provider);
}

/**
 * Get unique providers with account counts
 */
export function getProviderSummary(): Array<{
  provider: ProviderType;
  accountCount: number;
}> {
  const tokens = scanTokenFiles();
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
export function updateTokenFile(
  filePath: string,
  updates: Partial<TokenFile>,
): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data: TokenFile = JSON.parse(content);

    const updatedData = {
      ...data,
      ...updates,
      last_refresh: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), "utf-8");
    log.info(`[TokenReader] Updated token file: ${filePath}`);
    return true;
  } catch (error) {
    log.error(`[TokenReader] Failed to update token file: ${filePath}`, error);
    return false;
  }
}
