import { describe, expect, it } from "vitest";

import {
  resolveExcludedModelCompatibility,
  resolveModelAliasCompatibility,
} from "../ipc/oauthCompatibility";

describe("OAuth compatibility resolution", () => {
  describe("resolveExcludedModelCompatibility", () => {
    it("uses legacy-only fixture as fallback and marks migration", () => {
      const legacy = {
        "gemini-cli": ["gemini-2.5-pro"],
      };

      const result = resolveExcludedModelCompatibility({
        managementRules: {},
        legacyRules: legacy,
      });

      expect(result.effective).toEqual(legacy);
      expect(result.usedFallback).toBe(true);
      expect(result.shouldMigrate).toBe(true);
      expect(result.conflictKeys).toEqual([]);
    });

    it("uses management-only fixture as source of truth", () => {
      const management = {
        claude: ["claude-opus-4"],
      };

      const result = resolveExcludedModelCompatibility({
        managementRules: management,
        legacyRules: {},
      });

      expect(result.effective).toEqual(management);
      expect(result.usedFallback).toBe(false);
      expect(result.shouldMigrate).toBe(false);
      expect(result.conflictKeys).toEqual([]);
    });

    it("uses management in mixed-conflict fixture and reports conflict key", () => {
      const result = resolveExcludedModelCompatibility({
        managementRules: {
          "gemini-cli": ["gemini-2.5-flash"],
        },
        legacyRules: {
          "gemini-cli": ["gemini-2.5-pro"],
        },
      });

      expect(result.effective).toEqual({
        "gemini-cli": ["gemini-2.5-flash"],
      });
      expect(result.usedFallback).toBe(false);
      expect(result.shouldMigrate).toBe(false);
      expect(result.conflictKeys).toEqual(["gemini-cli"]);
    });
  });

  describe("resolveModelAliasCompatibility", () => {
    it("uses legacy-only alias fixture as fallback and marks migration", () => {
      const legacy = {
        claude: [{ name: "claude-3-5-sonnet-latest", alias: "sonnet" }],
      };

      const result = resolveModelAliasCompatibility({
        managementRules: {},
        legacyRules: legacy,
      });

      expect(result.effective).toEqual(legacy);
      expect(result.usedFallback).toBe(true);
      expect(result.shouldMigrate).toBe(true);
      expect(result.conflictKeys).toEqual([]);
    });

    it("uses management-only alias fixture as source of truth", () => {
      const management = {
        codex: [{ name: "gpt-5", alias: "codex-gpt5", fork: true }],
      };

      const result = resolveModelAliasCompatibility({
        managementRules: management,
        legacyRules: {},
      });

      expect(result.effective).toEqual(management);
      expect(result.usedFallback).toBe(false);
      expect(result.shouldMigrate).toBe(false);
      expect(result.conflictKeys).toEqual([]);
    });

    it("uses management in mixed-conflict alias fixture and reports key", () => {
      const result = resolveModelAliasCompatibility({
        managementRules: {
          claude: [{ name: "claude-3-7-sonnet", alias: "sonnet-new" }],
        },
        legacyRules: {
          claude: [{ name: "claude-3-7-sonnet", alias: "sonnet-old" }],
        },
      });

      expect(result.effective).toEqual({
        claude: [{ name: "claude-3-7-sonnet", alias: "sonnet-new" }],
      });
      expect(result.usedFallback).toBe(false);
      expect(result.shouldMigrate).toBe(false);
      expect(result.conflictKeys).toEqual(["claude"]);
    });
  });
});
