import { app, BrowserWindow, nativeImage } from "electron";
import path from "path";
import { APP_NAME_ZH } from "../shared/constants";

// Set app name for macOS menu bar
app.setName(APP_NAME_ZH);

import log from "./utils/logger";
import { TrayManager } from "./tray/TrayManager";
import { setupIpcHandlers } from "./ipc/handlers";
import { proxyManager } from "./proxy/manager";
import { managementAPI } from "./proxy/api";
import { store } from "./utils/store";

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let statusChangeHandler: ((running: boolean) => void) | null = null;
let proxyErrorHandler: ((message: string) => void) | null = null;
let usageCollectorHandler: ((running: boolean) => void) | null = null;
let pendingProxyError: string | null = null;
const isHiddenStart = process.argv.includes("--hidden");
const isLinux = process.platform === "linux";
const isMac = process.platform === "darwin";

// Single instance lock - only enforce in production
if (process.env.NODE_ENV !== "development") {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on("second-instance", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
}

async function initializeApp(): Promise<void> {
  proxyManager.syncConfigToStore(store);

  usageCollectorHandler = (running: boolean) => {
    if (running) {
      managementAPI.startUsageCollector();
    } else {
      managementAPI.stopUsageCollector();
    }
  };
  proxyManager.on("statusChange", usageCollectorHandler);

  const autoStart = store.get("autoStart");
  if (autoStart) {
    try {
      await proxyManager.start();
      log.info("[Main] Proxy auto-started on port:", proxyManager.getPort());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error("[Main] Failed to auto-start proxy:", message);
      pendingProxyError = message;
    }
  }
}

function createWindow(): void {
  // Set window icon for all platforms
  // In development mode, macOS also needs explicit icon setting
  const iconPath = path.join(__dirname, "../../resources/icon.png");

  const isDev = process.env.NODE_ENV === "development";

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: !isHiddenStart,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: isDev,
    },
    // macOS: hidden inset title bar with traffic lights
    // Linux: keep native title bar (hiddenInset not supported, causes missing icon)
    // Windows: default frame
    ...(isMac
      ? {
          titleBarStyle: "hiddenInset" as const,
          trafficLightPosition: { x: 14, y: 20 },
        }
      : {}),
  });

  // Windows: 移除菜单栏
  if (process.platform === "win32") {
    mainWindow.setMenu(null);
  }

  // Linux: 移除菜单栏（避免显示默认 Electron 菜单）
  if (isLinux) {
    mainWindow.setMenu(null);
  }

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    if (statusChangeHandler) {
      proxyManager.off("statusChange", statusChangeHandler);
      statusChangeHandler = null;
    }
    if (proxyErrorHandler) {
      proxyManager.off("proxyError", proxyErrorHandler);
      proxyErrorHandler = null;
    }
    mainWindow = null;
  });

  statusChangeHandler = (running: boolean) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("proxy:statusChanged", running);
    }
  };
  proxyManager.on("statusChange", statusChangeHandler);

  proxyErrorHandler = (message: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("proxy:error", message);
    }
  };
  proxyManager.on("proxyError", proxyErrorHandler);

  mainWindow.webContents.once("did-finish-load", () => {
    if (pendingProxyError && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("proxy:error", pendingProxyError);
      pendingProxyError = null;
    }
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    if (
      process.platform === "darwin" ||
      process.platform === "win32" ||
      isLinux
    ) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

app
  .whenReady()
  .then(async () => {
    await initializeApp();
    setupIpcHandlers();
    createWindow();

    if (mainWindow) {
      TrayManager.getInstance().create(mainWindow);
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        mainWindow?.show();
      }
    });
  })
  .catch((error) => {
    log.error("[App] Failed to initialize:", error);
    app.quit();
  });

app.on("window-all-closed", () => {
  // All platforms: keep app alive (tray manages lifecycle)
});

app.on("before-quit", async () => {
  isQuitting = true;
  managementAPI.stopUsageCollector();
  if (usageCollectorHandler) {
    proxyManager.off("statusChange", usageCollectorHandler);
    usageCollectorHandler = null;
  }
  TrayManager.getInstance().destroy();
  await proxyManager.stop();
});
