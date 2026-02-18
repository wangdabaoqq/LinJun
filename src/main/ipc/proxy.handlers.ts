import { ipcMain } from "electron";

import { proxyManager } from "../proxy/manager";
import {
  checkProxyBinaryUpdate,
  getProxyBinaryVersion,
  updateProxyBinaryAndRestart,
} from "../proxy/updater";

export function setupProxyHandlers(): void {
  ipcMain.handle("proxy:start", async () => {
    try {
      await proxyManager.start();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("proxy:stop", async () => {
    try {
      await proxyManager.stop();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("proxy:status", () => {
    return {
      running: proxyManager.isRunning(),
      port: proxyManager.getPort(),
    };
  });

  ipcMain.handle("proxy:checkBinaryUpdate", async () => {
    return await checkProxyBinaryUpdate();
  });

  ipcMain.handle("proxy:getBinaryVersion", () => {
    return getProxyBinaryVersion();
  });

  ipcMain.handle("proxy:updateBinary", async (event) => {
    return await updateProxyBinaryAndRestart((progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send("proxy:updateBinaryProgress", progress);
      }
    });
  });
}
