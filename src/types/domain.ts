import type { RankWindow } from "@/lib/challenge-stats";

export type MemberRole = "admin" | "member";

export type ChecklistItemView = {
  id: string;
  label: string;
  position: number;
  isSideQuest: boolean;
};

export type MemberSnapshot = {
  userId: string;
  name: string;
  /** Set only once a guest saves credentials (src/server/actions/auth.ts's
   * setCredentials); null otherwise, including for every Auth0 member. */
  username: string | null;
  color: string;
  avatarSeed: string;
  role: MemberRole;
  isMe: boolean;
  /** This member's elected IANA zone (src/server/actions/account.ts's
   * `setTimezone`) - a browser/network default only pre-fills the account
   * settings picker, it's never written without the person choosing it.
   * Null until they've set one. */
  timezone: string | null;
  /** Count of checklist items ticked, keyed by the UTC `YYYY-MM-DD` the
   * check was written under (`daily_checks.date`) - the single shared
   * calendar the Wall plots every member on together. Never personalized:
   * see `localCountsByDate` for this member's own-timezone view of the
   * same data. */
  countsByDate: Record<string, number>;
  /** Checklist item ids ticked, keyed the same UTC way as `countsByDate`. */
  itemsByDate: Record<string, string[]>;
  /** This member's own "today", read in their own timezone (UTC if unset) -
   * independent of whoever's viewing, and of the Wall's shared UTC "today".
   * Used to frame this member's own streak/profile. */
  localToday: string;
  /** 1-based challenge day for `localToday`, clamped to the challenge's
   * duration - this member's own day count, which can be one ahead or
   * behind another member's depending on where each of them elected. */
  localDayIndex: number;
  /** Same shape as `countsByDate`/`itemsByDate`, but bucketed from each
   * check's real `checkedAt` instant reinterpreted in this member's own
   * timezone, rather than the shared UTC `date` column. This is what
   * "did they finish today" and "their streak" mean everywhere except the
   * Wall - see localToday/localDayIndex's comments. */
  localCountsByDate: Record<string, number>;
  localItemsByDate: Record<string, string[]>;
};

export type GroupSnapshot = {
  id: string;
  name: string;
  inviteCode: string;
  startDate: string;
  durationDays: number;
  archived: boolean;
  /** The viewer's own `localToday`/`localDayIndex` (see MemberSnapshot) -
   * frames "Day X of Y" and the Today checklist around the viewer's own
   * elected timezone. The Wall stays on the UTC calendar regardless; see
   * countsByDate's comment. */
  today: string;
  dayIndex: number;
  items: ChecklistItemView[];
  members: MemberSnapshot[];
  myRole: MemberRole;
};

export type { RankWindow };
