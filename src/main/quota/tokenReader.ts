import fs from "fs";
import path from "path";
import os from "os";

export type ProviderType =
  | "codex"
  | "antigravity"
  | "claude"
  | "gemini"
  | "kiro"
  | "copilot"
  | "qwen"
  | "iflow"
  | "vertex";

export interface TokenFile {
  // Common fields
  access_token: string;
  refresh_token: string;
  email: string;
  expired: string;
  type: ProviderType;

  // Codex specific
  account_id?: string;
  id_token?: string;
  last_refresh?: string;

  // Antigravity specific
  project_id?: string;
  expires_in?: number;
  timestamp?: number;
  tier_id?: string;
  tier_name?: string;
  paid_tier_id?: string;
  paid_tier_name?: string;
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

/**
 * Get the CLI proxy API config directory path
 */
function getConfigDir(): string {
  return path.join(os.homedir(), ".cli-proxy-api");
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
    "vertex",
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
    const provider = parseProviderFromFilename(filename) || data.type;

    if (!provider || !data.access_token || !data.refresh_token) {
      console.warn(`[TokenReader] Invalid token file: ${filePath}`);
      return null;
    }

    return {
      provider,
      email: data.email || "unknown",
      accountId: data.account_id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expired: new Date(data.expired),
      filePath,
      raw: data,
    };
  } catch (error) {
    console.error(
      `[TokenReader] Failed to read token file: ${filePath}`,
      error,
    );
    return null;
  }
}

/**
 * Scan the config directory and return all token files
 */
export function scanTokenFiles(): TokenReadResult[] {
  const configDir = getConfigDir();

  if (!fs.existsSync(configDir)) {
    console.warn(`[TokenReader] Config directory not found: ${configDir}`);
    return [];
  }

  const files = fs.readdirSync(configDir);
  const tokenFiles: TokenReadResult[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(configDir, file);
    const stat = fs.statSync(filePath);

    if (!stat.isFile()) continue;

    const result = readTokenFile(filePath);
    if (result) {
      tokenFiles.push(result);
    }
  }

  console.log(`[TokenReader] Found ${tokenFiles.length} token files`);
  return tokenFiles;
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
    console.log(`[TokenReader] Updated token file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(
      `[TokenReader] Failed to update token file: ${filePath}`,
      error,
    );
    return false;
  }
}
