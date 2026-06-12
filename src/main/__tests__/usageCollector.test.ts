import { describe, expect, it, vi } from "vitest";

import { UsageCollector } from "../usage/usageCollector";

describe("UsageCollector", () => {
  it("aggregates usage-queue records into the legacy dashboard shape", () => {
    const collector = new UsageCollector({
      getBaseURL: () => "http://127.0.0.1:8309",
      getAuthHeaders: () => ({ Authorization: "Bearer test" }),
    });

    collector.ingest([
      {
        timestamp: "2026-06-12T08:15:30Z",
        source: "user@example.com",
        auth_index: "auth-1",
        provider: "openai",
        model: "gpt-5.5",
        tokens: {
          input_tokens: 10,
          output_tokens: 20,
          reasoning_tokens: 5,
          cached_tokens: 1,
          total_tokens: 36,
        },
        failed: false,
      },
      {
        timestamp: "2026-06-12T09:00:00Z",
        source: "user@example.com",
        auth_index: "auth-1",
        provider: "openai",
        model: "gpt-5.5",
        tokens: {
          input_tokens: 3,
          output_tokens: 4,
          reasoning_tokens: 0,
          cached_tokens: 0,
          total_tokens: 7,
        },
        failed: true,
      },
    ]);

    const result = collector.getUsage();

    expect(result.usage.total_requests).toBe(2);
    expect(result.usage.success_count).toBe(1);
    expect(result.usage.failure_count).toBe(1);
    expect(result.failed_requests).toBe(1);
    expect(result.usage.total_tokens).toBe(43);
    expect(result.usage.requests_by_day["2026-06-12"]).toBe(2);
    expect(result.usage.requests_by_hour["2026-06-12T08"]).toBe(1);
    expect(result.usage.tokens_by_hour["2026-06-12T09"]).toBe(7);
    expect(result.usage.apis.openai.total_requests).toBe(2);
    expect(result.usage.apis.openai.models["gpt-5.5"].total_tokens).toBe(43);
    expect(result.usage.apis.openai.models["gpt-5.5"].details).toHaveLength(2);
  });

  it("polls usage-queue with management auth headers", async () => {
    const get = vi.fn().mockResolvedValue({
      data: [
        {
          timestamp: "2026-06-12T08:15:30Z",
          provider: "codex",
          model: "gpt-5.5-codex",
          tokens: { total_tokens: 12 },
          failed: false,
        },
      ],
    });
    const collector = new UsageCollector({
      getBaseURL: () => "http://127.0.0.1:8309",
      getAuthHeaders: () => ({ Authorization: "Bearer test" }),
      client: { get } as never,
      batchSize: 50,
    });

    await collector.pollOnce();

    expect(get).toHaveBeenCalledWith(
      "http://127.0.0.1:8309/v0/management/usage-queue",
      {
        params: { count: 50 },
        headers: { Authorization: "Bearer test" },
      },
    );
    expect(collector.getUsage().usage.total_requests).toBe(1);
  });

  it("bounds retained request details per model", () => {
    const collector = new UsageCollector({
      getBaseURL: () => "http://127.0.0.1:8309",
      getAuthHeaders: () => ({}),
      maxDetailsPerModel: 2,
    });

    collector.ingest([
      { timestamp: "2026-06-12T08:00:00Z", provider: "openai", model: "gpt", tokens: { total_tokens: 1 } },
      { timestamp: "2026-06-12T08:01:00Z", provider: "openai", model: "gpt", tokens: { total_tokens: 1 } },
      { timestamp: "2026-06-12T08:02:00Z", provider: "openai", model: "gpt", tokens: { total_tokens: 1 } },
    ]);

    const details = collector.getUsage().usage.apis.openai.models.gpt.details;

    expect(details).toHaveLength(2);
    expect(details[0]?.timestamp).toBe("2026-06-12T08:01:00Z");
    expect(details[1]?.timestamp).toBe("2026-06-12T08:02:00Z");
  });
});
