import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodayChecklist } from "./today-checklist";
import type { ChecklistItemView } from "@/types/domain";

vi.mock("@/server/actions/checklist", () => ({
  toggleCheck: vi.fn().mockResolvedValue({ ok: true }),
}));

const items: ChecklistItemView[] = [
  { id: "i1", label: "Wake early", position: 0, isSideQuest: false },
  { id: "i2", label: "Side quest", position: 1, isSideQuest: true },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TodayChecklist", () => {
  it("renders items unchecked when nothing is done yet", () => {
    render(<TodayChecklist groupId="g1" items={items} checkedItemIds={[]} today="2026-08-24" />);
    expect(screen.getByText("Wake early")).toBeInTheDocument();
    expect(screen.getByText("SIDE QUEST")).toBeInTheDocument();
  });

  it("ticks an item optimistically and shows progress toward the total", async () => {
    render(<TodayChecklist groupId="g1" items={items} checkedItemIds={[]} today="2026-08-24" />);
    fireEvent.click(screen.getByText("Wake early"));
    expect(await screen.findByText("Ticked - 1/2")).toBeInTheDocument();
  });

  it("announces a clean sweep once every item is ticked", async () => {
    render(
      <TodayChecklist groupId="g1" items={items} checkedItemIds={["i1"]} today="2026-08-24" />,
    );
    fireEvent.click(screen.getByText("Side quest"));
    expect(await screen.findByText("Clean sweep. All 2 done.")).toBeInTheDocument();
  });

  it("unticking a checked item doesn't show a toast", () => {
    render(
      <TodayChecklist groupId="g1" items={items} checkedItemIds={["i1"]} today="2026-08-24" />,
    );
    fireEvent.click(screen.getByText("Wake early"));
    expect(screen.queryByText(/Ticked/)).not.toBeInTheDocument();
  });

  it("only celebrates confetti once per day, even after repeated clean sweeps", async () => {
    const store: Record<string, string> = {};
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((k) => store[k] ?? null);
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => {
      store[k] = v;
    });

    render(
      <TodayChecklist groupId="g1" items={items} checkedItemIds={["i1"]} today="2026-08-24" />,
    );

    fireEvent.click(screen.getByText("Side quest")); // clean sweep #1
    await screen.findByText("Clean sweep. All 2 done.");
    expect(setItemSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Side quest")); // untick
    fireEvent.click(screen.getByText("Side quest")); // clean sweep #2, same day
    await screen.findByText("Clean sweep. All 2 done.");
    expect(setItemSpy).toHaveBeenCalledTimes(1); // still just once
  });
});
