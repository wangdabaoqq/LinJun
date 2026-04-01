import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetTokensByProvider = vi.fn();
const mockGetKiroUsage = vi.fn();

vi.mock("../utils/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../utils/store", () => ({
  store: {
    get: vi.fn(() => "zh"),
  },
}));

vi.mock("../proxy/manager", () => ({
  proxyManager: {
    loadConfigFromYaml: vi.fn(() => ({})),
  },
}));

vi.mock("../quota/tokenReader", () => ({
  scanTokenFiles: vi.fn(),
  getTokensByProvider: mockGetTokensByProvider,
  getProviderSummary: vi.fn(),
}));

vi.mock("../quota/kiroService", () => ({
  getKiroUsage: mockGetKiroUsage,
}));

vi.mock("../quota/codexService", () => ({
  fetchCodexUsage: vi.fn(),
  formatResetTime: vi.fn(() => "-"),
}));

vi.mock("../quota/antigravityService", () => ({
  fetchAntigravityUsage: vi.fn(),
}));

vi.mock("../quota/customService", () => ({
  fetchCustomUserSelf: vi.fn(),
  fetchCustomPricing: vi.fn(),
  parseCustomPricingModels: vi.fn(() => []),
}));

vi.mock("../quota/claudeService", () => ({
  fetchClaudeUsage: vi.fn(),
  parseClaudeUsageWindows: vi.fn(() => ({
    primary: {
      label: "Primary",
      usedPercent: 0,
      resetIn: "-",
      limitReached: false,
    },
    additional: [],
  })),
}));

describe("QuotaManager Kiro primary quota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("prefers primary Kiro quota over free trial quota", async () => {
    mockGetTokensByProvider.mockResolvedValue([
      {
        provider: "kiro",
        email: "wangdabao221@gmail.com",
        accountKey: "kiro:test",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expired: new Date("2026-04-02T00:00:00Z"),
        filePath: "/tmp/kiro-test.json",
        enabled: true,
        raw: {},
      },
    ]);

    mockGetKiroUsage.mockResolvedValue({
      subscriptionInfo: {
        subscriptionTitle: "KIRO FREE",
      },
      usageBreakdownList: [
        {
          displayName: "Credit",
          currentUsageWithPrecision: 1.14,
          usageLimitWithPrecision: 50,
          freeTrialInfo: {
            currentUsageWithPrecision: 155.86,
            usageLimitWithPrecision: 500,
            freeTrialStatus: "EXPIRED",
          },
        },
      ],
      userInfo: {
        email: "wangdabao221@gmail.com",
      },
    });

    const { getQuotaByProvider } = await import("../quota/quotaManager");
    const [result] = await getQuotaByProvider("kiro");

    expect(result.rateLimits.primary.usedPercent).toBeCloseTo(2.28, 2);
    expect(result.badge).toBe("KIRO FREE");
  });

  it("falls back to free trial quota when primary quota is missing", async () => {
    mockGetTokensByProvider.mockResolvedValue([
      {
        provider: "kiro",
        email: "trial@example.com",
        accountKey: "kiro:trial",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expired: new Date("2026-04-02T00:00:00Z"),
        filePath: "/tmp/kiro-trial.json",
        enabled: true,
        raw: {},
      },
    ]);

    mockGetKiroUsage.mockResolvedValue({
      usageBreakdownList: [
        {
          displayName: "Credit",
          freeTrialInfo: {
            currentUsageWithPrecision: 25,
            usageLimitWithPrecision: 100,
          },
        },
      ],
      userInfo: {
        email: "trial@example.com",
      },
    });

    const { getQuotaByProvider } = await import("../quota/quotaManager");
    const [result] = await getQuotaByProvider("kiro");

    expect(result.rateLimits.primary.usedPercent).toBeCloseTo(25, 2);
  });
});
