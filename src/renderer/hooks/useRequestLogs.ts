import { useEffect, useState, useCallback, useRef } from "react";
import log from "@renderer/utils/logger";
import {
  RequestLogDiagnostics,
  RequestLogEntry,
  RequestLogFetchResult,
} from "../types/logs";

function areLogsEqual(
  previous: RequestLogEntry[],
  next: RequestLogEntry[],
): boolean {
  if (previous.length === 0 && next.length === 0) {
    return true;
  }

  return (
    previous.length === next.length &&
    previous.length > 0 &&
    previous[0]?.id === next[0]?.id &&
    previous[previous.length - 1]?.id === next[next.length - 1]?.id
  );
}

function areDiagnosticsEqual(
  previous: RequestLogDiagnostics | null,
  next: RequestLogDiagnostics | null,
): boolean {
  if (previous === next) return true;
  if (!previous || !next) return false;

  return (
    previous.logDir === next.logDir &&
    previous.scannedDirs.join("|") === next.scannedDirs.join("|") &&
    previous.compatibilityLogDirs.join("|") ===
      next.compatibilityLogDirs.join("|") &&
    previous.writablePath === next.writablePath &&
    previous.resolution === next.resolution &&
    previous.status === next.status &&
    previous.error === next.error &&
    previous.totalFiles === next.totalFiles &&
    previous.matchedFiles === next.matchedFiles &&
    previous.parsedFiles === next.parsedFiles &&
    previous.ignoredFiles.join("|") === next.ignoredFiles.join("|")
  );
}

export function useRequestLogs(limit = 200, refreshInterval = 3000) {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [diagnostics, setDiagnostics] = useState<RequestLogDiagnostics | null>(
    null,
  );
  const prevLogsRef = useRef<RequestLogEntry[]>([]);
  const prevDiagnosticsRef = useRef<RequestLogDiagnostics | null>(null);
  const isFetchingRef = useRef(false);

  const fetchLogs = useCallback(async () => {
    if (!window.electronAPI?.logs?.fetch) return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      const result = (await window.electronAPI.logs.fetch(
        limit,
      )) as RequestLogFetchResult;
      const entries = Array.isArray(result) ? result : result.entries || [];
      const nextDiagnostics = Array.isArray(result) ? null : result.diagnostics;

      const logsUnchanged = areLogsEqual(prevLogsRef.current, entries);
      const diagnosticsUnchanged = areDiagnosticsEqual(
        prevDiagnosticsRef.current,
        nextDiagnostics,
      );

      if (logsUnchanged && diagnosticsUnchanged) {
        return;
      }

      if (!logsUnchanged) {
        prevLogsRef.current = entries;
        setLogs(entries);
      }

      if (!diagnosticsUnchanged) {
        prevDiagnosticsRef.current = nextDiagnostics;
        setDiagnostics(nextDiagnostics);
      }
    } catch (error) {
      log.error("[useRequestLogs] Failed to fetch logs", error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [limit]);

  useEffect(() => {
    fetchLogs();
    const timer = setInterval(fetchLogs, refreshInterval);
    return () => clearInterval(timer);
  }, [fetchLogs, refreshInterval]);

  return { logs, diagnostics, refresh: fetchLogs };
}
