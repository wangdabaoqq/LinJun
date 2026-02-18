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
import { store } from "../utils/store";

const isWindows = process.platform === "win32";
const isLinux = process.platform === "linux";

export class TrayManager {
  private static instance: TrayManager;
  private tray: Tray | null = null;
  private trayWindow: TrayWindow | null = null;
  private mainWindow: BrowserWindow | null = null;
  private isRunning: boolean = false;
  private quotaInterval: NodeJS.Timeout | null = null;
  private warningState: boolean = false;

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
    if (!isLinux) {
      this.trayWindow = new TrayWindow();
    }
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

    this.startQuotaPolling();
  }

  private startQuotaPolling(): void {
    if (this.quotaInterval) return;
    this.quotaInterval = setInterval(() => {}, 15000);
  }

  private stopQuotaPolling(): void {
    if (this.quotaInterval) {
      clearInterval(this.quotaInterval);
      this.quotaInterval = null;
    }
  }

  public updateQuotaUsage(pct: number): void {
    this.warningState = pct >= 90;
    this.updateTrayIcon();
  }

  public isWarningState(): boolean {
    return this.warningState;
  }

  private updateTrayIcon(): void {
    if (!this.tray) return;
  }

  private setupEventHandlers(): void {
    if (!this.tray) return;

    if (isLinux) {
      // Linux/Deepin: AppIndicator/SNI doesn't fire right-click events.
      // Use setContextMenu so the DE can display it natively.
      this.tray.setContextMenu(this.buildMenu());
      this.tray.on("click", () => {
        this.openDashboard();
      });
    } else if (isWindows) {
      this.tray.on("click", () => {
        this.openDashboard();
      });
      this.tray.on("right-click", () => {
        this.tray?.popUpContextMenu(this.buildMenu());
      });
    } else {
      this.tray.on("click", () => {
        this.toggleWindow();
      });
      this.tray.on("right-click", () => {
        this.tray?.popUpContextMenu(this.buildMenu());
      });
    }
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
    const isZh = store.get("language") === "zh";
    const template: MenuItemConstructorOptions[] = [
      {
        label: isZh
          ? `状态: ${this.isRunning ? "运行中" : "已停止"}`
          : `Status: ${this.isRunning ? "Running" : "Stopped"}`,
        enabled: false,
      },
      {
        label: isZh
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
        label: isZh ? "打开主界面" : "Open Dashboard",
        click: () => this.openDashboard(),
      },
      {
        label: isZh ? `退出${APP_NAME_ZH}` : "Quit LinJun",
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
    if (isLinux) {
      this.tray.setContextMenu(this.buildMenu());
    }
  }

  public destroy(): void {
    this.stopQuotaPolling();
    this.trayWindow?.destroy();
    this.tray?.destroy();
    this.tray = null;
    this.trayWindow = null;
  }
}
