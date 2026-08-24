import { describe, expect, it } from "vitest";
import { buildMonthGrid, monthIndexFor, monthsInRange } from "./calendar-grid";

describe("monthsInRange", () => {
  it("returns a single month when start and end fall in the same one", () => {
    const months = monthsInRange("2026-08-01", "2026-08-20");
    expect(months.map((m) => m.key)).toEqual(["2026-08"]);
  });

  it("spans multiple months, oldest first", () => {
    const months = monthsInRange("2026-08-24", "2026-09-23");
    expect(months.map((m) => m.key)).toEqual(["2026-08", "2026-09"]);
  });

  it("crosses a year boundary", () => {
    const months = monthsInRange("2026-12-15", "2027-01-10");
    expect(months.map((m) => m.key)).toEqual(["2026-12", "2027-01"]);
  });
});

describe("buildMonthGrid", () => {
  it("pads the first and last week with nulls", () => {
    // August 2026: 1st is a Saturday.
    const weeks = buildMonthGrid(2026, 7);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-08-01"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });

  it("every week has exactly 7 cells", () => {
    const weeks = buildMonthGrid(2026, 7);
    for (const week of weeks) expect(week).toHaveLength(7);
  });
});

describe("monthIndexFor", () => {
  const months = monthsInRange("2026-08-24", "2026-10-05");

  it("finds the month containing the date", () => {
    expect(monthIndexFor(months, "2026-09-15")).toBe(1);
  });

  it("clamps to the first month when the date is before the range", () => {
    expect(monthIndexFor(months, "2026-01-01")).toBe(0);
  });

  it("clamps to the last month when the date is after the range", () => {
    expect(monthIndexFor(months, "2027-01-01")).toBe(months.length - 1);
  });
});
