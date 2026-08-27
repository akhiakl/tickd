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

/** Avatar color swatches offered on join/account screens - shown up front,
 * no expanding needed. */
export const AVATAR_SWATCHES = ["#55743f", "#7a8a5e", "#3d472b", "#8fa073", "#c67139", "#8c491a"];

/** Extra swatches revealed by the "More colors" toggle in Account settings -
 * broadens past AVATAR_SWATCHES' green/rust family into blue, purple, red,
 * and neutral tones, kept at the same muted/matte saturation so a color
 * from either list still looks like it belongs to the same app. */
export const AVATAR_SWATCHES_MORE = [
  "#3f6b6b",
  "#2e5266",
  "#5b7fa6",
  "#4b5a8c",
  "#6b4f8c",
  "#93577a",
  "#a13d3d",
  "#c9973f",
  "#6e5a3d",
  "#4a4038",
  "#2f4a3d",
  "#7a6a4f",
];

/** Every selectable avatar color, AVATAR_SWATCHES followed by
 * AVATAR_SWATCHES_MORE - what schemas.ts's avatarColorSchema validates
 * against, so a color picked from either list actually saves. */
export const ALL_AVATAR_SWATCHES = [...AVATAR_SWATCHES, ...AVATAR_SWATCHES_MORE];

export const CHALLENGE_DURATIONS = [21, 31] as const;

export const RANK_FILTERS = ["week", "month", "all"] as const;
export type RankFilter = (typeof RANK_FILTERS)[number];

export const SIDE_QUEST_PATTERN = /side quest/i;
