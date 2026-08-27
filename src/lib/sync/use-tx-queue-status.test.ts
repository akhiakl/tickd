import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTxQueueStatus } from "./use-tx-queue-status";

// getSnapshot has to return a referentially stable value between calls when
// nothing's changed (useSyncExternalStore re-renders forever otherwise, the
// same trap drain.ts's own SERVER_SNAPSHOT comment warns about) - so this
// mock holds one mutable `snapshot` in closure and only ever swaps the
// reference via setSnapshot, never returns a fresh object literal per call.
const { drainController, setSnapshot } = vi.hoisted(() => {
  let snapshot = { pendingCount: 0, stuckCount: 0 };
  let listener: (() => void) | null = null;
  return {
    drainController: {
      start: vi.fn(),
      subscribe: vi.fn((l: () => void) => {
        listener = l;
        return () => {
          listener = null;
        };
      }),
      getSnapshot: vi.fn(() => snapshot),
      getListener: () => listener,
      notify: () => listener?.(),
    },
    setSnapshot: (next: { pendingCount: number; stuckCount: number }) => {
      snapshot = next;
    },
  };
});

vi.mock("@/lib/sync/drain", () => ({ drainController }));

describe("useTxQueueStatus", () => {
  it("starts the drain controller and subscribes on mount", () => {
    renderHook(() => useTxQueueStatus());
    expect(drainController.start).toHaveBeenCalled();
    expect(drainController.subscribe).toHaveBeenCalled();
  });

  it("reflects the controller's current snapshot", () => {
    setSnapshot({ pendingCount: 2, stuckCount: 1 });
    const { result } = renderHook(() => useTxQueueStatus());
    expect(result.current).toEqual({ pendingCount: 2, stuckCount: 1 });
  });

  it("re-renders when the controller notifies a change", () => {
    setSnapshot({ pendingCount: 0, stuckCount: 0 });
    const { result } = renderHook(() => useTxQueueStatus());
    expect(result.current).toEqual({ pendingCount: 0, stuckCount: 0 });

    act(() => {
      setSnapshot({ pendingCount: 1, stuckCount: 0 });
      drainController.notify();
    });
    expect(result.current).toEqual({ pendingCount: 1, stuckCount: 0 });
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useTxQueueStatus());
    expect(drainController.getListener()).not.toBeNull();
    unmount();
    expect(drainController.getListener()).toBeNull();
  });
});
