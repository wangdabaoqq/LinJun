import { BrowserWindow, screen, Rectangle } from "electron";
import path from "path";

export class TrayWindow {
  private window: BrowserWindow | null = null;

  constructor() {
    this.createWindow();
  }

  private createWindow(): void {
    this.window = new BrowserWindow({
      width: 320,
      height: 450, // Default height, will be resized by renderer
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
      this.window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#tray`);
    } else {
      this.window.loadFile(path.join(__dirname, "../renderer/index.html"), {
        hash: "tray",
      });
    }

    this.window.on("blur", () => {
      if (!this.window?.webContents.isDevToolsOpened()) {
        this.hide();
      }
    });
  }

  public show(trayBounds: Rectangle): void {
    if (!this.window) return;

    const windowBounds = this.window.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;

    // Calculate X position (center horizontally relative to tray icon)
    let x = Math.round(
      trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2,
    );

    // Calculate Y position (below tray icon)
    const y = Math.round(trayBounds.y + trayBounds.height + 4);

    if (x + windowBounds.width > screenWidth) {
      x = screenWidth - windowBounds.width - 10;
    }
    if (x < 10) {
      x = 10;
    }

    this.window.setPosition(x, y, false);

    this.window.setOpacity(0);
    this.window.show();
    this.window.focus();

    let opacity = 0;
    const fadeInterval = setInterval(() => {
      opacity += 0.15;
      if (opacity >= 1) {
        this.window?.setOpacity(1);
        clearInterval(fadeInterval);
      } else {
        this.window?.setOpacity(opacity);
      }
    }, 16);
  }

  public hide(): void {
    this.window?.hide();
  }

  public toggle(trayBounds: Rectangle): void {
    if (this.window?.isVisible()) {
      this.hide();
    } else {
      this.show(trayBounds);
    }
  }

  public isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }

  public setHeight(height: number): void {
    if (!this.window) return;
    const [width] = this.window.getSize();
    const newHeight = Math.min(Math.max(height, 100), 800); // Increased max height safety
    this.window.setSize(width, newHeight, false);
  }

  public destroy(): void {
    this.window?.close();
    this.window = null;
  }
}
