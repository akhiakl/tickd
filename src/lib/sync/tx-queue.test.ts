import { afterEach, describe, expect, it } from "vitest";
import { txQueue, validateRow, __resetStoreForTests } from "./tx-queue";

afterEach(async () => {
  await txQueue.clear();
  __resetStoreForTests();
});

describe("txQueue (in-memory fallback - jsdom has no IndexedDB)", () => {
  it("enqueues and lists a row in FIFO order", async () => {
    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i1", checked: true });
    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i2", checked: true });
    const rows = await txQueue.listPending();
    expect(rows.map((r) => (r.payload as { checklistItemId: string }).checklistItemId)).toEqual([
      "i1",
      "i2",
    ]);
  });

  it("rejects a malformed payload instead of persisting it", async () => {
    // @ts-expect-error - deliberately wrong shape, this is the point of the test
    const row = await txQueue.enqueue("setChecked", { groupId: "g1" });
    expect(row).toBeNull();
    expect(await txQueue.listPending()).toHaveLength(0);
  });

  it("coalesces a second enqueue for the same item into the existing row", async () => {
    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i1", checked: true });
    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i1", checked: false });
    const rows = await txQueue.listPending();
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toMatchObject({ checked: false });
  });

  it("keeps distinct items as separate rows", async () => {
    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i1", checked: true });
    await txQueue.enqueue("setChecked", { groupId: "g1", checklistItemId: "i2", checked: true });
    expect(await txQueue.listPending()).toHaveLength(2);
  });

  it("removes a row by id", async () => {
    const row = await txQueue.enqueue("setChecked", {
      groupId: "g1",
      checklistItemId: "i1",
      checked: true,
    });
    await txQueue.remove(row!.id);
    expect(await txQueue.listPending()).toHaveLength(0);
  });

  it("recordFailure increments attempts and can mark a row stuck", async () => {
    const row = await txQueue.enqueue("setChecked", {
      groupId: "g1",
      checklistItemId: "i1",
      checked: true,
    });
    await txQueue.recordFailure(row!.id, "Network error", false);
    await txQueue.recordFailure(row!.id, "Network error", true);
    const [after] = await txQueue.listPending();
    expect(after.attempts).toBe(2);
    expect(after.stuck).toBe(true);
    expect(after.lastError).toBe("Network error");
  });

  it("resetForRetry clears stuck and attempts", async () => {
    const row = await txQueue.enqueue("setChecked", {
      groupId: "g1",
      checklistItemId: "i1",
      checked: true,
    });
    await txQueue.recordFailure(row!.id, "boom", true);
    await txQueue.resetForRetry(row!.id);
    const [after] = await txQueue.listPending();
    expect(after.attempts).toBe(0);
    expect(after.stuck).toBe(false);
    expect(after.lastError).toBeUndefined();
  });
});

describe("validateRow", () => {
  it("accepts a well-formed row", () => {
    const row = validateRow({
      id: "abc",
      kind: "setChecked",
      payload: { groupId: "g1", checklistItemId: "i1", checked: true },
      createdAt: 0,
      attempts: 0,
    });
    expect(row).not.toBeNull();
  });

  it("rejects an unknown kind - defends against schema drift/corruption reading storage back", () => {
    const row = validateRow({
      id: "abc",
      kind: "deleteEverything",
      payload: {},
      createdAt: 0,
      attempts: 0,
    });
    expect(row).toBeNull();
  });

  it("rejects a row whose payload doesn't match its kind's schema", () => {
    const row = validateRow({
      id: "abc",
      kind: "setChecked",
      payload: { groupId: "g1", checklistItemId: "i1", checked: "yes" }, // not a boolean
      createdAt: 0,
      attempts: 0,
    });
    expect(row).toBeNull();
  });
});
