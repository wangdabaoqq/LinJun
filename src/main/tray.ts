import {
  Tray,
  nativeImage,
  BrowserWindow,
  ipcMain,
  app,
  Menu,
  screen,
} from "electron";
import path from "path";

let tray: Tray | null = null;
let trayWindow: BrowserWindow | null = null;

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = path.join(__dirname, "../../resources/AppIcon.png");

  const icon = nativeImage
    .createFromPath(iconPath)
    .resize({ width: 16, height: 16 });
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip("霖君");

  const createTrayWindow = () => {
    trayWindow = new BrowserWindow({
      width: 320,
      height: 450,
      show: false,
      frame: false,
      fullscreenable: false,
      resizable: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      vibrancy: "under-window",
      visualEffectState: "active",
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        sandbox: false,
      },
    });

    if (
      process.env.NODE_ENV === "development" &&
      process.env.ELECTRON_RENDERER_URL
    ) {
      trayWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#tray`);
    } else {
      trayWindow.loadFile(path.join(__dirname, "../renderer/index.html"), {
        hash: "tray",
      });
    }

    trayWindow.on("blur", () => {
      trayWindow?.hide();
    });
  };

  const showTrayWindow = () => {
    if (!tray || !trayWindow) return;

    const trayBounds = tray.getBounds();
    const windowBounds = trayWindow.getBounds();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;

    let x = Math.round(
      trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2,
    );
    const y = Math.round(trayBounds.y + trayBounds.height + 4);

    if (x + windowBounds.width > screenWidth) {
      x = screenWidth - windowBounds.width - 10;
    }
    if (x < 10) {
      x = 10;
    }

    trayWindow.setPosition(x, y, false);
    trayWindow.setOpacity(0);
    trayWindow.show();
    trayWindow.focus();

    let opacity = 0;
    const fadeInterval = setInterval(() => {
      opacity += 0.15;
      if (opacity >= 1) {
        trayWindow?.setOpacity(1);
        clearInterval(fadeInterval);
      } else {
        trayWindow?.setOpacity(opacity);
      }
    }, 16);
  };

  const toggleTrayWindow = () => {
    if (!trayWindow) {
      createTrayWindow();
    }

    if (trayWindow?.isVisible()) {
      trayWindow.hide();
    } else {
      showTrayWindow();
    }
  };

  tray.on("click", () => {
    toggleTrayWindow();
  });

  tray.on("right-click", () => {
    const contextMenu = Menu.buildFromTemplate([
      { label: "Open Dashboard", click: () => mainWindow.show() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);
    tray?.popUpContextMenu(contextMenu);
  });

  ipcMain.on("tray:open-dashboard", () => {
    mainWindow.show();
    mainWindow.focus();
    trayWindow?.hide();
  });

  ipcMain.on("tray:resize", (_event, height: number) => {
    if (trayWindow) {
      const [width] = trayWindow.getSize();
      const newHeight = Math.min(Math.max(height, 100), 600);
      trayWindow.setSize(width, newHeight, false);
      if (trayWindow.isVisible()) {
        showTrayWindow();
      }
    }
  });
}

export function destroyTray(): void {
  if (trayWindow) {
    trayWindow.close();
    trayWindow = null;
  }
  tray?.destroy();
  tray = null;
}
