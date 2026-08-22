"use client";

import { useOptimistic, useTransition } from "react";
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
import {
  addChecklistItem,
  removeChecklistItem,
  renameChecklistItem,
  reorderChecklistItems,
} from "@/server/actions/checklist";
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
  const [optimisticItems, setOptimisticItems] = useOptimistic(items);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = optimisticItems.findIndex((i) => i.id === active.id);
    const to = optimisticItems.findIndex((i) => i.id === over.id);
    const next = arrayMove(optimisticItems, from, to);

    startTransition(async () => {
      setOptimisticItems(next);
      await reorderChecklistItems({ groupId, orderedItemIds: next.map((i) => i.id) });
    });
  }

  function rename(itemId: string, label: string) {
    startTransition(async () => {
      setOptimisticItems(optimisticItems.map((i) => (i.id === itemId ? { ...i, label } : i)));
      await renameChecklistItem(groupId, itemId, label);
    });
  }

  function remove(itemId: string) {
    startTransition(async () => {
      setOptimisticItems(optimisticItems.filter((i) => i.id !== itemId));
      await removeChecklistItem(groupId, itemId);
    });
  }

  function addItem() {
    startTransition(async () => {
      await addChecklistItem(groupId, "New item");
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
    <div>
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
    </div>
  );
}
