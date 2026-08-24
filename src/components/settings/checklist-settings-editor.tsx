"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { txQueue } from "@/lib/sync/tx-queue";
import { drainController } from "@/lib/sync/drain";
import { applyPendingChecklistMutations } from "@/lib/sync/reconcile";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import { SortableItemRow } from "@/components/checklist/sortable-item-row";
import type { ChecklistItemView } from "@/types/domain";

export function ChecklistSettingsEditor({
  groupId,
  items,
}: {
  groupId: string;
  items: ChecklistItemView[];
}) {
  const [, startTransition] = useTransition();
  // Plain useState, not useOptimistic - see today-live.tsx's comment on
  // the same choice: useOptimistic reverts to `items` once its enclosing
  // transition settles, which would silently undo the mount-time
  // reconciliation effect below.
  const [optimisticItems, setOptimisticItems] = useState(items);
  const { message, showToast } = useToast();

  // Same durable-queue path as the Today checklist's setChecked - see
  // src/lib/sync/drain.ts and docs/local-first-sync-engine-plan.md. A
  // terminal failure (not an admin, a bad label, ...) surfaces here the
  // same way it would have from a direct rejected call; a transport
  // failure is retried in the background instead.
  useEffect(() => {
    drainController.setErrorHandler(showToast);
    drainController.start();
    return () => drainController.setErrorHandler(null);
  }, [showToast]);

  // Phase 2 (docs/local-first-sync-engine-plan.md) - same mount-time
  // reconciliation as TodayLive's, so reopening Settings right after an
  // offline edit shows that edit immediately instead of the server's
  // last-synced list until the queue drains. Not wrapped in
  // startTransition - see rename()'s own comment on why a plain setState
  // needs to be called outside one to actually paint promptly.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = (await txQueue.listPending()).filter((r) => r.payload.groupId === groupId);
      if (cancelled || rows.length === 0) return;
      setOptimisticItems(applyPendingChecklistMutations(items, rows));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = optimisticItems.findIndex((i) => i.id === active.id);
    const to = optimisticItems.findIndex((i) => i.id === over.id);
    const next = arrayMove(optimisticItems, from, to);

    setOptimisticItems(next);
    startTransition(async () => {
      await txQueue.enqueue("reorderChecklistItems", {
        groupId,
        orderedItemIds: next.map((i) => i.id),
      });
      drainController.kick();
    });
  }

  function rename(itemId: string, label: string) {
    // Plain state, not useOptimistic (see this component's earlier
    // comment on why), so the update has to be dispatched *outside*
    // startTransition to paint in the same tick as the keystroke - a
    // setState made inside a still-pending transition doesn't actually
    // paint until that transition's async work finishes.
    setOptimisticItems(optimisticItems.map((i) => (i.id === itemId ? { ...i, label } : i)));
    startTransition(async () => {
      const row = await txQueue.enqueue("renameChecklistItem", { groupId, itemId, label });
      // Same message the server would have returned for the same bad
      // input (checklistItemLabelSchema) - checked client-side first so
      // typing an empty/too-long name fails instantly instead of after a
      // round trip that was never going to succeed.
      if (!row) {
        showToast("Give the item a name.");
        return;
      }
      drainController.kick();
    });
  }

  function remove(itemId: string) {
    setOptimisticItems(optimisticItems.filter((i) => i.id !== itemId));
    startTransition(async () => {
      await txQueue.enqueue("removeChecklistItem", { groupId, itemId });
      drainController.kick();
    });
  }

  function addItem() {
    // Generated here (not left to the server) so the same id both paints
    // the optimistic row below and becomes the inserted row's real id -
    // that's what makes a retried add idempotent instead of a duplicate
    // (see addChecklistItem's own doc in src/server/actions/checklist.ts).
    const itemId = crypto.randomUUID();
    setOptimisticItems([
      ...optimisticItems,
      { id: itemId, label: "New item", position: optimisticItems.length, isSideQuest: false },
    ]);
    startTransition(async () => {
      await txQueue.enqueue("addChecklistItem", { groupId, itemId, label: "New item" });
      drainController.kick();
    });
  }

  // The keyboard sensor's default coordinate getter moves a fixed pixel
  // step, which doesn't reliably cross into the next row. Swap in the
  // sortable-aware getter so Space + Arrow keys reorder one slot at a time.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <div className="relative">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={optimisticItems} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5" data-testid="checklist-items">
            {optimisticItems.map((item) => (
              <SortableItemRow
                key={item.id}
                id={item.id}
                label={item.label}
                onRename={(label) => rename(item.id, label)}
                onRemove={() => remove(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addItem}
        className="border-text/25 text-muted hover:border-accent hover:text-accent-d mt-2.5 w-full cursor-pointer rounded-[18px] border-[1.5px] border-dashed py-3 text-[14px] font-bold"
      >
        + Add an item
      </button>
      <Toast message={message} />
    </div>
  );
}
