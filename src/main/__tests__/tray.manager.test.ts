import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// RED baseline: timer/threshold tests expected to FAIL until implementation lands.

const mockTrayOn = vi.fn();
const mockTraySetToolTip = vi.fn();
const mockTrayDestroy = vi.fn();
const mockTrayGetBounds = vi.fn(() => ({
  x: 100,
  y: 0,
  width: 22,
  height: 22,
}));
const mockTrayPopUpContextMenu = vi.fn();
const mockTrayConstructor = vi.fn();
const mockIpcMainOn = vi.fn();
const mockBrowserWindowIsDestroyed = vi.fn(() => false);
const mockBrowserWindowIsMinimized = vi.fn(() => false);
const mockBrowserWindowRestore = vi.fn();
const mockBrowserWindowShow = vi.fn();
const mockBrowserWindowFocus = vi.fn();

vi.mock("electron", () => {
  class MockTray {
    constructor(icon: unknown) {
      mockTrayConstructor(icon);
    }
    on = mockTrayOn;
    setToolTip = mockTraySetToolTip;
    destroy = mockTrayDestroy;
    getBounds = mockTrayGetBounds;
    popUpContextMenu = mockTrayPopUpContextMenu;
  }
  return {
    Tray: MockTray,
    Menu: { buildFromTemplate: vi.fn(() => ({})) },
    nativeImage: {
      createFromPath: vi.fn(() => ({ resize: vi.fn(() => ({})) })),
    },
    app: {
      isPackaged: false,
      quit: vi.fn(),
      getPath: vi.fn(() => "/mock/path"),
      isReady: vi.fn(() => true),
      on: vi.fn(),
      getAppPath: vi.fn(() => "/mock/app/path"),
    },
    BrowserWindow: vi.fn(),
    ipcMain: {
      on: mockIpcMainOn,
      handle: vi.fn(),
    },
    MenuItemConstructorOptions: {},
  };
});

const mockTrayWindowShow = vi.fn();
const mockTrayWindowHide = vi.fn();
const mockTrayWindowToggle = vi.fn();
const mockTrayWindowDestroy = vi.fn();
const mockTrayWindowSetHeight = vi.fn();
const mockTrayWindowIsVisible = vi.fn(() => false);

vi.mock("../tray/TrayWindow", () => ({
  TrayWindow: vi.fn().mockImplementation(() => ({
    show: mockTrayWindowShow,
    hide: mockTrayWindowHide,
    toggle: mockTrayWindowToggle,
    destroy: mockTrayWindowDestroy,
    setHeight: mockTrayWindowSetHeight,
    isVisible: mockTrayWindowIsVisible,
  })),
}));

const noopLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  initialize: vi.fn(),
  transports: {
    file: { level: "info", format: "" },
    console: { level: "debug", format: "" },
  },
};

vi.mock("electron-log/main", () => ({ default: noopLog }));

vi.mock("electron-store", () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn((key: string) => {
      const defaults: Record<string, unknown> = {
        port: 8310,
        autoStart: false,
      };
      return defaults[key];
    }),
    set: vi.fn(),
    store: {},
  })),
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(() => "port: 8310\nhost: 127.0.0.1"),
  },
}));

vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  })),
}));

vi.mock("js-yaml", () => ({
  default: {
    load: vi.fn(() => ({ port: 8310, host: "127.0.0.1" })),
    dump: vi.fn(() => "port: 8310\nhost: 127.0.0.1"),
  },
}));

vi.mock("../../shared/constants", () => ({
  APP_NAME_ZH: "霖君",
  DEFAULT_PORT: 8310,
}));

function createMockMainWindow() {
  return {
    isDestroyed: mockBrowserWindowIsDestroyed,
    isMinimized: mockBrowserWindowIsMinimized,
    restore: mockBrowserWindowRestore,
    show: mockBrowserWindowShow,
    focus: mockBrowserWindowFocus,
    webContents: { send: vi.fn() },
  } as unknown as import("electron").BrowserWindow;
}

