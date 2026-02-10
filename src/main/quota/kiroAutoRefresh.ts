import log from "../utils/logger";

import { scanTokenFiles, TokenReadResult } from "./tokenReader";
import { isKiroRefreshBlocked, refreshKiroTokenManually } from "./kiroService";

const KIRO_REFRESH_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const KIRO_REFRESH_EARLY_WINDOW_MS = 10 * 60 * 1000;

let kiroRefreshInterval: ReturnType<typeof setInterval> | null = null;
const kiroRefreshInFlight = new Set<string>();

function shouldRefreshKiroToken(
  token: TokenReadResult,
  nowMs: number,
): boolean {
  const expMs = token.expired?.getTime?.();
  if (!Number.isFinite(expMs)) return true;
  return expMs - nowMs <= KIRO_REFRESH_EARLY_WINDOW_MS;
}

async function refreshKiroTokensOnce(): Promise<void> {
  const nowMs = Date.now();
  const tokens = scanTokenFiles().filter((t) => t.provider === "kiro");

  for (const token of tokens) {
    if (!shouldRefreshKiroToken(token, nowMs)) continue;
    if (isKiroRefreshBlocked(token.filePath)) continue;
    if (kiroRefreshInFlight.has(token.filePath)) continue;

    kiroRefreshInFlight.add(token.filePath);
    try {
      const result = await refreshKiroTokenManually(token);
      if (result.success) {
        log.info(`[KiroAutoRefresh] Refreshed token: ${token.filePath}`);
      } else {
        log.warn(
          `[KiroAutoRefresh] Failed to refresh token ${token.filePath}: ${result.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      log.error(
        `[KiroAutoRefresh] Unexpected error refreshing ${token.filePath}: ${String(error)}`,
      );
    } finally {
      kiroRefreshInFlight.delete(token.filePath);
    }
  }
}

export function startKiroAutoRefresh(): void {
  if (kiroRefreshInterval) return;

  // Kick off once on start.
  refreshKiroTokensOnce().catch((error) => {
    log.error("[KiroAutoRefresh] Initial refresh failed:", String(error));
  });

  kiroRefreshInterval = setInterval(() => {
    refreshKiroTokensOnce().catch((error) => {
      log.error("[KiroAutoRefresh] Periodic refresh failed:", String(error));
    });
  }, KIRO_REFRESH_CHECK_INTERVAL_MS);
}

export function stopKiroAutoRefresh(): void {
  if (!kiroRefreshInterval) return;
  clearInterval(kiroRefreshInterval);
  kiroRefreshInterval = null;
  kiroRefreshInFlight.clear();
}
