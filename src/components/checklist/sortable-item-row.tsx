"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function SortableItemRow({
  id,
  label,
  onRename,
  onRemove,
}: {
  id: string;
  label: string;
  onRename: (label: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-surface flex items-center gap-2 rounded-[18px] py-2.5 pr-2 pl-2",
        isDragging && "opacity-40",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="text-faint flex w-6.5 flex-none cursor-grab touch-none items-center justify-center py-1"
      >
        <GripVertical size={15} strokeWidth={2.75} />
      </button>
      <input
        value={label}
        onChange={(e) => onRename(e.target.value)}
        aria-label="Item label"
        className="text-text min-w-0 flex-1 border-0 bg-transparent p-0 text-[14.5px] font-semibold focus:outline-none"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove item"
        className="hover:bg-accent/[0.16] flex h-6.5 w-6.5 flex-none cursor-pointer items-center justify-center rounded-full transition-colors"
      >
        <X size={14} strokeWidth={2.75} className="text-accent-d" />
      </button>
    </div>
  );
}
