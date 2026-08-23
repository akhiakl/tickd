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
  /** Count of checklist items ticked, keyed by `YYYY-MM-DD`. */
  countsByDate: Record<string, number>;
  /** Checklist item ids ticked, keyed by `YYYY-MM-DD`, for cell breakdowns. */
  itemsByDate: Record<string, string[]>;
};

export type GroupSnapshot = {
  id: string;
  name: string;
  inviteCode: string;
  startDate: string;
  durationDays: number;
  archived: boolean;
  today: string;
  dayIndex: number;
  items: ChecklistItemView[];
  members: MemberSnapshot[];
  myRole: MemberRole;
};

export type { RankWindow };
