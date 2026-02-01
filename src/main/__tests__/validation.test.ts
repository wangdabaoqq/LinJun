import { describe, it, expect } from "vitest";
import {
  validateApiKey,
  isValidApiKeyFormat,
  isPathSafe,
  isValidSettingKey,
} from "../utils/validation";

describe("API Key Validation", () => {
  describe("isValidApiKeyFormat", () => {
    it("should reject empty API key", () => {
      expect(isValidApiKeyFormat("")).toBe(false);
      expect(isValidApiKeyFormat("   ")).toBe(false);
    });

    it("should reject null/undefined", () => {
      expect(isValidApiKeyFormat(null as unknown as string)).toBe(false);
      expect(isValidApiKeyFormat(undefined as unknown as string)).toBe(false);
    });

    it("should reject keys that are too short", () => {
      expect(isValidApiKeyFormat("abc")).toBe(false);
      expect(isValidApiKeyFormat("12345")).toBe(false);
    });

    it("should accept valid UUID format", () => {
      expect(isValidApiKeyFormat("550e8400-e29b-41d4-a716-446655440000")).toBe(
        true,
      );
    });

    it("should accept valid API key format (alphanumeric)", () => {
      expect(isValidApiKeyFormat("sk-1234567890abcdefghij")).toBe(true);
      expect(isValidApiKeyFormat("api_key_test_1234567890")).toBe(true);
    });

    it("should reject keys with invalid characters", () => {
      expect(isValidApiKeyFormat("key with spaces")).toBe(false);
      expect(isValidApiKeyFormat("key<script>alert(1)</script>")).toBe(false);
    });
  });

  describe("validateApiKey", () => {
    it("should return invalid for empty key", () => {
      const result = validateApiKey("claude", "");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return valid for well-formed key", () => {
      const result = validateApiKey("claude", "sk-valid-api-key-12345678");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate provider is non-empty", () => {
      const result = validateApiKey("", "valid-key-12345678");
      expect(result.valid).toBe(false);
    });
  });
});

describe("Path Safety Validation", () => {
  describe("isPathSafe", () => {
    it("should allow paths within base directory", () => {
      expect(isPathSafe("/home/user/app", "config.json")).toBe(true);
      expect(isPathSafe("/home/user/app", "subdir/file.txt")).toBe(true);
    });

    it("should reject path traversal attacks", () => {
      expect(isPathSafe("/home/user/app", "../../../etc/passwd")).toBe(false);
      expect(isPathSafe("/home/user/app", "subdir/../../other/file")).toBe(
        false,
      );
    });

    it("should reject empty or invalid paths", () => {
      expect(isPathSafe("/home/user/app", "")).toBe(false);
      expect(isPathSafe("/home/user/app", null as unknown as string)).toBe(
        false,
      );
    });
  });
});

describe("Settings Key Validation", () => {
  it("should accept valid setting keys", () => {
    expect(isValidSettingKey("port")).toBe(true);
    expect(isValidSettingKey("autoStart")).toBe(true);
    expect(isValidSettingKey("routingStrategy")).toBe(true);
  });

  it("should reject invalid setting keys", () => {
    expect(isValidSettingKey("__proto__")).toBe(false);
    expect(isValidSettingKey("constructor")).toBe(false);
    expect(isValidSettingKey("randomKey")).toBe(false);
  });
});
