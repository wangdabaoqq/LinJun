import path from "path";

import { app, ipcMain } from "electron";

import {
  detectAllCLITools,
  detectCLITool,
  readCLIConfig,
  testProxyConnection,
  writeConfig,
} from "../utils/cliDetector";
import log from "../utils/logger";
import { isPathSafe } from "../utils/validation";

export function setupCliHandlers(): void {
  ipcMain.handle("cli:detectAll", async () => {
    try {
      const tools = await detectAllCLITools();
      return { success: true, tools };
    } catch (error) {
      log.error("[IPC] Failed to detect CLI tools:", error);
      return { success: false, tools: [], error: String(error) };
    }
  });

  ipcMain.handle(
    "cli:detect",
    async (_event, toolName: string, command: string) => {
      try {
        const tool = await detectCLITool(toolName, command);
        return { success: true, tool };
      } catch (error) {
        log.error("[IPC] Failed to detect CLI tool:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("cli:readConfig", async (_event, toolName: string) => {
    try {
      const config = await readCLIConfig(toolName);
      return { success: true, config };
    } catch (error) {
      log.error("[IPC] Failed to read CLI config:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(
    "cli:writeConfig",
    async (
      _event,
      filePath: string,
      content: string,
      backup: boolean = true,
    ) => {
      try {
        const homeDir = app.getPath("home");
        const relativePath = path.isAbsolute(filePath)
          ? path.relative(homeDir, filePath)
          : filePath;
        if (!isPathSafe(homeDir, relativePath)) {
          log.warn(`[IPC] Rejected unsafe path: ${filePath}`);
          return { success: false, error: "Invalid file path" };
        }
        const result = await writeConfig(filePath, content, backup);
        return result;
      } catch (error) {
        log.error("[IPC] Failed to write CLI config:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle(
    "cli:testConnection",
    async (_event, url: string, apiKey?: string) => {
      try {
        const result = await testProxyConnection(url, apiKey);
        return result;
      } catch (error) {
        log.error("[IPC] Failed to test connection:", error);
        return { success: false, error: String(error) };
      }
    },
  );
}
