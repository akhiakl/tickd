import { describe, expect, it, vi, afterEach } from "vitest";

// flag() from "flags/next" wraps decide() in machinery that expects a real
// Next.js request context (headers()/cookies()) - out of reach in a plain
// Vitest test. Mock the module to capture the raw `decide` callback passed
// in, so it can be exercised directly instead of through that wrapper.
const capture: { decide?: () => boolean } = {};

vi.mock("flags/next", () => ({
  flag: (config: { decide: () => boolean }) => {
    capture.decide = config.decide;
    return vi.fn();
  },
}));

// Triggers flags.ts's module-level `flag({ ... decide })` call, which
// populates `capture` above via the mock.
await import("./flags");

describe("auth0Enabled's decide()", () => {
  const originalValue = process.env.AUTH0_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) delete process.env.AUTH0_ENABLED;
    else process.env.AUTH0_ENABLED = originalValue;
  });

  it("is false when AUTH0_ENABLED is unset", () => {
    delete process.env.AUTH0_ENABLED;
    expect(capture.decide!()).toBe(false);
  });

  it('is false for any value other than the exact string "true"', () => {
    process.env.AUTH0_ENABLED = "1";
    expect(capture.decide!()).toBe(false);
  });

  it('is true when AUTH0_ENABLED is exactly "true"', () => {
    process.env.AUTH0_ENABLED = "true";
    expect(capture.decide!()).toBe(true);
  });
});
