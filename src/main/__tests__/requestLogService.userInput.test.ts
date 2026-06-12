import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockConfigDir = "/tmp/linjun-config";
let mockAuthDir = "/tmp/linjun-auth";
const REQUEST_LOG_DIRECTORY_OVERRIDE_KEY =
  "__LINJUN_REQUEST_LOG_DIRECTORY_OVERRIDE__" as const;

vi.mock("../utils/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../proxy/manager", () => ({
  proxyManager: {
    getConfigDir: vi.fn(() => mockConfigDir),
    getAuthDir: vi.fn(() => mockAuthDir),
    loadConfigFromYaml: vi.fn(() => ({})),
  },
}));

function makeLog(
  requestBody: string,
  timestamp = "2026-04-01T12:00:00.000Z",
  status = "200",
): string {
  return `=== REQUEST INFO ===
Timestamp: ${timestamp}
Method: POST
URL: https://example.com/v1/responses

=== REQUEST BODY ===
${requestBody}

=== RESPONSE ===
Status: ${status}`;
}

describe("requestLogService user input extraction", () => {
  let tempRoot: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "linjun-logs-"));
    mockConfigDir = tempRoot;
    mockAuthDir = path.join(tempRoot, "auth");
    await fs.mkdir(path.join(tempRoot, "logs"), { recursive: true });
    (globalThis as Record<string, unknown>)[
      REQUEST_LOG_DIRECTORY_OVERRIDE_KEY
    ] = {
      primaryLogDir: path.join(tempRoot, "logs"),
      scannedDirs: [path.join(tempRoot, "logs"), tempRoot],
      compatibilityLogDirs: [tempRoot],
      writablePath: tempRoot,
      resolution: "writable_path",
    };
  });

  afterEach(async () => {
    delete (globalThis as Record<string, unknown>)[
      REQUEST_LOG_DIRECTORY_OVERRIDE_KEY
    ];
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("excludes title generation requests entirely even if earlier messages have real input", async () => {
    const logContent = makeLog(
      JSON.stringify({
        messages: [
          { role: "user", content: "帮我分析下 Claude 配额问题" },
          {
            role: "user",
            content:
              "Please write a 5-10 word title for the following conversation.",
          },
        ],
      }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-responses-user-input.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    // Title generation requests are excluded entirely
    expect(result.entries).toHaveLength(0);
  });

  it("excludes warmup prompts from log entries entirely", async () => {
    const logContent = makeLog(JSON.stringify({ prompt: "Warmup" }));

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-responses-warmup.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    // Warmup requests are non-conversation → excluded entirely
    expect(result.entries).toHaveLength(0);
  });

  it("excludes suggestion mode prompts from log entries entirely", async () => {
    const logContent = makeLog(
      JSON.stringify({
        messages: [
          {
            role: "user",
            content: "[SUGGESTION MODE: Synthesize a concise completion]",
          },
        ],
      }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-responses-suggestion.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    // Suggestion mode requests are non-conversation → excluded entirely
    expect(result.entries).toHaveLength(0);
  });

  it("filters system reminder prompts from user input column", async () => {
    const logContent = makeLog(
      JSON.stringify({
        messages: [
          {
            role: "user",
            content:
              "<system-reminder> As you answer the user's request, stay concise.",
          },
        ],
      }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-responses-system-reminder.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.userInput).toBeUndefined();
  });

  it("deduplicates identical request logs scanned from compatibility directories", async () => {
    const logContent = makeLog(
      JSON.stringify({ messages: [{ role: "user", content: "你好" }] }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-responses-duplicate.log"),
      logContent,
      "utf-8",
    );
    await fs.writeFile(
      path.join(tempRoot, "v1-responses-duplicate.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.userInput).toBe("你好");
  });

  // --- New tests for the fixed extraction logic ---

  it("v1-messages: extracts real user input from content array with system-reminder block", async () => {
    // Real v1-messages format: user content has system-reminder + real input
    const logContent = makeLog(
      JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "<system-reminder>As you answer the user's questions, use context...</system-reminder>",
              },
              {
                type: "text",
                text: "hi",
                cache_control: { type: "ephemeral" },
              },
            ],
          },
        ],
      }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-sysreminder.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.userInput).toBe("hi");
  });

  it("v1-messages: prefers cache_control block over other text blocks", async () => {
    const logContent = makeLog(
      JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "some context info" },
              {
                type: "text",
                text: "actual question",
                cache_control: { type: "ephemeral" },
              },
              { type: "text", text: "more context" },
            ],
          },
        ],
      }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-cache-ctrl.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.userInput).toBe("actual question");
  });

  it("v1-responses: extracts from last user message with input_text blocks", async () => {
    // OpenAI Responses API format used by Codex CLI
    const logContent = makeLog(
      JSON.stringify({
        input: [
          {
            type: "message",
            role: "developer",
            content: [
              {
                type: "input_text",
                text: "<permissions>system instructions</permissions>",
              },
            ],
          },
          {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: "<environment_context>context here</environment_context>",
              },
            ],
          },
          {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "hello world" }],
          },
        ],
      }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-responses-codex.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.userInput).toBe("hello world");
  });

  it("v1-messages: only last user message with real content is used", async () => {
    // Multi-turn conversation: earlier user message has real input,
    // last user message is all system-reminder → falls back to earlier message
    const logContent = makeLog(
      JSON.stringify({
        messages: [
          { role: "user", content: "帮我分析下这段代码" },
          { role: "assistant", content: "好的，让我看看..." },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "<system-reminder>Remember to be concise.</system-reminder>",
              },
            ],
          },
        ],
      }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-fallback.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    expect(result.entries).toHaveLength(1);
    // Last user message is all system content → falls back to previous user message
    expect(result.entries[0]?.userInput).toBe("帮我分析下这段代码");
  });

  it("filters system-reminder that appears mid-text (not just at start)", async () => {
    const logContent = makeLog(
      JSON.stringify({
        messages: [
          {
            role: "user",
            content:
              "Some prefix text\n<system-reminder>This is internal</system-reminder>",
          },
        ],
      }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-midreminder.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.userInput).toBeUndefined();
  });

  it("plain string user message content works correctly", async () => {
    const logContent = makeLog(
      JSON.stringify({
        messages: [{ role: "user", content: "count" }],
      }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-plain.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    expect(result.entries).toHaveLength(1);
    // "count" is a real user input (plain string content, max_tokens not 1)
    expect(result.entries[0]?.userInput).toBe("count");
  });

  it("excludes MCP tool probe requests (max_tokens=1) from log entries", async () => {
    // Claude Code sends probe requests with max_tokens:1 and content "count"
    // to verify each MCP tool definition — not real user conversations
    const logContent = makeLog(
      JSON.stringify({
        model: "qwen2.5-coder-32b-instruct",
        max_tokens: 1,
        messages: [{ role: "user", content: "count" }],
        tools: [{ name: "mcp__playwright__browser_click", type: "custom" }],
      }),
    );

    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-mcp-probe.log"),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    // max_tokens=1 → MCP probe → excluded entirely
    expect(result.entries).toHaveLength(0);
  });

  it("excludes count_tokens log files entirely from results", async () => {
    // v1-messages-count_tokens files are MCP tool token counting requests,
    // not real conversations — they should not appear in log entries at all
    const logContent = makeLog(
      JSON.stringify({
        model: "qwen2.5-coder-32b-instruct",
        messages: [{ role: "user", content: "foo" }],
        tools: [{ name: "mcp__playwright__browser_click", type: "custom" }],
      }),
    );

    await fs.writeFile(
      path.join(
        tempRoot,
        "logs",
        "v1-messages-count_tokens-2026-04-01T190200-abc123.log",
      ),
      logContent,
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(10);

    // count_tokens files should be completely excluded
    expect(result.entries).toHaveLength(0);
  });

  it("deduplicates retry entries within 60s window, keeping the successful one", async () => {
    // Simulate CLIProxyAPI retry: same user message, different timestamps
    // within 60s, multiple failures then one success
    const body = JSON.stringify({
      messages: [{ role: "user", content: "帮我查一下" }],
    });

    // 3 failed retries
    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-retry-1.log"),
      makeLog(body, "2026-04-01T12:00:01.000Z", "500"),
      "utf-8",
    );
    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-retry-2.log"),
      makeLog(body, "2026-04-01T12:00:05.000Z", "429"),
      "utf-8",
    );
    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-retry-3.log"),
      makeLog(body, "2026-04-01T12:00:10.000Z", "500"),
      "utf-8",
    );
    // 1 success
    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-retry-4.log"),
      makeLog(body, "2026-04-01T12:00:20.000Z", "200"),
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(50);

    // All 4 entries share the same userInput within 60s → deduped to 1
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.userInput).toBe("帮我查一下");
    // The successful entry (200) should be kept
    expect(result.entries[0]?.statusCode).toBe(200);
  });

  it("does NOT deduplicate entries with same userInput outside 60s window", async () => {
    const body = JSON.stringify({
      messages: [{ role: "user", content: "hi" }],
    });

    // Two "hi" messages more than 60s apart → separate conversations
    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-conv-1.log"),
      makeLog(body, "2026-04-01T12:00:00.000Z", "200"),
      "utf-8",
    );
    await fs.writeFile(
      path.join(tempRoot, "logs", "v1-messages-conv-2.log"),
      makeLog(body, "2026-04-01T12:05:00.000Z", "200"),
      "utf-8",
    );

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(50);

    // 5 minutes apart → two separate conversations
    expect(result.entries).toHaveLength(2);
  });

  it("caps requested log count to avoid parsing too many files at startup", async () => {
    for (let index = 0; index < 120; index += 1) {
      const body = JSON.stringify({
        messages: [{ role: "user", content: `request ${index}` }],
      });
      const timestamp = new Date(
        Date.UTC(2026, 3, 1, 12, index, 0),
      ).toISOString();
      await fs.writeFile(
        path.join(tempRoot, "logs", `v1-messages-cap-${index}.log`),
        makeLog(body, timestamp, "200"),
        "utf-8",
      );
    }

    const { fetchRecentRequestLogs } =
      await import("../logging/requestLogService");
    const result = await fetchRecentRequestLogs(500);

    expect(result.entries).toHaveLength(100);
    expect(result.diagnostics.parsedFiles).toBe(100);
  });
});
