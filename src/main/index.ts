import { app, BrowserWindow, nativeImage } from "electron";
import path from "path";
import { createTray } from "./tray";
import { setupIpcHandlers } from "./ipc/handlers";
import { proxyManager } from "./proxy/manager";
import { store } from "./utils/store";

let mainWindow: BrowserWindow | null = null;

async function initializeApp(): Promise<void> {
  proxyManager.syncConfigToStore(store);

  const autoStart = store.get("autoStart");
  if (autoStart) {
    try {
      await proxyManager.start();
      console.log("[Main] Proxy auto-started on port:", proxyManager.getPort());
    } catch (error) {
      console.error("[Main] Failed to auto-start proxy:", error);
    }
  }
}

function createWindow(): void {
  // Set window icon for all platforms
  // In development mode, macOS also needs explicit icon setting
  const iconPath = path.join(__dirname, "../../resources/icon.png");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: "hiddenInset",
    ...(process.platform === "darwin"
      ? {
          trafficLightPosition: { x: 14, y: 20 },
        }
      : {}),
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

    mainWindow.webContents.on("before-input-event", (event, input) => {
      const devMode = store.get("developerMode");
      if (!devMode) {
        const isDevToolsShortcut =
          input.key === "F12" ||
          (input.control && input.shift && input.key.toLowerCase() === "i") ||
          (input.meta && input.alt && input.key.toLowerCase() === "i");
        if (isDevToolsShortcut) {
          event.preventDefault();
        }
      }
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("close", (event) => {
    if (process.platform === "darwin") {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

app.whenReady().then(async () => {
  await initializeApp();
  setupIpcHandlers();
  createWindow();

  if (mainWindow) {
    createTray(mainWindow);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  await proxyManager.stop();
});
