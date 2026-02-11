import { useEffect, useState, useCallback, useRef } from "react";
import log from "@renderer/utils/logger";
import { RequestLogEntry } from "../types/logs";

export function useRequestLogs(limit = 200, refreshInterval = 3000) {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const prevLogsRef = useRef<RequestLogEntry[]>([]);
  const isFetchingRef = useRef(false);

  const fetchLogs = useCallback(async () => {
    if (!window.electronAPI?.logs?.fetch) return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      const entries = await window.electronAPI.logs.fetch(limit);

      // Diff comparison: skip setState if data hasn't changed
      const prev = prevLogsRef.current;
      if (
        prev.length === entries.length &&
        prev.length > 0 &&
        prev[0]?.id === entries[0]?.id &&
        prev[prev.length - 1]?.id === entries[entries.length - 1]?.id
      ) {
        return;
      }

      prevLogsRef.current = entries;
      setLogs(entries);
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

  return { logs, refresh: fetchLogs };
}
