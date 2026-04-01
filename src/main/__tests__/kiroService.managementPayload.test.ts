import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TokenReadResult } from "../quota/tokenReader";

const { callManagementApiMock } = vi.hoisted(() => ({
  callManagementApiMock: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/tmp"),
    getAppPath: vi.fn(() => "/tmp"),
    isPackaged: false,
  },
}));

vi.mock("../utils/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../proxy/api", () => ({
  managementAPI: {
    callManagementApi: callManagementApiMock,
  },
}));

import { getKiroUsage } from "../quota/kiroService";

function createKiroToken(): TokenReadResult {
  return {
    provider: "kiro",
    email: "test@example.com",
    accountKey: "kiro:test@example.com",
    oauthSourceKey: "kiro",
    authIndex: "auth-index-1",
    accessToken: "unused-access-token",
    refreshToken: "unused-refresh-token",
    expired: new Date("2099-01-01T00:00:00.000Z"),
    filePath: "/tmp/kiro-token.json",
    enabled: true,
    raw: {},
  };
}

describe("getKiroUsage management payload compatibility", () => {
  beforeEach(() => {
    callManagementApiMock.mockReset();
  });

  it("supports status_code with body as JSON string", async () => {
    callManagementApiMock.mockResolvedValueOnce({
      status_code: 200,
      body: JSON.stringify({
        daysUntilReset: 7,
        usageBreakdownList: [
          {
            displayName: "Fast requests",
            resourceType: "FAST_REQUESTS",
            currentUsageWithPrecision: 12,
            usageLimitWithPrecision: 100,
          },
        ],
      }),
    });

    const usage = await getKiroUsage(createKiroToken());

    expect(usage.daysUntilReset).toBe(7);
    expect(usage.usageBreakdownList?.[0]?.resourceType).toBe("FAST_REQUESTS");
  });

  it("supports statusCode with body as object", async () => {
    callManagementApiMock.mockResolvedValueOnce({
      statusCode: 200,
      body: {
        nextDateReset: 1735689600,
        subscriptionInfo: {
          subscriptionTitle: "Kiro Pro",
        },
      },
    });

    const usage = await getKiroUsage(createKiroToken());

    expect(usage.nextDateReset).toBe(1735689600);
    expect(usage.subscriptionInfo?.subscriptionTitle).toBe("Kiro Pro");
  });

  it("returns clear error when status_code is 4xx/5xx", async () => {
    callManagementApiMock.mockResolvedValueOnce({
      status_code: 401,
      body: JSON.stringify({
        message: "token expired",
      }),
    });

    await expect(getKiroUsage(createKiroToken())).rejects.toThrow(
      "Kiro usage request failed (401): token expired",
    );
  });
});
