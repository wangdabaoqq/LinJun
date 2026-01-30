import { Tray, Menu, nativeImage, app, BrowserWindow } from "electron";
import path from "path";
import { proxyManager } from "./proxy/manager";

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = path.join(__dirname, "../../resources/icon.png");
  const icon = nativeImage
    .createFromPath(iconPath)
    .resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip("霖君");

  const updateMenu = (): void => {
    const isRunning = proxyManager.isRunning();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Dashboard",
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: "separator" },
      {
        label: isRunning ? "● Running" : "○ Stopped",
        enabled: false,
      },
      {
        label: `Port: ${proxyManager.getPort()}`,
        enabled: false,
      },
      { type: "separator" },
      {
        label: isRunning ? "Stop Proxy" : "Start Proxy",
        click: async () => {
          if (isRunning) {
            await proxyManager.stop();
          } else {
            await proxyManager.start();
          }
          updateMenu();
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: async () => {
          await proxyManager.stop();
          app.quit();
        },
      },
    ]);

    tray?.setContextMenu(contextMenu);
  };

  updateMenu();
  proxyManager.on("statusChange", updateMenu);

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
