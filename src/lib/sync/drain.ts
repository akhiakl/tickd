import { setChecked } from "@/server/actions/checklist";
import { txQueue, validateRow, type TxKind, type TxPayload, type TxRow } from "@/lib/sync/tx-queue";
import type { ActionResult } from "@/server/actions/result";

/**
 * Drains the durable tx queue against the real server actions - see
 * docs/local-first-sync-engine-plan.md ("Error handling, failsafes,
 * validation, security") for the reasoning behind every choice here.
 */

// Each kind maps to the *existing, unmodified* server action - the queue is
// a delivery mechanism, not a new trust boundary; every call still runs
// through requireUserId/requireMembership/requireAdminMembership and the
// Zod schemas in src/server/validation/schemas.ts exactly as it does when
// called directly.
const executors: { [K in TxKind]: (payload: TxPayload<K>) => Promise<ActionResult> } = {
  setChecked: (p) => setChecked(p.groupId, p.checklistItemId, p.checked),
};

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
// Once a transport failure has been retried this many times, auto-retry
// stops and the row is marked "stuck" (still queued, not dropped) - see
// the plan's "Backoff, circuit breaker" section on why an uncapped retry
// loop is its own failure mode.
const MAX_AUTO_ATTEMPTS = 12;

export function backoffDelayMs(attempts: number): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempts);
  // Full jitter: spreads reconnecting tabs/devices out instead of all
  // retrying on the same tick.
  return Math.round(exp * (0.5 + Math.random() * 0.5));
}

/** A transport failure never reached the server and is safe to retry once
 * connectivity looks better; a terminal failure means the server ran the
 * action and rejected it, which retrying won't change. See the plan's
 * "Error classification" section - this is deliberately a narrow
 * allow-list for "retry," not a broad one for "give up," so an
 * unrecognized error shape fails safe toward *not* silently dropping a
 * write. */
export function classifyFailure(error: unknown): "transport" | "terminal" {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "transport";
  if (error instanceof TypeError) return "transport";
  if (error instanceof Error && /fetch|network|failed to fetch/i.test(error.message)) {
    return "transport";
  }
  return "terminal";
}

type Listener = () => void;
type Status = { pendingCount: number; stuckCount: number };

class DrainController {
  private listeners = new Set<Listener>();
  private status: Status = { pendingCount: 0, stuckCount: 0 };
  private draining = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private started = false;
  private onError: ((message: string) => void) | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): Status {
    return this.status;
  }

  setErrorHandler(handler: ((message: string) => void) | null) {
    this.onError = handler;
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  private async refreshStatus() {
    const pending = await txQueue.listPending();
    this.status = {
      pendingCount: pending.filter((r) => !r.stuck).length,
      stuckCount: pending.filter((r) => r.stuck).length,
    };
    this.emit();
  }

  /** Idempotent - safe to call from every mount that wants the queue
   * flowing (there's normally one Today page mounted at a time, but this
   * doesn't assume that). */
  start() {
    if (this.started) return;
    this.started = true;
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.kick());
    }
    void this.refreshStatus();
    this.kick();
  }

  /** Nudge a drain pass to run soon. Called after every enqueue and on
   * reconnect; cheap to call repeatedly since a pass already in flight or
   * scheduled just no-ops. */
  kick() {
    if (this.draining) return;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runPass();
    }, 0);
  }

  /** Retries a specific stuck row immediately, resetting its backoff -
   * wired to the manual "retry" affordance in the UI. */
  async retryNow(id: string) {
    await txQueue.resetForRetry(id);
    this.kick();
  }

  /** Retries every currently-stuck row - wired to the header's "Retry"
   * affordance, which acts on all of them at once rather than making the
   * user retry a backlog one item at a time. */
  async retryAllStuck() {
    const rows = await txQueue.listPending();
    await Promise.all(rows.filter((r) => r.stuck).map((r) => txQueue.resetForRetry(r.id)));
    this.kick();
  }

  /** Test-only: returns this singleton to a clean slate between test
   * cases - it otherwise persists timers/flags across every test in a
   * file, since it's one module-level instance by design (see the class
   * doc). */
  __resetForTests() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.draining = false;
    this.started = false;
    this.onError = null;
    this.status = { pendingCount: 0, stuckCount: 0 };
    this.listeners.clear();
  }

  private async runPass() {
    if (this.draining) return;
    this.draining = true;
    try {
      // Best-effort cross-tab coordination: two tabs open on the same
      // account shouldn't both fire the same request concurrently.
      // Purely a courtesy against redundant traffic - correctness doesn't
      // depend on it, since every queued action is idempotent (see the
      // plan's Security section), so an environment without Web Locks
      // (or a lock that times out) just proceeds unlocked.
      if (typeof navigator !== "undefined" && navigator.locks) {
        await navigator.locks.request("tickd-sync-drain", { ifAvailable: true }, async (lock) => {
          if (lock) await this.drainLoop();
        });
      } else {
        await this.drainLoop();
      }
    } finally {
      this.draining = false;
      await this.refreshStatus();
    }
  }

  private async drainLoop() {
    for (;;) {
      const pending = await txQueue.listPending();
      const next = pending.find((r) => !r.stuck);
      if (!next) return;
      const ok = await this.sendOne(next);
      if (!ok) return; // transport failure - stop this pass, `kick()` (online/backoff) will resume it
    }
  }

  /** Returns true if the queue should keep draining (this row is settled,
   * one way or another), false if a transport failure means the rest of
   * the queue should wait too - retrying item 2 while item 1's network is
   * down would just fail the same way. */
  private async sendOne(row: TxRow): Promise<boolean> {
    // Re-validate right before sending - see tx-queue.ts's validateRow doc
    // for why a row already accepted at enqueue time is checked again here.
    if (!validateRow(row)) {
      await txQueue.remove(row.id);
      return true;
    }

    const execute = executors[row.kind] as (p: unknown) => Promise<ActionResult>;
    try {
      const result = await execute(row.payload);
      if (result.ok) {
        await txQueue.remove(row.id);
        return true;
      }
      // Terminal: the server understood the request and said no (bad
      // input, "hasn't started yet", etc). Retrying won't change that.
      await txQueue.remove(row.id);
      this.onError?.(result.error);
      return true;
    } catch (error) {
      const kind = classifyFailure(error);
      if (kind === "terminal") {
        await txQueue.remove(row.id);
        this.onError?.(error instanceof Error ? error.message : "That change couldn't be saved.");
        return true;
      }
      const attempts = row.attempts + 1;
      const stuck = attempts >= MAX_AUTO_ATTEMPTS;
      await txQueue.recordFailure(
        row.id,
        error instanceof Error ? error.message : "Network error",
        stuck,
      );
      if (!stuck) {
        this.timer = setTimeout(() => {
          this.timer = null;
          this.kick();
        }, backoffDelayMs(attempts));
      }
      return false;
    }
  }
}

export const drainController = new DrainController();
