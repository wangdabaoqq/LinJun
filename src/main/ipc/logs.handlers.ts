import { ipcMain } from "electron";

import { deleteAllLogs, fetchRecentRequestLogs } from "../logging";
import log from "../utils/logger";

export function setupLogsHandlers(): void {
  ipcMain.handle("logs:request", async (_event, limit: number = 30) => {
    try {
      return await fetchRecentRequestLogs(limit);
    } catch (error) {
      log.error("[IPC] Failed to read request logs:", error);
      return {
        entries: [],
        diagnostics: {
          logDir: "",
          scannedDirs: [],
          compatibilityLogDirs: [],
          resolution: "config_dir",
          status: "read_error",
          error: String(error),
          totalFiles: 0,
          matchedFiles: 0,
          parsedFiles: 0,
          ignoredFiles: [],
        },
      };
    }
  });

  ipcMain.handle("logs:deleteAll", async () => {
    try {
      return await deleteAllLogs();
    } catch (error) {
      log.error("[IPC] Failed to delete logs:", error);
      return { success: false, error: String(error) };
    }
  });
}
