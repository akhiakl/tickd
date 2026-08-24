import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayLive } from "./today-live";
import { txQueue, __resetStoreForTests } from "@/lib/sync/tx-queue";
import { drainController } from "@/lib/sync/drain";
import type { ChecklistItemView } from "@/types/domain";

const setCheckedMock = vi.fn();
const renameChecklistItemMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/server/actions/checklist", () => ({
  setChecked: (...args: unknown[]) => setCheckedMock(...args),
  renameChecklistItem: (...args: unknown[]) => renameChecklistItemMock(...args),
  // Not exercised by these tests, but drain.ts imports all five - an
  // unmocked export would be undefined and throw if the drain loop ever
  // reached one.
  reorderChecklistItems: vi.fn().mockResolvedValue({ ok: true }),
  removeChecklistItem: vi.fn().mockResolvedValue({ ok: true }),
  addChecklistItem: vi.fn().mockResolvedValue({ ok: true }),
}));

// TodayLive's Phase 3 live-sync poll (useGroupLiveSync) needs an App
// Router context useRouter() can find, which jsdom/Vitest doesn't provide
// on its own - stub the whole module instead. The poll's own fetch is
// stubbed globally below so it never makes a real network call.
const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
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

beforeEach(async () => {
  __resetStoreForTests();
  await txQueue.clear();
  drainController.__resetForTests();
  // Never resolves ok - useGroupLiveSync's poll no-ops on a non-ok
  // response, same as a real network blip on this read-only endpoint.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setCheckedMock.mockReset();
  renameChecklistItemMock.mockClear();
  routerRefreshMock.mockClear();
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
    // checkmark lands - it doesn't wait for the write to reach the queue,
    // let alone the network.
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
    // one actually resolves - the durable queue's drain loop keeps the
    // same one-in-flight invariant the old in-memory queueRef had (see
    // today-live.tsx's own comment on why that matters for cache
    // invalidation ordering).
    await waitFor(() => expect(setCheckedMock).toHaveBeenCalledTimes(1));

    resolvers[0]();
    await waitFor(() => expect(setCheckedMock).toHaveBeenCalledTimes(2));
    resolvers[1]();
  });

  it("surfaces a terminal failure as a toast and still processes the next queued item", async () => {
    setCheckedMock
      .mockResolvedValueOnce({ ok: false, error: "This challenge hasn't started yet." })
      .mockResolvedValue({ ok: true });

    render(<TodayLive {...baseProps} checkedItemIds={[]} />);

    fireEvent.click(screen.getByText("Wake early"));
    fireEvent.click(screen.getByText("Side quest"));

    expect(await screen.findByText("This challenge hasn't started yet.")).toBeInTheDocument();
    await waitFor(() => expect(setCheckedMock).toHaveBeenCalledTimes(2));
  });

  it("shows a pending offline tick as checked on mount, before the queue drains", async () => {
    let resolveWrite: () => void = () => {};
    setCheckedMock.mockReturnValue(
      new Promise((resolve) => {
        resolveWrite = () => resolve({ ok: true });
      }),
    );
    // As if a tap was made offline in a previous session and never synced.
    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i2", checked: true });

    render(<TodayLive {...baseProps} checkedItemIds={[]} />);

    // i2 renders checked once the (async) reconciliation lands, not from
    // checkedItemIds, which (matching a stale server) says nothing is
    // done. waitFor rather than findByText, since the text itself is
    // present either way - only the class changes once reconciled.
    await waitFor(() => expect(screen.getByText("Side quest")).toHaveClass("line-through"));
    resolveWrite();
  });

  it("shows a pending offline rename on mount, before the queue drains", async () => {
    renameChecklistItemMock.mockReturnValue(new Promise(() => {})); // never resolves - stays queued
    await txQueue.enqueue("renameChecklistItem", {
      groupId: "g1",
      itemId: "i1",
      label: "Wake before 6",
    });

    render(<TodayLive {...baseProps} checkedItemIds={[]} />);

    expect(await screen.findByText("Wake before 6")).toBeInTheDocument();
    expect(screen.queryByText("Wake early")).not.toBeInTheDocument();
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
