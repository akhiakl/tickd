import { z } from "zod";

/**
 * Durable, offline-safe queue for checklist mutations - see
 * docs/local-first-sync-engine-plan.md ("Phase 1") for the design this
 * implements. Backed by IndexedDB where available; falls back to an
 * in-memory store (same shape, just not durable across a reload) when
 * IndexedDB is missing or `open()` throws - Safari private browsing and
 * some locked-down environments do exactly that. Fail closed to "works
 * like today, minus offline durability," never throw and break the
 * checklist.
 */

const DB_NAME = "tickd-sync";
const DB_VERSION = 1;
const STORE = "tx_queue";

// Only "setChecked" is wired up in this phase (see the plan's sequencing) -
// extending to reorder/add/rename/remove is adding a key here plus a
// payload schema, once each of those actions has the idempotency property
// a retried queue entry requires (see the plan's Security section).
export const TX_KINDS = ["setChecked"] as const;
export type TxKind = (typeof TX_KINDS)[number];

const payloadSchemas = {
  setChecked: z.object({
    groupId: z.string().min(1),
    checklistItemId: z.string().min(1),
    checked: z.boolean(),
  }),
} satisfies Record<TxKind, z.ZodType>;

export type TxPayload<K extends TxKind = TxKind> = z.infer<(typeof payloadSchemas)[K]>;

const txRowSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(TX_KINDS),
  // Validated against the per-kind schema separately below - z.unknown()
  // here, not z.any(), so a malformed payload has to pass an explicit
  // check rather than slip through untyped.
  payload: z.unknown(),
  createdAt: z.number(),
  attempts: z.number().int().min(0),
  lastError: z.string().optional(),
  /** True once auto-retry has given up on this row (see drain.ts's
   * MAX_AUTO_ATTEMPTS) - it stays queued, but only a manual retry
   * re-attempts it. Never means "dropped": a stuck row is still durable
   * and still eligible to be resumed. */
  stuck: z.boolean().optional(),
});

export type TxRow<K extends TxKind = TxKind> = {
  id: string;
  kind: K;
  payload: TxPayload<K>;
  createdAt: number;
  attempts: number;
  lastError?: string;
  stuck?: boolean;
};

/** Re-validates a row's payload against its own kind's schema. Called both
 * when a row is first enqueued (reject bad input the same way the old
 * inline call would have) and again right before a queued row is sent
 * (defense against a corrupted or tampered IndexedDB entry - see the
 * plan's "Validation" section for why the second check matters even
 * though the first one already ran). Returns null rather than throwing so
 * callers can drop just the one bad row instead of failing the whole
 * drain pass. */
export function validateRow(candidate: unknown): TxRow | null {
  const parsed = txRowSchema.safeParse(candidate);
  if (!parsed.success) return null;
  const payloadSchema = payloadSchemas[parsed.data.kind];
  const payload = payloadSchema.safeParse(parsed.data.payload);
  if (!payload.success) return null;
  return { ...parsed.data, payload: payload.data } as TxRow;
}

/** Stable coalescing key: a second enqueue for the same item while the
 * first is still queued replaces it in place instead of appending a new
 * row - see the plan's "Backoff, circuit breaker" section. Only meaningful
 * for kinds whose payload actually targets one identifiable thing;
 * `setChecked` does (one checklist item, one day). */
function coalesceKey(kind: TxKind, payload: unknown): string | null {
  if (kind === "setChecked") {
    const p = payload as TxPayload<"setChecked">;
    return `setChecked:${p.groupId}:${p.checklistItemId}`;
  }
  return null;
}

type Store = {
  enqueue(kind: TxKind, payload: unknown): Promise<TxRow>;
  listPending(): Promise<TxRow[]>;
  remove(id: string): Promise<void>;
  recordFailure(id: string, error: string, stuck: boolean): Promise<void>;
  /** Clears `stuck` and resets `attempts` to 0 - used by the manual
   * "retry" affordance, which should get a fresh backoff cycle rather
   * than immediately re-hitting whatever ceiling marked it stuck. */
  resetForRetry(id: string): Promise<void>;
  clear(): Promise<void>;
};

function makeRow(kind: TxKind, payload: unknown): TxRow {
  return {
    id: crypto.randomUUID(),
    kind,
    payload: payload as never,
    createdAt: Date.now(),
    attempts: 0,
  };
}

/** In-memory fallback - used automatically when IndexedDB isn't available.
 * Same coalescing/ordering semantics as the durable store, just lost on
 * reload, which matches today's behavior (no offline durability) rather
 * than being a new regression. */
