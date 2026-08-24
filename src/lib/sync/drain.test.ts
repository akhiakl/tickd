import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { txQueue, __resetStoreForTests } from "./tx-queue";
import { drainController, classifyFailure, backoffDelayMs } from "./drain";

const setCheckedMock = vi.fn();
vi.mock("@/server/actions/checklist", () => ({
  setChecked: (...args: unknown[]) => setCheckedMock(...args),
}));

beforeEach(async () => {
  __resetStoreForTests();
  await txQueue.clear();
  drainController.__resetForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  setCheckedMock.mockReset();
  vi.useRealTimers();
});

describe("classifyFailure", () => {
  it("treats a TypeError (what a failed fetch throws) as transport", () => {
    expect(classifyFailure(new TypeError("Failed to fetch"))).toBe("transport");
  });

  it("treats any error as transport while the browser reports offline", () => {
    const spy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(classifyFailure(new Error("boom"))).toBe("transport");
    spy.mockRestore();
  });

  it("treats a thrown domain/authorization error as terminal, not retryable", () => {
    expect(classifyFailure(new Error("Only the group admin can do that."))).toBe("terminal");
  });
});

describe("backoffDelayMs", () => {
  it("grows exponentially up to the ceiling", () => {
    vi.spyOn(Math, "random").mockReturnValue(1); // no jitter reduction
    expect(backoffDelayMs(0)).toBe(1000);
    expect(backoffDelayMs(1)).toBe(2000);
    expect(backoffDelayMs(2)).toBe(4000);
    expect(backoffDelayMs(10)).toBe(30000); // capped, doesn't keep growing
  });
});

describe("DrainController", () => {
  it("drains a successful write and clears the queue", async () => {
    setCheckedMock.mockResolvedValue({ ok: true });
    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i1", checked: true });

    drainController.start();

    await vi.waitFor(async () => {
      expect(await txQueue.listPending()).toHaveLength(0);
    });
    expect(setCheckedMock).toHaveBeenCalledWith("g1", "i1", true);
  });

  it("drops a terminal (ok:false) failure and reports it, without blocking the next row", async () => {
    setCheckedMock
      .mockResolvedValueOnce({ ok: false, error: "This challenge hasn't started yet." })
      .mockResolvedValueOnce({ ok: true });
    const onError = vi.fn();
    drainController.setErrorHandler(onError);

    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i1", checked: true });
    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i2", checked: true });

    drainController.start();

    await vi.waitFor(async () => {
      expect(await txQueue.listPending()).toHaveLength(0);
    });
    expect(setCheckedMock).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith("This challenge hasn't started yet.");
  });

  it("retries a transport failure with backoff instead of dropping it", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(1); // deterministic max-jitter delay
    setCheckedMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true });

    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i1", checked: true });
    drainController.start();

    await vi.advanceTimersByTimeAsync(0); // the initial kick()'s pass
    expect(setCheckedMock).toHaveBeenCalledTimes(1);
    // Still queued - a transport failure is never dropped, only retried.
    expect(await txQueue.listPending()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(2001); // past backoffDelayMs(1)'s 2000ms ceiling
    expect(setCheckedMock).toHaveBeenCalledTimes(2);
    expect(await txQueue.listPending()).toHaveLength(0);
  });

  it("marks a row stuck after exhausting auto-retries, without ever dropping it", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    setCheckedMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i1", checked: true });
    drainController.start();

    // Comfortably more than 12 attempts' worth of (capped) backoff.
    await vi.advanceTimersByTimeAsync(400_000);

    const [row] = await txQueue.listPending();
    expect(row.stuck).toBe(true);
    expect(row.attempts).toBe(12);
    // Auto-retry stopped - no 13th call once marked stuck.
    expect(setCheckedMock).toHaveBeenCalledTimes(12);
  });

  it("retryAllStuck resets a stuck row so the next drain pass attempts it again", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    setCheckedMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i1", checked: true });
    drainController.start();
    await vi.advanceTimersByTimeAsync(400_000);
    expect((await txQueue.listPending())[0].stuck).toBe(true);

    setCheckedMock.mockResolvedValue({ ok: true });
    await drainController.retryAllStuck();
    await vi.advanceTimersByTimeAsync(0);

    expect(await txQueue.listPending()).toHaveLength(0);
  });
});
