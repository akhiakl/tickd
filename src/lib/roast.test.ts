import { describe, expect, it } from "vitest";
import { roastLine } from "./roast";

describe("roastLine", () => {
  it("includes the given name in the returned line", () => {
    expect(roastLine("Sam", "user-1:2026-08-12")).toContain("Sam");
  });

  it("is stable for the same seed", () => {
    const first = roastLine("Sam", "user-1:2026-08-12");
    const second = roastLine("Sam", "user-1:2026-08-12");
    expect(first).toBe(second);
  });

  it("can differ for a different seed", () => {
    const seeds = Array.from(
      { length: 20 },
      (_, i) => `user-1:2026-08-${String(i + 1).padStart(2, "0")}`,
    );
    const lines = new Set(seeds.map((seed) => roastLine("Sam", seed)));
    // Not every seed needs a unique line, but 20 different seeds landing
    // on just one line would mean the hash isn't actually varying.
    expect(lines.size).toBeGreaterThan(1);
  });
});
