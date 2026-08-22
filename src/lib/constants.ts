/** Default checklist offered when creating a group; the last slot is a free-form "side quest". */
export const DEFAULT_CHECKLIST_ITEMS = [
  "Wake before 7",
  "Move for 45 min",
  "3 litres of water",
  "Read 20 pages",
  "No sugar",
  "10,000 steps",
  "Lights out by 11",
  "Side quest",
];

/** Avatar color swatches offered on join/account screens. */
export const AVATAR_SWATCHES = ["#55743f", "#7a8a5e", "#3d472b", "#8fa073", "#c67139", "#8c491a"];

export const CHALLENGE_DURATIONS = [21, 31] as const;

export const RANK_FILTERS = ["week", "month", "all"] as const;
export type RankFilter = (typeof RANK_FILTERS)[number];

export const SIDE_QUEST_PATTERN = /side quest/i;
