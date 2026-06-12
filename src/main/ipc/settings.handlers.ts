import { app, ipcMain, shell } from "electron";

import { proxyManager } from "../proxy/manager";
import { checkForUpdates } from "../update/checker";
import { setAutoLaunch } from "../utils/autoLaunch";
import log from "../utils/logger";
import { store } from "../utils/store";
import { isValidSettingKey } from "../utils/validation";

export function setupSettingsHandlers(): void {
  ipcMain.handle("settings:get", (_event, key: string) => {
    if (!isValidSettingKey(key)) {
      log.warn(`[IPC] Attempted to get invalid setting key: ${key}`);
      return undefined;
    }
    return store.get(key as keyof typeof store.store);
  });

  ipcMain.handle("settings:set", (_event, key: string, value: unknown) => {
    if (!isValidSettingKey(key)) {
      log.warn(`[IPC] Attempted to set invalid setting key: ${key}`);
      return { success: false, error: "Invalid setting key" };
    }
    store.set(key as keyof typeof store.store, value);
    return { success: true };
  });

  ipcMain.handle("settings:getAll", () => {
    const storeData = store.store;
    const config = proxyManager.loadConfigFromYaml();

    return {
      ...storeData,
      port: config?.port ?? storeData.port,
      host: config?.host ?? storeData.host ?? "",
      proxyUrl: config?.["proxy-url"] ?? storeData.proxyUrl ?? "",
      allowRemote: config?.["remote-management"]?.["allow-remote"] ?? false,
      routingStrategy: config?.routing?.strategy ?? storeData.routingStrategy,
      requestRetry: config?.["request-retry"] ?? storeData.requestRetry ?? 3,
      maxRetryInterval:
        config?.["max-retry-interval"] ?? storeData.maxRetryInterval ?? 30,
      loggingToFile:
        config?.["logging-to-file"] ?? storeData.loggingToFile ?? false,
      proxyRunning: proxyManager.isRunning(),
    };
  });

  ipcMain.handle(
    "settings:syncToYaml",
    (
      _event,
      updates: {
        port?: number;
        host?: string;
        proxyUrl?: string;
        apiKey?: string;
        allowRemote?: boolean;
        routingStrategy?: "round-robin" | "fill-first";
        requestRetry?: number;
        maxRetryInterval?: number;
        loggingToFile?: boolean;
        managementSecret?: string;
        switchProject?: boolean;
        switchPreviewModel?: boolean;
      },
    ) => {
      try {
        const yamlUpdates: Record<string, unknown> = {};

        if (updates.port !== undefined) {
          yamlUpdates.port = updates.port;
          store.set("port", updates.port);
        }

        if (updates.host !== undefined) {
          yamlUpdates.host = updates.host;
          store.set("host", updates.host);
        }

        if (updates.proxyUrl !== undefined) {
          const proxyUrl = updates.proxyUrl.trim();
          yamlUpdates["proxy-url"] = proxyUrl;
          store.set("proxyUrl", proxyUrl);
        }

        if (updates.apiKey !== undefined) {
          yamlUpdates["api-keys"] = [updates.apiKey];
        }

        if (updates.routingStrategy !== undefined) {
          yamlUpdates.routing = { strategy: updates.routingStrategy };
          store.set("routingStrategy", updates.routingStrategy);
        }

        if (updates.requestRetry !== undefined) {
          yamlUpdates["request-retry"] = updates.requestRetry;
          store.set("requestRetry", updates.requestRetry);
        }

        if (updates.maxRetryInterval !== undefined) {
          yamlUpdates["max-retry-interval"] = updates.maxRetryInterval;
          store.set("maxRetryInterval", updates.maxRetryInterval);
        }

        if (updates.loggingToFile !== undefined) {
          yamlUpdates["logging-to-file"] = updates.loggingToFile;
          store.set("loggingToFile", updates.loggingToFile);
        }

        if (
          updates.allowRemote !== undefined ||
          updates.managementSecret !== undefined
        ) {
          const currentRemoteMgmt =
            proxyManager.loadConfigFromYaml()?.["remote-management"] || {};
          yamlUpdates["remote-management"] = {
            ...currentRemoteMgmt,
            ...(updates.allowRemote !== undefined && {
              "allow-remote": updates.allowRemote,
            }),
            ...(updates.managementSecret !== undefined && {
              "secret-key": updates.managementSecret,
            }),
          };
        }

        if (
          updates.switchProject !== undefined ||
          updates.switchPreviewModel !== undefined
        ) {
          const currentConfig = proxyManager.loadConfigFromYaml();
          const currentQuotaExceeded = currentConfig?.["quota-exceeded"] || {};
          yamlUpdates["quota-exceeded"] = {
            ...currentQuotaExceeded,
            ...(updates.switchProject !== undefined && {
              "switch-project": updates.switchProject,
            }),
            ...(updates.switchPreviewModel !== undefined && {
              "switch-preview-model": updates.switchPreviewModel,
            }),
          };
        }

        if (updates.managementSecret !== undefined) {
          log.info(
            "[IPC] Setting managementSecret, yamlUpdates:",
            JSON.stringify(yamlUpdates, null, 2),
          );
          store.set("managementSecret", updates.managementSecret);
        }

        log.info(
          "[IPC] Calling updateConfigYaml with:",
          JSON.stringify(yamlUpdates, null, 2),
        );
        const success = proxyManager.updateConfigYaml(yamlUpdates);
        log.info("[IPC] updateConfigYaml result:", success);
        return { success };
      } catch (error) {
        log.error("[IPC] Failed to sync settings to YAML:", error);
        return { success: false, error: String(error) };
      }
    },
  );

  ipcMain.handle("settings:setAutoLaunch", (_event, enabled: boolean) => {
    try {
      setAutoLaunch(enabled);
      store.set("autoLaunch", enabled);
      return { success: true };
    } catch (error) {
      log.error("[IPC] Failed to set auto launch:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });

  ipcMain.handle("app:getHomeDir", () => {
    try {
      return { success: true, homeDir: app.getPath("home") };
    } catch (error) {
      log.error("[IPC] Failed to get home directory:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("app:getPlatform", () => {
    return { success: true, platform: process.platform };
  });

  ipcMain.handle("app:checkForUpdates", async () => {
    return await checkForUpdates();
  });

  ipcMain.handle("app:openExternal", async (_event, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  });

  ipcMain.on("app:quit", () => {
    app.quit();
  });
}
