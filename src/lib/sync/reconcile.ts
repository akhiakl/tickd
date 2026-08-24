import type { TxRow } from "@/lib/sync/tx-queue";
import type { ChecklistItemView } from "@/types/domain";

/**
 * Applies every still-queued checklist-item mutation (everything except
 * `setChecked`, which targets check state rather than the item list) onto
 * a server-rendered item list, in the order they were queued - see
 * docs/local-first-sync-engine-plan.md's Phase 2. Used once on mount so a
 * reload right after an offline edit shows that edit immediately instead
 * of the server's last-synced list until the queue drains.
 *
 * Pure and synchronous: `rows` should already be filtered to the group in
 * question (callers read the whole queue via `txQueue.listPending()`,
 * which spans every group).
 */
export function applyPendingChecklistMutations(
  items: ChecklistItemView[],
  rows: TxRow[],
): ChecklistItemView[] {
  let result = items;

  for (const row of rows) {
    switch (row.kind) {
      case "renameChecklistItem": {
        const { itemId, label } = row.payload;
        result = result.map((item) => (item.id === itemId ? { ...item, label } : item));
        break;
      }
      case "removeChecklistItem": {
        const { itemId } = row.payload;
        result = result.filter((item) => item.id !== itemId);
        break;
      }
      case "addChecklistItem": {
        const { itemId, label } = row.payload;
        // Guards against applying the same queued add twice (e.g. this
        // function called again after a partial reconcile) - a real
        // duplicate insert is already prevented server-side too (see
        // addChecklistItem's onConflictDoNothing), this just keeps the
        // locally-rendered list from doing the same.
        if (result.some((item) => item.id === itemId)) break;
        result = [...result, { id: itemId, label, position: result.length, isSideQuest: false }];
        break;
      }
      case "reorderChecklistItems": {
        const { orderedItemIds } = row.payload;
        const byId = new Map(result.map((item) => [item.id, item]));
        const ordered = orderedItemIds
          .map((id) => byId.get(id))
          .filter((item): item is ChecklistItemView => item !== undefined);
        // Anything not named in this queued order (most likely an add
        // queued after it) stays appended at the end rather than dropped.
        const remaining = result.filter((item) => !orderedItemIds.includes(item.id));
        result = [...ordered, ...remaining];
        break;
      }
      case "setChecked":
        break;
    }
  }

  return result;
}

/** Same idea as `applyPendingChecklistMutations`, for the checked-item set
 * `setChecked` targets. Returns a new Set reflecting every pending row for
 * this group, applied in queue order, on top of the server-rendered
 * `checkedIds`. */
export function applyPendingChecks(checkedIds: ReadonlySet<string>, rows: TxRow[]): Set<string> {
  const result = new Set(checkedIds);
  for (const row of rows) {
    if (row.kind !== "setChecked") continue;
    if (row.payload.checked) result.add(row.payload.checklistItemId);
    else result.delete(row.payload.checklistItemId);
  }
  return result;
}
