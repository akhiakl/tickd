/**
 * Playful call-out copy for a member currently "in the gap" (missed
 * yesterday, nothing today either - see `MemberListRow.gapped` in
 * src/components/today/member-list.tsx) - shown next to their cracked
 * avatar on the Today member list. Same tone as the poke messages in
 * src/server/actions/nudge.ts, just aimed at the whole group rather than
 * sent to one person.
 *
 * Picked deterministically from `seed` rather than `Math.random()`, so
 * the line doesn't reshuffle on every render or tab navigation - only
 * once a day, when the seed (userId + that day's date) itself changes.
 */
const ROAST_LINES: ((name: string) => string)[] = [
  (name) => `${name} left a gap. The wall remembers.`,
  (name) => `${name} - still nothing. Bold strategy.`,
  (name) => `${name}'s list is just sitting there. Two days now.`,
  (name) => `${name} is one tap away from fixing this.`,
  (name) => `${name}: any day now.`,
];

/** A small, stable string hash - good enough to pick an index, not meant
 * to be collision-resistant. */
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function roastLine(name: string, seed: string): string {
  const line = ROAST_LINES[hash(seed) % ROAST_LINES.length];
  return line(name);
}
