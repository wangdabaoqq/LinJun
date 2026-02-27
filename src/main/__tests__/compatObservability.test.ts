import { describe, expect, it } from "vitest";

import {
  COMPAT_EVENTS,
  redactSensitiveFields,
} from "../logging/compatObservability";

describe("compatObservability", () => {
  describe("COMPAT_EVENTS", () => {
    it("defines all required event names", () => {
      expect(COMPAT_EVENTS.FALLBACK_HIT).toBe("compat:fallback-hit");
      expect(COMPAT_EVENTS.MIGRATION_STARTED).toBe("compat:migration-started");
      expect(COMPAT_EVENTS.MIGRATION_SUCCEEDED).toBe(
        "compat:migration-succeeded",
      );
      expect(COMPAT_EVENTS.MIGRATION_FAILED).toBe("compat:migration-failed");
      expect(COMPAT_EVENTS.CONFLICT_DETECTED).toBe("compat:conflict-detected");
    });
  });

  describe("redactSensitiveFields", () => {
    it("passes through non-sensitive fields unchanged", () => {
      const payload = {
        event: "compat:fallback-hit",
        feature: "exclusion",
        reason: "management-empty",
        sourceKey: "gemini-cli",
      };
      const result = redactSensitiveFields(payload);
      expect(result).toEqual(payload);
    });

    it("redacts token field", () => {
      const payload = {
        event: "compat:fallback-hit",
        feature: "exclusion",
        token: "super-secret-token-value",
      };
      const result = redactSensitiveFields(payload);
      expect(result["token"]).toBe("[REDACTED]");
      expect(result["event"]).toBe("compat:fallback-hit");
    });

    it("redacts accessToken field", () => {
      const payload = { accessToken: "Bearer abc123", feature: "alias" };
      const result = redactSensitiveFields(payload);
      expect(result["accessToken"]).toBe("[REDACTED]");
      expect(result["feature"]).toBe("alias");
    });

    it("redacts secret field", () => {
      const payload = { secret: "my-secret", reason: "test" };
      const result = redactSensitiveFields(payload);
      expect(result["secret"]).toBe("[REDACTED]");
      expect(result["reason"]).toBe("test");
    });

    it("redacts password field", () => {
      const payload = { password: "hunter2", feature: "exclusion" };
      const result = redactSensitiveFields(payload);
      expect(result["password"]).toBe("[REDACTED]");
    });

    it("redacts apiKey field", () => {
      const payload = { apiKey: "sk-1234", feature: "alias" };
      const result = redactSensitiveFields(payload);
      expect(result["apiKey"]).toBe("[REDACTED]");
    });

    it("redacts authorization field", () => {
      const payload = { authorization: "Bearer token", feature: "exclusion" };
      const result = redactSensitiveFields(payload);
      expect(result["authorization"]).toBe("[REDACTED]");
    });

    it("redacts refresh_token field", () => {
      const payload = { refresh_token: "rt-xyz", feature: "alias" };
      const result = redactSensitiveFields(payload);
      expect(result["refresh_token"]).toBe("[REDACTED]");
    });

    it("does not redact sourceKey or errorCode", () => {
      const payload = {
        event: "compat:fallback-hit",
        feature: "exclusion",
        sourceKey: "claude",
        errorCode: "ECONNREFUSED",
      };
      const result = redactSensitiveFields(payload);
      expect(result["sourceKey"]).toBe("claude");
      expect(result["errorCode"]).toBe("ECONNREFUSED");
    });

    it("handles empty payload", () => {
      expect(redactSensitiveFields({})).toEqual({});
    });
  });
});
