import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGroupLiveSync } from "./use-group-live-sync";
import { drainController } from "./drain";

const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

// Pulled in transitively via drainController (used for the self-sync
// guard) - unmocked, this would try to construct a real DB client (see
// src/server/actions/checklist.ts -> src/server/db) and throw for lack of
// DATABASE_URL, same reason drain.test.ts/today-live.test.tsx mock it.
vi.mock("@/server/actions/checklist", () => ({
  setChecked: vi.fn(),
  reorderChecklistItems: vi.fn(),
  renameChecklistItem: vi.fn(),
  removeChecklistItem: vi.fn(),
  addChecklistItem: vi.fn(),
}));

const POLL_INTERVAL_MS = 15_000;

function mockFetchOnce(updatedAt: number) {
  return { ok: true, json: async () => ({ updatedAt }) };
}

function setVisibility(state: DocumentVisibilityState) {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);
}

beforeEach(() => {
  setVisibility("visible");
  drainController.__resetForTests();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  routerRefreshMock.mockClear();
});

describe("useGroupLiveSync", () => {
  it("doesn't poll immediately on mount - the first poll only establishes a baseline", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockFetchOnce(100));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useGroupLiveSync("g1"));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledWith("/api/g/g1/sync-status", { cache: "no-store" });
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it("refreshes when a later poll sees a newer timestamp", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockFetchOnce(100))
      .mockResolvedValueOnce(mockFetchOnce(200));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useGroupLiveSync("g1"));
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); // first poll: establishes baseline 100
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(routerRefreshMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); // second poll: sees 200
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't refresh when the timestamp is unchanged", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockFetchOnce(100));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useGroupLiveSync("g1"));
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it("doesn't refresh for a change this device caused itself", async () => {
    // Simulates the tx queue having just landed a write - see
    // DrainController.getLastLocalSyncAt's own doc for why this matters:
    // setChecked et al. touch the same tag:group:<id> timestamp this poll
    // watches, so without this guard a device would router.refresh()
    // right after every one of its own taps finishes syncing.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockFetchOnce(100))
      .mockResolvedValueOnce(mockFetchOnce(200));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useGroupLiveSync("g1"));
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); // baseline 100
    // @ts-expect-error - reaching into the singleton's private field is
    // the simplest way to simulate "a write just landed" without
    // exercising the whole drain loop in this hook-focused test.
    drainController.lastLocalSyncAt = Date.now();

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); // sees 200 - but self-caused
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it("still refreshes for a genuine change well outside the self-sync grace window", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockFetchOnce(100))
      .mockResolvedValueOnce(mockFetchOnce(200));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useGroupLiveSync("g1"));
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); // baseline 100
    // @ts-expect-error - see the test above.
    drainController.lastLocalSyncAt = Date.now() - 60_000; // long past the grace window

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't poll while the tab is hidden, even once the interval elapses", async () => {
    setVisibility("hidden");
    const fetchMock = vi.fn().mockResolvedValue(mockFetchOnce(100));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useGroupLiveSync("g1"));
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("survives a fetch rejection without throwing, and tries again next tick", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValue(mockFetchOnce(100));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useGroupLiveSync("g1"));
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
