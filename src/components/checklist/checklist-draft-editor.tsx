"use client";

import { useId, useState } from "react";
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
import { SortableItemRow } from "./sortable-item-row";

type DraftItem = { id: string; label: string };

/** Local, unsaved checklist editor used on the create-group screen. */
export function ChecklistDraftEditor({
  initialLabels,
  onChange,
}: {
  initialLabels: string[];
  onChange: (labels: string[]) => void;
}) {
  const reactId = useId();
  const [items, setItems] = useState<DraftItem[]>(() =>
    initialLabels.map((label, i) => ({ id: `${reactId}-${i}`, label })),
  );

  function update(next: DraftItem[]) {
    setItems(next);
    onChange(next.map((item) => item.label));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    update(arrayMove(items, from, to));
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
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-faint text-[11px] tracking-[0.1em] uppercase">Daily checklist</span>
        <span className="text-muted text-[12px]">{items.length} items - drag to reorder</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5" data-testid="checklist-items">
            {items.map((item) => (
              <SortableItemRow
                key={item.id}
                id={item.id}
                label={item.label}
                onRename={(label) =>
                  update(items.map((i) => (i.id === item.id ? { ...i, label } : i)))
                }
                onRemove={() => update(items.filter((i) => i.id !== item.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={() =>
          update([...items, { id: `${reactId}-${items.length}-${Date.now()}`, label: "New item" }])
        }
        className="border-text/25 text-muted hover:border-accent hover:text-accent-d mt-2.5 w-full cursor-pointer rounded-[18px] border-[1.5px] border-dashed py-3 text-[14px] font-bold"
      >
        + Add an item
      </button>
    </div>
  );
}
