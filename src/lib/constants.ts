/** Default checklist offered when creating a group; the last slot is a free-form "side quest". */
export const DEFAULT_CHECKLIST_ITEMS = [
  "Exercise for 30 minutes",
  "Walk 10,000+ steps",
  "Drink 2L+ water",
  "Sleep 7+ hours",
  "No junk food",
  "Read 10 pages",
  "No alcohol or smoking",
  "Side quest",
];

/** Avatar color swatches offered on join/account screens. */
export const AVATAR_SWATCHES = ["#55743f", "#7a8a5e", "#3d472b", "#8fa073", "#c67139", "#8c491a"];

export const CHALLENGE_DURATIONS = [21, 31] as const;

export const RANK_FILTERS = ["week", "month", "all"] as const;
export type RankFilter = (typeof RANK_FILTERS)[number];

export const SIDE_QUEST_PATTERN = /side quest/i;
