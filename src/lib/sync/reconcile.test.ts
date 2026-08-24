import { describe, expect, it } from "vitest";
import { applyPendingChecklistMutations, applyPendingChecks } from "./reconcile";
import type { TxRow } from "./tx-queue";
import type { ChecklistItemView } from "@/types/domain";

function row<K extends TxRow["kind"]>(kind: K, payload: Extract<TxRow, { kind: K }>["payload"]) {
  return {
    id: crypto.randomUUID(),
    kind,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  } as TxRow;
}

const items: ChecklistItemView[] = [
  { id: "i1", label: "Wake early", position: 0, isSideQuest: false },
  { id: "i2", label: "Read", position: 1, isSideQuest: false },
];

describe("applyPendingChecklistMutations", () => {
  it("returns the same list untouched when there's nothing pending", () => {
    expect(applyPendingChecklistMutations(items, [])).toEqual(items);
  });

  it("applies a pending rename", () => {
    const result = applyPendingChecklistMutations(items, [
      row("renameChecklistItem", { groupId: "g1", itemId: "i1", label: "Wake before 6" }),
    ]);
    expect(result.find((i) => i.id === "i1")?.label).toBe("Wake before 6");
  });

  it("applies a pending remove", () => {
    const result = applyPendingChecklistMutations(items, [
      row("removeChecklistItem", { groupId: "g1", itemId: "i2" }),
    ]);
    expect(result.map((i) => i.id)).toEqual(["i1"]);
  });

  it("applies a pending add, appended at the end", () => {
    const result = applyPendingChecklistMutations(items, [
      row("addChecklistItem", { groupId: "g1", itemId: "i3", label: "New item" }),
    ]);
    expect(result.map((i) => i.id)).toEqual(["i1", "i2", "i3"]);
    expect(result[2]).toMatchObject({ label: "New item", isSideQuest: false });
  });

  it("doesn't insert the same pending add twice", () => {
    const result = applyPendingChecklistMutations(items, [
      row("addChecklistItem", { groupId: "g1", itemId: "i3", label: "New item" }),
      row("addChecklistItem", { groupId: "g1", itemId: "i3", label: "New item" }),
    ]);
    expect(result.filter((i) => i.id === "i3")).toHaveLength(1);
  });

  it("applies a pending reorder", () => {
    const result = applyPendingChecklistMutations(items, [
      row("reorderChecklistItems", { groupId: "g1", orderedItemIds: ["i2", "i1"] }),
    ]);
    expect(result.map((i) => i.id)).toEqual(["i2", "i1"]);
  });

  it("appends an item not named in a pending reorder instead of dropping it", () => {
    // e.g. an add queued after the reorder that named it.
    const result = applyPendingChecklistMutations(items, [
      row("reorderChecklistItems", { groupId: "g1", orderedItemIds: ["i2", "i1"] }),
      row("addChecklistItem", { groupId: "g1", itemId: "i3", label: "New item" }),
    ]);
    expect(result.map((i) => i.id)).toEqual(["i2", "i1", "i3"]);
  });

  it("applies multiple pending rows in order", () => {
    const result = applyPendingChecklistMutations(items, [
      row("renameChecklistItem", { groupId: "g1", itemId: "i1", label: "Renamed" }),
      row("removeChecklistItem", { groupId: "g1", itemId: "i2" }),
      row("addChecklistItem", { groupId: "g1", itemId: "i3", label: "New item" }),
    ]);
    expect(result.map((i) => [i.id, i.label])).toEqual([
      ["i1", "Renamed"],
      ["i3", "New item"],
    ]);
  });

  it("ignores a setChecked row - it doesn't target the item list", () => {
    const result = applyPendingChecklistMutations(items, [
      row("setChecked", { groupId: "g1", checklistItemId: "i1", checked: true }),
    ]);
    expect(result).toEqual(items);
  });
});

describe("applyPendingChecks", () => {
  it("adds a pending check", () => {
    const result = applyPendingChecks(new Set(), [
      row("setChecked", { groupId: "g1", checklistItemId: "i1", checked: true }),
    ]);
    expect(result).toEqual(new Set(["i1"]));
  });

  it("removes a pending un-check", () => {
    const result = applyPendingChecks(new Set(["i1"]), [
      row("setChecked", { groupId: "g1", checklistItemId: "i1", checked: false }),
    ]);
    expect(result).toEqual(new Set());
  });

  it("ignores rows targeting the item list, not check state", () => {
    const result = applyPendingChecks(new Set(["i1"]), [
      row("removeChecklistItem", { groupId: "g1", itemId: "i1" }),
    ]);
    expect(result).toEqual(new Set(["i1"]));
  });

  it("doesn't mutate the input set", () => {
    const input = new Set(["i1"]);
    applyPendingChecks(input, [
      row("setChecked", { groupId: "g1", checklistItemId: "i2", checked: true }),
    ]);
    expect(input).toEqual(new Set(["i1"]));
  });
});
