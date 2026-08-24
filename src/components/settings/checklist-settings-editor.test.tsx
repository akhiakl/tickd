import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChecklistSettingsEditor } from "./checklist-settings-editor";
import { txQueue, __resetStoreForTests } from "@/lib/sync/tx-queue";
import { drainController } from "@/lib/sync/drain";
import type { ChecklistItemView } from "@/types/domain";

const { addChecklistItem, removeChecklistItem, renameChecklistItem, reorderChecklistItems } =
  vi.hoisted(() => ({
    addChecklistItem: vi.fn().mockResolvedValue({ ok: true }),
    removeChecklistItem: vi.fn().mockResolvedValue({ ok: true }),
    renameChecklistItem: vi.fn().mockResolvedValue({ ok: true }),
    reorderChecklistItems: vi.fn().mockResolvedValue({ ok: true }),
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

beforeEach(async () => {
  __resetStoreForTests();
  await txQueue.clear();
  drainController.__resetForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  addChecklistItem.mockClear();
  removeChecklistItem.mockClear();
  renameChecklistItem.mockClear();
  reorderChecklistItems.mockClear();
});

describe("ChecklistSettingsEditor", () => {
  it("renames an item optimistically and persists it through the durable queue", async () => {
    render(<ChecklistSettingsEditor groupId="g1" items={items} />);
    fireEvent.change(screen.getByDisplayValue("Wake early"), {
      target: { value: "Wake before 6" },
    });
    expect(await screen.findByDisplayValue("Wake before 6")).toBeInTheDocument();
    await waitFor(() =>
      expect(renameChecklistItem).toHaveBeenCalledWith("g1", "i1", "Wake before 6"),
    );
  });

  it("removes an item optimistically and persists it through the durable queue", async () => {
    render(<ChecklistSettingsEditor groupId="g1" items={items} />);
    const row = screen.getByDisplayValue("Read").closest("div")!;
    fireEvent.click(row.querySelector('button[aria-label="Remove item"]')!);
    expect(screen.queryByDisplayValue("Read")).not.toBeInTheDocument();
    await waitFor(() => expect(removeChecklistItem).toHaveBeenCalledWith("g1", "i2"));
  });

  it("adds a new item optimistically, with the same id reused on the server for idempotency", async () => {
    render(<ChecklistSettingsEditor groupId="g1" items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add an item" }));

    // Painted immediately, not just persisted - unlike the old direct-call
    // version, which didn't render the new row until the next server fetch.
    expect(await screen.findAllByDisplayValue("New item")).toHaveLength(1);

    await waitFor(() => expect(addChecklistItem).toHaveBeenCalledTimes(1));
    const [calledGroupId, calledLabel, calledItemId] = addChecklistItem.mock.calls[0];
    expect(calledGroupId).toBe("g1");
    expect(calledLabel).toBe("New item");
    expect(typeof calledItemId).toBe("string");
    expect(calledItemId.length).toBeGreaterThan(0);
  });

  it("rejects an empty label locally, without ever calling the server action", async () => {
    render(<ChecklistSettingsEditor groupId="g1" items={items} />);
    fireEvent.change(screen.getByDisplayValue("Wake early"), { target: { value: "" } });

    expect(await screen.findByText("Give the item a name.")).toBeInTheDocument();
    expect(renameChecklistItem).not.toHaveBeenCalled();
  });

  it("surfaces a server-declared failure as a toast even when the input itself was valid", async () => {
    renameChecklistItem.mockResolvedValueOnce({
      ok: false,
      error: "Only the group admin can do that.",
    });

    render(<ChecklistSettingsEditor groupId="g1" items={items} />);
    fireEvent.change(screen.getByDisplayValue("Wake early"), { target: { value: "Valid label" } });

    expect(await screen.findByText("Only the group admin can do that.")).toBeInTheDocument();
  });
});
