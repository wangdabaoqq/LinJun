import { describe, it, expect } from "vitest";
import { DEFAULT_PORT } from "../constants";

describe("Constants", () => {
  it("should have a valid DEFAULT_PORT", () => {
    expect(DEFAULT_PORT).toBe(8310);
    expect(typeof DEFAULT_PORT).toBe("number");
    expect(DEFAULT_PORT).toBeGreaterThan(0);
    expect(DEFAULT_PORT).toBeLessThan(65536);
  });
});
