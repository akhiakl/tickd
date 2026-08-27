import { describe, expect, it, vi, afterEach } from "vitest";
import { localHour, localISODate, localWeekday } from "./timezone";

afterEach(() => {
  vi.useRealTimers();
});

describe("localHour", () => {
  it("reads the hour in the given IANA zone", () => {
    // 2026-01-15T23:30:00Z is 2026-01-15 15:30 in Los Angeles (UTC-8, no DST in January).
    const at = new Date("2026-01-15T23:30:00Z");
    expect(localHour("America/Los_Angeles", at)).toBe(15);
  });

  it("falls back to UTC when timezone is null", () => {
    const at = new Date("2026-01-15T23:30:00Z");
    expect(localHour(null, at)).toBe(23);
  });

  it("defaults `at` to now when omitted", () => {
    // Freezes "now" rather than comparing two independent `new Date()`
    // calls - those could each land on a different side of an hour
    // rollover and flake, as Copilot's review flagged for the analogous
    // localWeekday case below.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T23:30:00Z"));
    expect(localHour("UTC")).toBe(23);
  });
});

describe("localWeekday", () => {
  it("reads the weekday in the given IANA zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z")); // a Thursday
    expect(localWeekday("UTC")).toBe("Thu");
  });

  it("falls back to UTC when timezone is null", () => {
    // Freezes "now" so both calls read the identical instant - otherwise
    // this compares two independent `new Date()` calls, which could
    // straddle a day rollover and flake (Copilot's review flagged this).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    expect(localWeekday(null)).toBe(localWeekday("UTC"));
  });
});

describe("localISODate", () => {
  it("formats a date as YYYY-MM-DD in the given zone", () => {
    // 2026-01-01T04:00:00Z is still 2025-12-31 in Los Angeles (UTC-8).
    const date = new Date("2026-01-01T04:00:00Z");
    expect(localISODate(date, "America/Los_Angeles")).toBe("2025-12-31");
  });

  it("falls back to UTC when timezone is null", () => {
    const date = new Date("2026-01-01T04:00:00Z");
    expect(localISODate(date, null)).toBe("2026-01-01");
  });
});
