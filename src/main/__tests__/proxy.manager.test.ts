import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock electron app before importing manager
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/mock/user/data"),
    isPackaged: false,
    getAppPath: vi.fn(() => "/mock/app/path"),
  },
}));

// Mock fs
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(() => "port: 8310\nhost: 127.0.0.1"),
  },
}));

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  })),
}));

describe("ProxyManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should have correct default port", async () => {
    // Dynamic import to ensure mocks are in place
    const { proxyManager } = await import("../proxy/manager");
    expect(proxyManager.getPort()).toBe(8310);
  });

  it("should not be running initially", async () => {
    const { proxyManager } = await import("../proxy/manager");
    expect(proxyManager.isRunning()).toBe(false);
  });

  it("should get correct config directory path", async () => {
    const { proxyManager } = await import("../proxy/manager");
    expect(proxyManager.getConfigDir()).toBe("/mock/user/data/cli-proxy");
  });

  it("should get correct auth directory path", async () => {
    const { proxyManager } = await import("../proxy/manager");
    expect(proxyManager.getAuthDir()).toBe("/mock/user/data/cli-proxy/auth");
  });
});
