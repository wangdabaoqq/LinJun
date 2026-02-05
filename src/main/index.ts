import { app, BrowserWindow, nativeImage } from "electron";
import path from "path";

// Set app name for macOS menu bar
app.setName("霖君");

import log from "./utils/logger";
import { TrayManager } from "./tray/TrayManager";
import { setupIpcHandlers } from "./ipc/handlers";
import { proxyManager } from "./proxy/manager";
import { store } from "./utils/store";

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let statusChangeHandler: ((running: boolean) => void) | null = null;
const isHiddenStart = process.argv.includes("--hidden");

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

  const autoStart = store.get("autoStart");
  if (autoStart) {
    try {
      await proxyManager.start();
      log.info("[Main] Proxy auto-started on port:", proxyManager.getPort());
    } catch (error) {
      log.error("[Main] Failed to auto-start proxy:", error);
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
    titleBarStyle: "hiddenInset",
    ...(process.platform === "darwin"
      ? {
          trafficLightPosition: { x: 14, y: 20 },
        }
      : {}),
  });

  // Windows: 移除菜单栏
  if (process.platform === "win32") {
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
    mainWindow = null;
  });

  statusChangeHandler = (running: boolean) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("proxy:statusChanged", running);
    }
  };
  proxyManager.on("statusChange", statusChangeHandler);

  mainWindow.on("close", (event) => {
    if (process.platform === "darwin" && !isQuitting) {
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
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  isQuitting = true;
  TrayManager.getInstance().destroy();
  await proxyManager.stop();
});
