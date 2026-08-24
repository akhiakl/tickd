import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodayLive } from "./today-live";
import type { ChecklistItemView } from "@/types/domain";

const setCheckedMock = vi.fn();
vi.mock("@/server/actions/checklist", () => ({
  setChecked: (...args: unknown[]) => setCheckedMock(...args),
}));

const items: ChecklistItemView[] = [
  { id: "i1", label: "Wake early", position: 0, isSideQuest: false },
  { id: "i2", label: "Side quest", position: 1, isSideQuest: true },
];

const baseProps = {
  groupId: "g1",
  items,
  today: "2026-08-24",
  dayIndex: 5,
  durationDays: 31,
  priorStreak: 0,
};

afterEach(() => {
  vi.restoreAllMocks();
  setCheckedMock.mockReset();
});

describe("TodayLive", () => {
  it("updates the ring's done count instantly, before the write resolves", async () => {
    let resolveWrite: () => void = () => {};
    setCheckedMock.mockReturnValue(
      new Promise((resolve) => {
        resolveWrite = () => resolve({ ok: true });
      }),
    );

    render(<TodayLive {...baseProps} checkedItemIds={[]} />);

    fireEvent.click(screen.getByText("Wake early"));
    // The stat panel's status line flips the instant the optimistic
    // checkmark lands - it doesn't wait for setChecked's own response.
    expect(await screen.findByText("1 left today")).toBeInTheDocument();

    resolveWrite();
  });

  it("serializes writes: a second tap's request doesn't fire until the first settles", async () => {
    const resolvers: (() => void)[] = [];
    setCheckedMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(() => resolve({ ok: true }));
        }),
    );

    render(<TodayLive {...baseProps} checkedItemIds={[]} />);

    fireEvent.click(screen.getByText("Wake early"));
    fireEvent.click(screen.getByText("Side quest"));

    // Both taps land optimistically together...
    await screen.findByText("Clean sweep. All 2 done.");
    // ...but the second write is only queued, not sent, until the first
    // one actually resolves - this is the fix for rapid multi-taps
    // racing each other's cache invalidation server-side (see
    // TodayLive's own comment on queueRef).
    await waitFor(() => expect(setCheckedMock).toHaveBeenCalledTimes(1));

    resolvers[0]();
    await waitFor(() => expect(setCheckedMock).toHaveBeenCalledTimes(2));
    resolvers[1]();
  });

  it("keeps the queue moving even when a write rejects", async () => {
    setCheckedMock.mockRejectedValueOnce(new Error("network blip")).mockResolvedValue({
      ok: true,
    });

    render(<TodayLive {...baseProps} checkedItemIds={[]} />);

    fireEvent.click(screen.getByText("Wake early"));
    fireEvent.click(screen.getByText("Side quest"));

    await waitFor(() => expect(setCheckedMock).toHaveBeenCalledTimes(2));
  });

  it("only celebrates confetti once per day, even after repeated clean sweeps", async () => {
    setCheckedMock.mockResolvedValue({ ok: true });
    const store: Record<string, string> = {};
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((k) => store[k] ?? null);
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => {
      store[k] = v;
    });

    render(<TodayLive {...baseProps} checkedItemIds={["i1"]} />);

    fireEvent.click(screen.getByText("Side quest")); // clean sweep #1
    await screen.findByText("Clean sweep. All 2 done.");
    expect(setItemSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Side quest")); // untick
    fireEvent.click(screen.getByText("Side quest")); // clean sweep #2, same day
    await screen.findByText("Clean sweep. All 2 done.");
    expect(setItemSpy).toHaveBeenCalledTimes(1); // still just once
  });
});
