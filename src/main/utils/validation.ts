/**
 * Validation utilities for IPC handlers
 */

import path from "path";

/**
 * Validates API key format
 * - Must be non-empty
 * - Must be at least 8 characters
 * - Must only contain alphanumeric, hyphens, and underscores
 */
export function isValidApiKeyFormat(key: string): boolean {
  if (!key || typeof key !== "string") {
    return false;
  }

  const trimmed = key.trim();
  if (trimmed.length < 8) {
    return false;
  }

  // Allow alphanumeric, hyphens, underscores, and dots
  const validPattern = /^[a-zA-Z0-9_\-\.]+$/;
  return validPattern.test(trimmed);
}

/**
 * Validates API key for a specific provider
 */
export function validateApiKey(
  provider: string,
  apiKey: string,
): { valid: boolean; error?: string } {
  if (!provider || typeof provider !== "string" || !provider.trim()) {
    return { valid: false, error: "Provider is required" };
  }

  if (!apiKey || typeof apiKey !== "string") {
    return { valid: false, error: "API key is required" };
  }

  if (!isValidApiKeyFormat(apiKey)) {
    return {
      valid: false,
      error:
        "Invalid API key format. Key must be at least 8 characters and contain only alphanumeric characters, hyphens, underscores, or dots.",
    };
  }

  return { valid: true };
}

/**
 * Validates that a file path is safe (no path traversal)
 */
export function isPathSafe(basePath: string, userPath: string): boolean {
  if (!userPath || typeof userPath !== "string") {
    return false;
  }

  const normalizedBase = path.resolve(basePath);
  const normalizedUser = path.resolve(basePath, userPath);

  // Check that the resolved path starts with the base path
  return normalizedUser.startsWith(normalizedBase);
}

/**
 * Validates setting key against whitelist
 */
const ALLOWED_SETTINGS = [
  "port",
  "autoStart",
  "autoLaunch",
  "routingStrategy",
  "requestRetry",
  "maxRetryInterval",
  "loggingToFile",
  "managementSecret",
  "switchProject",
  "switchPreviewModel",
  "developerMode",
  "language",
  "theme",
] as const;

export type AllowedSettingKey = (typeof ALLOWED_SETTINGS)[number];

export function isValidSettingKey(key: string): key is AllowedSettingKey {
  return ALLOWED_SETTINGS.includes(key as AllowedSettingKey);
}
