import log from "../utils/logger";

export function startKiroAutoRefresh(): void {
  log.info(
    "[KiroAutoRefresh] Disabled in LinJun. Kiro refresh is managed by CLIProxyAPIPlus.",
  );
}

export function stopKiroAutoRefresh(): void {}
