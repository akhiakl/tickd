import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChecklistSettingsEditor } from "./checklist-settings-editor";
import type { ChecklistItemView } from "@/types/domain";

const { addChecklistItem, removeChecklistItem, renameChecklistItem, reorderChecklistItems } =
  vi.hoisted(() => ({
    addChecklistItem: vi.fn().mockResolvedValue({}),
    removeChecklistItem: vi.fn().mockResolvedValue({}),
    renameChecklistItem: vi.fn().mockResolvedValue({}),
    reorderChecklistItems: vi.fn().mockResolvedValue({}),
  }));

vi.mock("@/server/actions/checklist", () => ({
  addChecklistItem,
  removeChecklistItem,
  renameChecklistItem,
  reorderChecklistItems,
}));

const items: ChecklistItemView[] = [
  { id: "i1", label: "Wake early", position: 0, isSideQuest: false },
  { id: "i2", label: "Read", position: 1, isSideQuest: false },
];

describe("ChecklistSettingsEditor", () => {
  it("renames an item optimistically and persists it", async () => {
    render(<ChecklistSettingsEditor groupId="g1" items={items} />);
    fireEvent.change(screen.getByDisplayValue("Wake early"), {
      target: { value: "Wake before 6" },
    });
    expect(await screen.findByDisplayValue("Wake before 6")).toBeInTheDocument();
    expect(renameChecklistItem).toHaveBeenCalledWith("g1", "i1", "Wake before 6");
  });

  it("removes an item optimistically and persists it", async () => {
    render(<ChecklistSettingsEditor groupId="g1" items={items} />);
    const row = screen.getByDisplayValue("Read").closest("div")!;
    fireEvent.click(row.querySelector('button[aria-label="Remove item"]')!);
    expect(screen.queryByDisplayValue("Read")).not.toBeInTheDocument();
    expect(removeChecklistItem).toHaveBeenCalledWith("g1", "i2");
  });

  it("adds a new item on the server", () => {
    render(<ChecklistSettingsEditor groupId="g1" items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add an item" }));
    expect(addChecklistItem).toHaveBeenCalledWith("g1", "New item");
  });
});
