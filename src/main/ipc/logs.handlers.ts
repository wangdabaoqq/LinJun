import { ipcMain } from "electron";

import { deleteAllLogs, readRecentRequestLogs } from "../logging";
import log from "../utils/logger";

export function setupLogsHandlers(): void {
  ipcMain.handle("logs:request", async (_event, limit: number = 30) => {
    try {
      return await readRecentRequestLogs(limit);
    } catch (error) {
      log.error("[IPC] Failed to read request logs:", error);
      return [];
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
