import { dateRange } from "@/lib/challenge-stats";

export type Badge = {
  id: string;
  emoji: string;
  label: string;
  description: string;
};

/** All the data a badge check needs, deliberately narrower than a full
 * MemberSnapshot - keeps this pure and easy to unit test against a plain
 * object rather than the real query shape. */
export type BadgeInput = {
  startDate: string;
  itemCount: number;
  localToday: string;
  localDayIndex: number;
  localCountsByDate: Record<string, number>;
  localCheckHours: number[];
};

const EARLY_BIRD_HOUR = 7; // before 7am
const NIGHT_OWL_START_HOUR = 23; // 11pm or later...
const NIGHT_OWL_END_HOUR = 4; // ...or before 4am
const PERFECT_WEEK_LENGTH = 7;
const CENTURY_CLUB_TOTAL = 100;

export const ALL_BADGES: Badge[] = [
  {
    id: "founding-member",
    emoji: "🏁",
    label: "Founding member",
    description: "Finished everything on day 1",
  },
  {
    id: "early-bird",
    emoji: "🌅",
    label: "Early bird",
    description: "Checked something off before 7am, their own time",
  },
  {
    id: "night-owl",
    emoji: "🦉",
    label: "Night owl",
    description: "Checked something off between 11pm and 4am, their own time",
  },
  {
    id: "perfect-week",
    emoji: "✅",
    label: "Perfect week",
    description: "A full 7-day run with nothing missed",
  },
  {
    id: "comeback-kid",
    emoji: "🔄",
    label: "Comeback kid",
    description: "Missed a day, then bounced back to a perfect one",
  },
  {
    id: "century-club",
    emoji: "💯",
    label: "Century club",
    description: "100 items checked off, all-time",
  },
];

/** Days that have fully played out (today doesn't count until it's over -
 * see localToday/localDayIndex's comments in src/types/domain.ts), oldest
 * first. */
function completedDates(input: BadgeInput): string[] {
  if (input.localDayIndex <= 1) return [];
  return dateRange(input.startDate, input.localDayIndex - 1);
}

function hasFoundingMember(input: BadgeInput): boolean {
  return (input.localCountsByDate[input.startDate] ?? 0) === input.itemCount && input.itemCount > 0;
}

function hasEarlyBird(input: BadgeInput): boolean {
  return input.localCheckHours.some((h) => h < EARLY_BIRD_HOUR);
}

function hasNightOwl(input: BadgeInput): boolean {
  return input.localCheckHours.some((h) => h >= NIGHT_OWL_START_HOUR || h < NIGHT_OWL_END_HOUR);
}

function hasPerfectWeek(input: BadgeInput): boolean {
  const dates = completedDates(input);
  if (dates.length < PERFECT_WEEK_LENGTH || input.itemCount === 0) return false;
  for (let start = 0; start <= dates.length - PERFECT_WEEK_LENGTH; start++) {
    const week = dates.slice(start, start + PERFECT_WEEK_LENGTH);
    if (week.every((d) => (input.localCountsByDate[d] ?? 0) === input.itemCount)) return true;
  }
  return false;
}

function hasComebackKid(input: BadgeInput): boolean {
  if (input.itemCount === 0) return false;
  const dates = completedDates(input);
  const firstMiss = dates.findIndex((d) => (input.localCountsByDate[d] ?? 0) === 0);
  if (firstMiss === -1) return false;
  return dates
    .slice(firstMiss + 1)
    .some((d) => (input.localCountsByDate[d] ?? 0) === input.itemCount);
}

function hasCenturyClub(input: BadgeInput): boolean {
  const total = Object.values(input.localCountsByDate).reduce((sum, n) => sum + n, 0);
  return total >= CENTURY_CLUB_TOTAL;
}

const CHECKS: Record<string, (input: BadgeInput) => boolean> = {
  "founding-member": hasFoundingMember,
  "early-bird": hasEarlyBird,
  "night-owl": hasNightOwl,
  "perfect-week": hasPerfectWeek,
  "comeback-kid": hasComebackKid,
  "century-club": hasCenturyClub,
};

/** Every badge this member has earned so far, in the fixed display order
 * above (not earned-date order - there's no earned-date to sort by, these
 * are recomputed from the current snapshot every time, not stored). */
export function earnedBadges(input: BadgeInput): Badge[] {
  return ALL_BADGES.filter((badge) => CHECKS[badge.id](input));
}
