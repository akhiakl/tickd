import { describe, expect, it } from "vitest";
import {
  challengeDayIndex,
  computeBestStreak,
  computeStreak,
  computeTotal,
  currentStreakWithToday,
  dateRange,
  daysBetween,
  rankScore,
} from "./challenge-stats";

describe("daysBetween", () => {
  it("counts whole days between two ISO dates", () => {
    expect(daysBetween("2026-08-01", "2026-08-12")).toBe(11);
    expect(daysBetween("2026-08-01", "2026-08-01")).toBe(0);
  });

  it("never goes negative", () => {
    expect(daysBetween("2026-08-12", "2026-08-01")).toBe(0);
  });
});

describe("challengeDayIndex", () => {
  it("is 1 on the start date", () => {
    expect(challengeDayIndex("2026-08-01", 31, "2026-08-01")).toBe(1);
  });

  it("clamps to the challenge duration once it's over", () => {
    expect(challengeDayIndex("2026-08-01", 31, "2026-09-15")).toBe(31);
  });

  it("matches the prototype's day-12 sample state", () => {
    expect(challengeDayIndex("2026-08-01", 31, "2026-08-12")).toBe(12);
  });
});

describe("dateRange", () => {
  it("produces an inclusive run of ISO dates", () => {
    expect(dateRange("2026-08-01", 3)).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
  });
});

describe("computeStreak", () => {
  it("counts back from the end while days are non-zero", () => {
    expect(computeStreak([8, 0, 8, 8, 8])).toBe(3);
  });

  it("is zero when the most recent day is empty", () => {
    expect(computeStreak([8, 8, 0])).toBe(0);
  });

  it("is zero for an empty history", () => {
    expect(computeStreak([])).toBe(0);
  });
});

describe("currentStreakWithToday", () => {
  it("keeps yesterday's streak alive when today has no ticks yet", () => {
    expect(currentStreakWithToday([8, 8, 8, 8, 0])).toBe(4);
  });

  it("adds one the moment today has a tick", () => {
    expect(currentStreakWithToday([8, 8, 8, 8, 1])).toBe(5);
  });

  it("is zero if yesterday was already a gap, even with a tick today", () => {
    expect(currentStreakWithToday([8, 0, 1])).toBe(1);
  });

  it("handles a history of just today", () => {
    expect(currentStreakWithToday([0])).toBe(0);
    expect(currentStreakWithToday([3])).toBe(1);
  });
});

describe("computeBestStreak", () => {
  it("finds the longest run anywhere in the history", () => {
    expect(computeBestStreak([8, 8, 0, 8, 8, 8, 0, 8])).toBe(3);
  });

  it("is zero when nothing was ever done", () => {
    expect(computeBestStreak([0, 0, 0])).toBe(0);
  });
});

describe("computeTotal", () => {
  it("sums every day's count", () => {
    expect(computeTotal([8, 0, 4, 2])).toBe(14);
  });
});

describe("rankScore", () => {
  it("sums everything for the all-time window", () => {
    expect(rankScore([8, 8, 8], "all")).toBe(24);
  });

  it("only sums the trailing 7 days for the week window", () => {
    const history = [8, 8, 8, 8, 8, 8, 8, 8, 1, 1, 1, 1, 1, 1, 1];
    expect(rankScore(history, "week")).toBe(7);
  });
});
