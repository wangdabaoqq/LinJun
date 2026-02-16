import { ipcMain } from "electron";

import { proxyManager } from "../proxy/manager";
import log from "../utils/logger";

export function setupApiKeysHandlers(): void {
  ipcMain.handle("apiKeys:getAll", () => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      const apiKeys = config?.["api-keys"] || [];
      return { success: true, keys: apiKeys };
    } catch (error) {
      log.error("[IPC] Failed to get API keys:", error);
      return { success: false, keys: [], error: String(error) };
    }
  });

  ipcMain.handle("apiKeys:add", (_event, key: string) => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      if (!config) {
        return { success: false, error: "Failed to load config" };
      }

      const currentKeys = config["api-keys"] || [];
      if (currentKeys.includes(key)) {
        return { success: false, error: "Key already exists" };
      }

      const newKeys = [...currentKeys, key];
      const success = proxyManager.updateConfigYaml({ "api-keys": newKeys });
      return { success, keys: newKeys };
    } catch (error) {
      log.error("[IPC] Failed to add API key:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("apiKeys:update", (_event, oldKey: string, newKey: string) => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      if (!config) {
        return { success: false, error: "Failed to load config" };
      }

      const currentKeys = config["api-keys"] || [];
      const index = currentKeys.indexOf(oldKey);
      if (index === -1) {
        return { success: false, error: "Key not found" };
      }

      if (oldKey !== newKey && currentKeys.includes(newKey)) {
        return { success: false, error: "New key already exists" };
      }

      const newKeys = [...currentKeys];
      newKeys[index] = newKey;
      const success = proxyManager.updateConfigYaml({ "api-keys": newKeys });
      return { success, keys: newKeys };
    } catch (error) {
      log.error("[IPC] Failed to update API key:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("apiKeys:delete", (_event, key: string) => {
    try {
      const config = proxyManager.loadConfigFromYaml();
      if (!config) {
        return { success: false, error: "Failed to load config" };
      }

      const currentKeys = config["api-keys"] || [];
      const newKeys = currentKeys.filter((k: string) => k !== key);

      if (newKeys.length === currentKeys.length) {
        return { success: false, error: "Key not found" };
      }

      const success = proxyManager.updateConfigYaml({ "api-keys": newKeys });
      return { success, keys: newKeys };
    } catch (error) {
      log.error("[IPC] Failed to delete API key:", error);
      return { success: false, error: String(error) };
    }
  });
}
