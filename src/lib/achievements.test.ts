import { describe, expect, it } from "vitest";
import { earnedBadges, type BadgeInput } from "./achievements";

const base: BadgeInput = {
  startDate: "2026-08-01",
  itemCount: 3,
  localToday: "2026-08-01",
  localDayIndex: 1,
  localCountsByDate: {},
  localCheckHours: [],
};

function ids(input: BadgeInput): string[] {
  return earnedBadges(input).map((b) => b.id);
}

describe("earnedBadges", () => {
  it("earns nothing from a blank slate", () => {
    expect(ids(base)).toEqual([]);
  });

  it("founding-member requires a fully-checked day 1", () => {
    expect(ids({ ...base, localCountsByDate: { "2026-08-01": 3 } })).toContain("founding-member");
    expect(ids({ ...base, localCountsByDate: { "2026-08-01": 2 } })).not.toContain(
      "founding-member",
    );
  });

  it("early-bird fires on any check before 7am local", () => {
    expect(ids({ ...base, localCheckHours: [6] })).toContain("early-bird");
    expect(ids({ ...base, localCheckHours: [7] })).not.toContain("early-bird");
  });

  it("night-owl fires on 11pm-4am local, wrapping midnight", () => {
    expect(ids({ ...base, localCheckHours: [23] })).toContain("night-owl");
    expect(ids({ ...base, localCheckHours: [3] })).toContain("night-owl");
    expect(ids({ ...base, localCheckHours: [4] })).not.toContain("night-owl");
    expect(ids({ ...base, localCheckHours: [22] })).not.toContain("night-owl");
  });

  it("perfect-week needs 7 straight fully-checked *completed* days", () => {
    const counts: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) counts[`2026-08-0${i}`] = 3;
    // Day 8 is "today" - not yet completed, so only days 1-7 count, giving
    // exactly one full week.
    expect(ids({ ...base, localDayIndex: 8, localCountsByDate: counts })).toContain("perfect-week");

    // Only 6 completed days (today is day 7) - one short.
    expect(ids({ ...base, localDayIndex: 7, localCountsByDate: counts })).not.toContain(
      "perfect-week",
    );
  });

  it("comeback-kid needs a miss followed by a later perfect day", () => {
    const counts = { "2026-08-01": 3, "2026-08-02": 0, "2026-08-03": 3 };
    expect(ids({ ...base, localDayIndex: 4, localCountsByDate: counts })).toContain("comeback-kid");

    // Perfect, then miss, with no bounce-back after - not a comeback.
    const noBounce = { "2026-08-01": 3, "2026-08-02": 0 };
    expect(ids({ ...base, localDayIndex: 3, localCountsByDate: noBounce })).not.toContain(
      "comeback-kid",
    );
  });

  it("century-club needs 100 total checks across all days", () => {
    expect(ids({ ...base, localCountsByDate: { "2026-08-01": 99 } })).not.toContain("century-club");
    expect(ids({ ...base, localCountsByDate: { "2026-08-01": 60, "2026-08-02": 40 } })).toContain(
      "century-club",
    );
  });
});
