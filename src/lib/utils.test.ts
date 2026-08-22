import { describe, expect, it } from "vitest";
import { clamp, cn, initialOf } from "./utils";

describe("cn", () => {
  it("joins plain class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("resolves conflicting Tailwind utilities in favor of the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("initialOf", () => {
  it("upper-cases the first letter", () => {
    expect(initialOf("ada")).toBe("A");
  });

  it("trims leading whitespace first", () => {
    expect(initialOf("  priya")).toBe("P");
  });

  it("falls back to '?' for an empty name", () => {
    expect(initialOf("")).toBe("?");
    expect(initialOf("   ")).toBe("?");
  });
});

describe("clamp", () => {
  it("passes values already in range through unchanged", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to the minimum", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it("clamps to the maximum", () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
