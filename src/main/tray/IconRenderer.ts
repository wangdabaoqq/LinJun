import { nativeImage, NativeImage } from "electron";

export enum TrayIconState {
  Active = "active",
  Inactive = "inactive",
  Warning = "warning",
  Error = "error",
}

export interface SystemStats {
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface RenderOptions {
  stats?: SystemStats;
  forcedState?: TrayIconState;
  isMac?: boolean;
}

export interface IconThresholds {
  warning: number;
  error: number;
  critical: number;
}

/**
 * Renders dynamic tray icons for macOS/Windows/Linux.
 * Generates SVGs on the fly to support high-DPI displays and dynamic states.
 */
export class IconRenderer {
  // Thresholds for state determination
  // 89/90/91 boundary as requested
  private static readonly THRESHOLDS: IconThresholds = {
    warning: 89,
    error: 90,
    critical: 91,
  };

  /**
   * Primary entry point to render the tray icon.
   * @param options Configuration for the render
   * @returns Electron NativeImage suitable for tray usage
   */
  public static render(options: RenderOptions = {}): NativeImage {
    const state = this.determineState(options);
    const svgString = this.generateSvg(
      state,
      options.isMac ?? process.platform === "darwin",
    );

    const image = nativeImage.createFromDataURL(
      `data:image/svg+xml;base64,${Buffer.from(svgString).toString("base64")}`,
    );

    // Optimize for macOS tray
    if (options.isMac ?? process.platform === "darwin") {
      image.setTemplateImage(
        state === TrayIconState.Active || state === TrayIconState.Inactive,
      );
    }

    return image;
  }

  /**
   * Determines the icon state based on stats and thresholds.
   */
  public static determineState(options: RenderOptions): TrayIconState {
    if (options.forcedState) {
      return options.forcedState;
    }

    const { stats } = options;
    if (
      !stats ||
      (stats.cpuUsage === undefined && stats.memoryUsage === undefined)
    ) {
      return TrayIconState.Active; // Default to active if no stats
    }

    const cpu = stats.cpuUsage ?? 0;
    const mem = stats.memoryUsage ?? 0;
    const maxVal = Math.max(cpu, mem);

    if (maxVal >= this.THRESHOLDS.critical) {
      return TrayIconState.Error;
    }
    if (maxVal >= this.THRESHOLDS.error) {
      return TrayIconState.Error; // 90+ is error/critical
    }
    if (maxVal >= this.THRESHOLDS.warning) {
      return TrayIconState.Warning; // 89+ is warning
    }

    return TrayIconState.Active;
  }

  /**
   * Generates the SVG string for the icon.
   * Design: 22x22 canvas.
   */
  private static generateSvg(state: TrayIconState, isMac: boolean): string {
    // Colors
    // macOS Template images ignore color (use black/alpha), but for colored states we need specific colors.
    const colors = {
      active: isMac ? "#000000" : "#FFFFFF", // Template logic handles this for Mac
      inactive: "#808080",
      warning: "#FFA500", // Orange
      error: "#FF0000", // Red
    };

    let mainColor = colors.active;
    if (state === TrayIconState.Warning) mainColor = colors.warning;
    if (state === TrayIconState.Error) mainColor = colors.error;
    if (state === TrayIconState.Inactive) mainColor = colors.inactive;

    // Base shape: A rounded rect representing a "chip" or "server"
    // 22x22 canvas
    // Padding: 2px

    // We'll draw a simplified "Chip" or "Box" logo
    // <rect x="3" y="3" width="16" height="16" rx="3" ... />

    let content = "";

    switch (state) {
      case TrayIconState.Inactive:
        // Hollow rectangle
        content = `
          <rect x="4" y="4" width="14" height="14" rx="3" fill="none" stroke="${mainColor}" stroke-width="2" />
          <circle cx="11" cy="11" r="2" fill="${mainColor}" />
        `;
        break;

      case TrayIconState.Warning:
        // Filled rect with exclamation mark
        // On Mac, we want this to be colored, so we might not use template image here.
        content = `
          <rect x="3" y="3" width="16" height="16" rx="4" fill="${mainColor}" />
          <text x="11" y="15" font-family="Arial" font-size="10" font-weight="bold" fill="white" text-anchor="middle">!</text>
        `;
        break;

      case TrayIconState.Error:
        // Filled rect with X or just Red
        content = `
          <rect x="3" y="3" width="16" height="16" rx="4" fill="${mainColor}" />
          <line x1="8" y1="8" x2="14" y2="14" stroke="white" stroke-width="2" stroke-linecap="round" />
          <line x1="14" y1="8" x2="8" y2="14" stroke="white" stroke-width="2" stroke-linecap="round" />
        `;
        break;

      case TrayIconState.Active:
      default:
        // Simple distinct shape for "Running"
        // A solid box with a small detail
        content = `
          <rect x="3" y="3" width="16" height="16" rx="4" fill="${mainColor}" />
          <circle cx="11" cy="11" r="3" fill="white" /> 
        `;
        break;
    }

    return `
      <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
        ${content}
      </svg>
    `;
  }
}
