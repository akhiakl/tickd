import { describe, expect, it } from "vitest";
import { identiconCells } from "./identicon";

describe("identiconCells", () => {
  it("returns a gridSize x gridSize grid", () => {
    const cells = identiconCells("seed-a", 5);
    expect(cells).toHaveLength(5);
    for (const row of cells) expect(row).toHaveLength(5);
  });

  it("is symmetric across the vertical axis on every row", () => {
    const cells = identiconCells("seed-b", 5);
    for (const row of cells) {
      expect(row[0]).toBe(row[4]);
      expect(row[1]).toBe(row[3]);
    }
  });

  it("is deterministic for the same seed", () => {
    expect(identiconCells("same-seed")).toEqual(identiconCells("same-seed"));
  });

  it("differs between different seeds", () => {
    const a = identiconCells("alpha");
    const b = identiconCells("bravo");
    expect(a).not.toEqual(b);
  });
});