function createMemoryStore(): Store {
  const rows = new Map<string, TxRow>();
  const keyToId = new Map<string, string>();

  return {
    async enqueue(kind, payload) {
      const key = coalesceKey(kind, payload);
      const existingId = key ? keyToId.get(key) : undefined;
      if (existingId && rows.has(existingId)) {
        const existing = rows.get(existingId)!;
        const updated: TxRow = { ...existing, payload: payload as never, createdAt: Date.now() };
        rows.set(existingId, updated);
        return updated;
      }
      const row = makeRow(kind, payload);
      rows.set(row.id, row);
      if (key) keyToId.set(key, row.id);
      return row;
    },
    async listPending() {
      return [...rows.values()].sort((a, b) => a.createdAt - b.createdAt);
    },
    async remove(id) {
      const row = rows.get(id);
      rows.delete(id);
      if (row) {
        const key = coalesceKey(row.kind, row.payload);
        if (key && keyToId.get(key) === id) keyToId.delete(key);
      }
    },
    async recordFailure(id, error, stuck) {
      const row = rows.get(id);
      if (!row) return;
      rows.set(id, { ...row, attempts: row.attempts + 1, lastError: error, stuck });
    },
    async resetForRetry(id) {
      const row = rows.get(id);
      if (!row) return;
      rows.set(id, { ...row, attempts: 0, lastError: undefined, stuck: false });
    },
    async clear() {
      rows.clear();
      keyToId.clear();
    },
  };
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const settle = (db: IDBDatabase | null) => {
      if (settled) return;
      settled = true;
      resolve(db);
    };
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };
      req.onsuccess = () => settle(req.result);
      // Covers both a hard open error and a stuck upgrade (another tab
      // holding the DB open on an older version) - either way, fail
      // closed to the in-memory fallback rather than hang the caller.
      req.onerror = () => settle(null);
      req.onblocked = () => settle(null);
    } catch {
      settle(null);
    }
  });
}

function createIndexedDbStore(db: IDBDatabase): Store {
  function tx(mode: IDBTransactionMode) {
    return db.transaction(STORE, mode).objectStore(STORE);
  }
  function request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    async enqueue(kind, payload) {
      const key = coalesceKey(kind, payload);
      if (key) {
        const existing = (await request(tx("readonly").getAll())).find(
          (r: TxRow) => coalesceKey(r.kind, r.payload) === key,
        );
        if (existing) {
          const updated: TxRow = { ...existing, payload: payload as never, createdAt: Date.now() };
          await request(tx("readwrite").put(updated));
          return updated;
        }
      }
      const row = makeRow(kind, payload);
      await request(tx("readwrite").put(row));
      return row;
    },
    async listPending() {
      const all = await request<TxRow[]>(tx("readonly").getAll());
      return (
        all
          .map(validateRow)
          // A row that fails re-validation is silently excluded from what's
          // drained (and left in place rather than deleted, in case it's a
          // transient read issue) - see the plan's "Validation" section.
          .filter((r): r is TxRow => r !== null)
          .sort((a, b) => a.createdAt - b.createdAt)
      );
    },
    async remove(id) {
      await request(tx("readwrite").delete(id));
    },
    async recordFailure(id, error, stuck) {
      const store = tx("readwrite");
      const existing = await request<TxRow | undefined>(store.get(id));
      if (!existing) return;
      await request(
        store.put({ ...existing, attempts: existing.attempts + 1, lastError: error, stuck }),
      );
    },
    async resetForRetry(id) {
      const store = tx("readwrite");
      const existing = await request<TxRow | undefined>(store.get(id));
      if (!existing) return;
      await request(store.put({ ...existing, attempts: 0, lastError: undefined, stuck: false }));
    },
    async clear() {
      await request(tx("readwrite").clear());
    },
  };
}

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = openDb().then((db) => (db ? createIndexedDbStore(db) : createMemoryStore()));
  }
  return storePromise;
}

/** Test-only hook: forces the next getStore() to re-resolve, so a test can
 * swap in a fresh in-memory store between cases instead of accumulating
 * state across tests. */
export function __resetStoreForTests() {
  storePromise = null;
}

export const txQueue = {
  /** Validates then persists one mutation. Returns null (and persists
   * nothing) if the payload fails validation - same rejection the direct
   * server-action call would have produced, just checked before the
   * network round trip instead of after. */
  async enqueue<K extends TxKind>(kind: K, payload: TxPayload<K>): Promise<TxRow<K> | null> {
    const candidate = { id: crypto.randomUUID(), kind, payload, createdAt: 0, attempts: 0 };
    if (!validateRow(candidate)) return null;
    const store = await getStore();
    return store.enqueue(kind, payload) as Promise<TxRow<K>>;
  },
  async listPending(): Promise<TxRow[]> {
    const store = await getStore();
    return store.listPending();
  },
  async remove(id: string): Promise<void> {
    const store = await getStore();
    return store.remove(id);
  },
  async recordFailure(id: string, error: string, stuck: boolean): Promise<void> {
    const store = await getStore();
    return store.recordFailure(id, error, stuck);
  },
  async resetForRetry(id: string): Promise<void> {
    const store = await getStore();
    return store.resetForRetry(id);
  },
  async clear(): Promise<void> {
    const store = await getStore();
    return store.clear();
  },
};