describe("TrayManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // IPC CONTRACT — test names lock current channel strings
  describe("IPC contract: tray:open-dashboard", () => {
    it("should register handler for 'tray:open-dashboard' channel on create", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      mockTrayOn.mockClear();
      mockIpcMainOn.mockClear();
      mockTrayConstructor.mockClear();
      tm.create(createMockMainWindow());

      const channels = mockIpcMainOn.mock.calls.map(
        (call: unknown[]) => call[0],
      );
      expect(channels).toContain("tray:open-dashboard");
    });
  });

  describe("IPC contract: tray:resize", () => {
    it("should register handler for 'tray:resize' channel on create", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      mockIpcMainOn.mockClear();
      tm.create(createMockMainWindow());

      const channels = mockIpcMainOn.mock.calls.map(
        (call: unknown[]) => call[0],
      );
      expect(channels).toContain("tray:resize");
    });

    it("should forward height to TrayWindow.setHeight when tray:resize fires", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      mockIpcMainOn.mockClear();
      mockTrayWindowSetHeight.mockClear();
      tm.create(createMockMainWindow());

      const resizeCall = mockIpcMainOn.mock.calls.find(
        (call: unknown[]) => call[0] === "tray:resize",
      );
      expect(resizeCall).toBeDefined();

      const handler = resizeCall![1] as (
        _event: unknown,
        height: number,
      ) => void;
      handler({}, 400);

      expect(mockTrayWindowSetHeight).toHaveBeenCalledWith(400);
    });
  });

  // SINGLETON & LIFECYCLE
  describe("Singleton behavior", () => {
    it("should return the same instance on multiple getInstance calls", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const a = TrayManager.getInstance();
      const b = TrayManager.getInstance();
      expect(a).toBe(b);
    });
  });

  describe("create()", () => {
    it("should only create tray once (idempotent)", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      mockTrayConstructor.mockClear();
      const mainWindow = createMockMainWindow();

      tm.create(mainWindow);
      tm.create(mainWindow);

      expect(mockTrayConstructor).toHaveBeenCalledTimes(1);
    });

    it("should subscribe to proxyManager statusChange event", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const { proxyManager } = await import("../proxy/manager");
      const onSpy = vi.spyOn(proxyManager, "on");
      const tm = TrayManager.getInstance();
      tm.destroy();
      onSpy.mockClear();
      tm.create(createMockMainWindow());

      expect(onSpy).toHaveBeenCalledWith("statusChange", expect.any(Function));

      onSpy.mockRestore();
    });
  });

  describe("destroy()", () => {
    it("should destroy trayWindow and tray on destroy()", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      mockTrayWindowDestroy.mockClear();
      mockTrayDestroy.mockClear();
      tm.create(createMockMainWindow());

      tm.destroy();

      expect(mockTrayWindowDestroy).toHaveBeenCalled();
      expect(mockTrayDestroy).toHaveBeenCalled();
    });
  });

  // CLICK SEMANTICS
  describe("Click semantics (macOS path)", () => {
    it("should register click and right-click handlers on the tray", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      mockTrayOn.mockClear();
      tm.create(createMockMainWindow());

      const events = mockTrayOn.mock.calls.map((call: unknown[]) => call[0]);
      expect(events).toContain("click");
      expect(events).toContain("right-click");
    });

    it("should call toggleWindow on left-click when not Windows", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      mockTrayOn.mockClear();
      mockTrayWindowToggle.mockClear();
      tm.create(createMockMainWindow());

      const clickCall = mockTrayOn.mock.calls.find(
        (call: unknown[]) => call[0] === "click",
      );
      expect(clickCall).toBeDefined();

      const clickHandler = clickCall![1] as () => void;
      clickHandler();

      if (process.platform !== "win32") {
        expect(mockTrayWindowToggle).toHaveBeenCalled();
      }
    });

    it("should pop up context menu on right-click", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      mockTrayOn.mockClear();
      mockTrayPopUpContextMenu.mockClear();
      tm.create(createMockMainWindow());

      const rightClickCall = mockTrayOn.mock.calls.find(
        (call: unknown[]) => call[0] === "right-click",
      );
      expect(rightClickCall).toBeDefined();

      const rightClickHandler = rightClickCall![1] as () => void;
      rightClickHandler();

      expect(mockTrayPopUpContextMenu).toHaveBeenCalled();
    });
  });

  // 15s TIMER LIFECYCLE — RED BASELINE (not yet implemented)
  describe("15s timer lifecycle (RED baseline)", () => {
    it("should start a 15-second polling interval on create()", async () => {
      const intervalSpy = vi.spyOn(globalThis, "setInterval");

      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      intervalSpy.mockClear();
      tm.create(createMockMainWindow());

      const interval15sCalls = intervalSpy.mock.calls.filter(
        (call) => call[1] === 15000,
      );
      expect(interval15sCalls.length).toBe(1);

      intervalSpy.mockRestore();
    });

    it("should only have a single active interval at any time", async () => {
      const intervalSpy = vi.spyOn(globalThis, "setInterval");

      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      intervalSpy.mockClear();
      const mainWindow = createMockMainWindow();

      tm.create(mainWindow);
      tm.create(mainWindow);

      const interval15sCalls = intervalSpy.mock.calls.filter(
        (call) => call[1] === 15000,
      );
      expect(interval15sCalls.length).toBeLessThanOrEqual(1);

      intervalSpy.mockRestore();
    });

    it("should clear the interval on destroy()", async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      clearIntervalSpy.mockClear();
      tm.create(createMockMainWindow());
      tm.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });

  // >90% WARNING THRESHOLD — RED BASELINE (not yet implemented)
  // Boundary: 89 = normal, 90 = warning, 91 = warning
  describe("Warning threshold boundary (RED baseline)", () => {
    it("should NOT show warning state at 89% usage (below threshold)", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      tm.create(createMockMainWindow());

      const tmAny = tm as unknown as {
        updateQuotaUsage?: (pct: number) => void;
        isWarningState?: () => boolean;
      };
      expect(typeof tmAny.updateQuotaUsage).toBe("function");

      tmAny.updateQuotaUsage!(89);
      expect(tmAny.isWarningState!()).toBe(false);
    });

    it("should show warning state at exactly 90% usage (boundary)", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      tm.create(createMockMainWindow());

      const tmAny = tm as unknown as {
        updateQuotaUsage?: (pct: number) => void;
        isWarningState?: () => boolean;
      };
      expect(typeof tmAny.updateQuotaUsage).toBe("function");

      tmAny.updateQuotaUsage!(90);
      expect(tmAny.isWarningState!()).toBe(true);
    });

    it("should show warning state at 91% usage (above threshold)", async () => {
      const { TrayManager } = await import("../tray/TrayManager");
      const tm = TrayManager.getInstance();
      tm.destroy();
      tm.create(createMockMainWindow());

      const tmAny = tm as unknown as {
        updateQuotaUsage?: (pct: number) => void;
        isWarningState?: () => boolean;
      };
      expect(typeof tmAny.updateQuotaUsage).toBe("function");

      tmAny.updateQuotaUsage!(91);
      expect(tmAny.isWarningState!()).toBe(true);
    });
  });
});
