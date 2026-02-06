import {
  Tray,
  Menu,
  nativeImage,
  app,
  BrowserWindow,
  ipcMain,
  MenuItemConstructorOptions,
} from "electron";
import path from "path";
import { proxyManager } from "../proxy/manager";
import { TrayWindow } from "./TrayWindow";
import { APP_NAME_ZH } from "../../shared/constants";

const isWindows = process.platform === "win32";

export class TrayManager {
  private static instance: TrayManager;
  private tray: Tray | null = null;
  private trayWindow: TrayWindow | null = null;
  private mainWindow: BrowserWindow | null = null;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): TrayManager {
    if (!TrayManager.instance) {
      TrayManager.instance = new TrayManager();
    }
    return TrayManager.instance;
  }

  public create(mainWindow: BrowserWindow): void {
    if (this.tray) return;

    this.mainWindow = mainWindow;
    this.trayWindow = new TrayWindow();
    this.isRunning = proxyManager.isRunning();

    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, "icons/tray-icon.png")
      : path.join(__dirname, "../../resources/icons/icons/32x32.png");

    const icon = nativeImage
      .createFromPath(iconPath)
      .resize({ width: 22, height: 22 });

    this.tray = new Tray(icon);
    this.tray.setToolTip(`${APP_NAME_ZH} - AI Proxy Manager`);

    this.setupEventHandlers();
    this.updateContextMenu();
    this.setupIpcHandlers();

    proxyManager.on("statusChange", (running: boolean) => {
      this.isRunning = running;
      this.updateContextMenu();
    });
  }

  private setupEventHandlers(): void {
    if (!this.tray) return;

    this.tray.on("click", () => {
      this.toggleWindow();
    });

    this.tray.on("right-click", () => {
      this.tray?.popUpContextMenu(this.buildMenu());
    });
  }

  private setupIpcHandlers(): void {
    ipcMain.on("tray:open-dashboard", () => {
      this.openDashboard();
    });

    ipcMain.on("tray:resize", (_event, height: number) => {
      this.trayWindow?.setHeight(height);
      if (this.trayWindow?.isVisible()) {
        const bounds = this.tray?.getBounds();
        if (bounds) {
          this.trayWindow.show(bounds);
        }
      }
    });
  }

  private toggleWindow(): void {
    const bounds = this.tray?.getBounds();
    if (bounds && this.trayWindow) {
      this.trayWindow.toggle(bounds);
    }
  }

  private openDashboard(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
    this.trayWindow?.hide();
  }

  private buildMenu(): Menu {
    const template: MenuItemConstructorOptions[] = [
      {
        label: isWindows
          ? `状态: ${this.isRunning ? "运行中" : "已停止"}`
          : `Status: ${this.isRunning ? "Running" : "Stopped"}`,
        enabled: false,
      },
      {
        label: isWindows
          ? this.isRunning
            ? "停止代理"
            : "启动代理"
          : this.isRunning
            ? "Stop Proxy"
            : "Start Proxy",
        click: async () => {
          if (this.isRunning) {
            await proxyManager.stop();
          } else {
            await proxyManager.start();
          }
        },
      },
      { type: "separator" },
      {
        label: isWindows ? "打开主界面" : "Open Dashboard",
        click: () => this.openDashboard(),
      },
      {
        label: isWindows ? `退出${APP_NAME_ZH}` : "Quit LinJun",
        click: () => {
          this.destroy();
          app.quit();
        },
      },
    ];

    return Menu.buildFromTemplate(template);
  }

  private updateContextMenu(): void {
    if (!this.tray) return;
  }

  public destroy(): void {
    this.trayWindow?.destroy();
    this.tray?.destroy();
    this.tray = null;
    this.trayWindow = null;
  }
}
