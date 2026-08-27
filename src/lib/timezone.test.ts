import { describe, expect, it } from "vitest";
import { localHour, localISODate, localWeekday } from "./timezone";

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
    expect(localHour("UTC")).toBe(new Date().getUTCHours());
  });
});

describe("localWeekday", () => {
  it("reads the weekday in the given IANA zone", () => {
    const weekday = localWeekday("UTC");
    expect(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).toContain(weekday);
  });

  it("falls back to UTC when timezone is null", () => {
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
