import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGroupLiveSync } from "./use-group-live-sync";

const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

function mockFetchOnce(updatedAt: number) {
  return { ok: true, json: async () => ({ updatedAt }) };
}

function setVisibility(state: DocumentVisibilityState) {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);
}

beforeEach(() => {
  setVisibility("visible");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  routerRefreshMock.mockClear();
});

describe("useGroupLiveSync", () => {
  it("doesn't refresh on the first poll - there's nothing to compare it against yet", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockFetchOnce(100));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useGroupLiveSync("g1"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/g/g1/sync-status", { cache: "no-store" }),
    );
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it("refreshes when a later poll sees a newer timestamp", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockFetchOnce(100))
      .mockResolvedValueOnce(mockFetchOnce(200));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    renderHook(() => useGroupLiveSync("g1"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("doesn't refresh when the timestamp is unchanged", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockFetchOnce(100));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    renderHook(() => useGroupLiveSync("g1"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(routerRefreshMock).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("doesn't poll while the tab is hidden", async () => {
    setVisibility("hidden");
    const fetchMock = vi.fn().mockResolvedValue(mockFetchOnce(100));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useGroupLiveSync("g1"));
    await new Promise((r) => setTimeout(r, 10));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("survives a fetch rejection without throwing, and tries again next tick", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValue(mockFetchOnce(100));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    renderHook(() => useGroupLiveSync("g1"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
