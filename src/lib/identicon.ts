/**
 * A GitHub/Slack-style symmetric identicon pattern, deterministic from a
 * seed string. No crypto needed - a small string hash is plenty of entropy
 * for a 5x5 grid, and determinism (same seed always draws the same
 * pattern) is the whole point, not unpredictability.
 */

const DEFAULT_GRID_SIZE = 5;

/**
 * A small, dependency-free string hash (FNV-1a), good enough to scatter
 * cell fill bits without any actual randomness requirement. Callers must
 * NOT use bit 0 of the result for anything: multiplying by an odd constant
 * (as FNV-1a's prime is) leaves the least-significant bit unchanged by
 * each multiply step, so it ends up a simple XOR-parity of the input's
 * character codes rather than a well-mixed bit - nearby/similar seeds can
 * collide on it constantly. Higher bits mix properly (multiplication
 * carries propagate upward), so `identiconCells` reads bit 16 instead.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Returns a `gridSize x gridSize` boolean grid, symmetric across the
 * vertical axis (only the left half + center column are computed per row;
 * the right half mirrors it), matching classic GitHub identicon layout.
 */
export function identiconCells(seed: string, gridSize: number = DEFAULT_GRID_SIZE): boolean[][] {
  const half = Math.ceil(gridSize / 2);
  const rows: boolean[][] = [];

  for (let row = 0; row < gridSize; row++) {
    const left: boolean[] = [];
    for (let col = 0; col < half; col++) {
      left.push(((hash(`${seed}:${row}:${col}`) >>> 16) & 1) === 0);
    }
    const mirrored = left.slice(0, gridSize - half).reverse();
    rows.push([...left, ...mirrored]);
  }

  return rows;
}
