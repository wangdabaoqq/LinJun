import { useEffect, useState, useCallback } from "react";
import log from "@renderer/utils/logger";
import { RequestLogEntry } from "../types/logs";

export function useRequestLogs(limit = 50, refreshInterval = 2000) {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);

  const fetchLogs = useCallback(async () => {
    if (!window.electronAPI?.logs?.fetch) return;
    try {
      const entries = await window.electronAPI.logs.fetch(limit);
      setLogs(entries);
    } catch (error) {
      log.error("[useRequestLogs] Failed to fetch logs", error);
    }
  }, [limit]);

  useEffect(() => {
    fetchLogs();
    const timer = setInterval(fetchLogs, refreshInterval);
    return () => clearInterval(timer);
  }, [fetchLogs, refreshInterval]);

  return { logs, refresh: fetchLogs };
}
