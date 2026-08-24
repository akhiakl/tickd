# Local-first sync engine for Tickd — design plan

## Status

- **Phase 1 (durable transaction queue) — implemented**, covering all five
  checklist mutations: `setChecked`, `reorderChecklistItems`,
  `renameChecklistItem`, `removeChecklistItem`, `addChecklistItem`. See
  `src/lib/sync/tx-queue.ts` (IndexedDB store, in-memory fallback,
  per-kind Zod validation reused from `src/server/validation/schemas.ts`,
  per-kind coalescing), `src/lib/sync/drain.ts` (retry/backoff/
  circuit-breaker drain loop, error classification, the kind→action
  executor map), and `src/lib/sync/use-tx-queue-status.ts` (the status hook
  backing `today-header.tsx`'s "syncing…" / "couldn't sync - Retry"
  affordance). `today-live.tsx` and `checklist-settings-editor.tsx` both
  enqueue through this instead of calling the server actions directly.
  `addChecklistItem` gained an optional `clientId` param
  (`src/server/actions/checklist.ts`) plus `onConflictDoNothing`, so a
  retried add reuses the same row id instead of inserting the item twice -
  the idempotency property the plan's Security section called out as a
  precondition for queuing it. Covered by `tx-queue.test.ts`,
  `drain.test.ts`, and the updated `today-live.test.tsx` /
  `checklist-settings-editor.test.tsx`.
- `reorderChecklistItems` is queued as a plain full-order overwrite, per
  the plan's "What not to build" - no LWW/conflict-resolution layer yet.
  Revisit only if concurrent-reorder conflicts turn out to be a real
  problem in practice.
- Phases 2 (local snapshot store) and 3 (live sync resolver) are still design
  only - not started.

## Why, and why carefully

Tickd's write path today (`src/server/actions/checklist.ts` + `TodayLive`) is already
optimistic: `useOptimistic` paints a tick instantly, a `queueRef` promise chain
serializes the actual `setChecked` server-action calls so concurrent taps can't
race each other's cache invalidation, and `revalidatePath` / `updateTag` refresh
the server-cached snapshot (`getGroupCore`, tagged `group:<id>`) once the write
lands. That covers the common case well. What it doesn't cover, and what the
architecture in the brief adds, is:

- **No offline durability.** A tick made with no network is just a promise that
  rejects; nothing is queued to retry, and a reload loses it.
- **No local persistence.** Every reload re-fetches `getGroupCore` from Postgres;
  there's no IndexedDB layer, so first paint always waits on the network.
- **No live cross-member sync.** Other members only see your tick after _they_
  navigate and `getGroupCore` re-runs — there's no push from server to other
  open clients. (`src/server/push/send.ts` sends _Web Push notifications_,
  which wake a device, not an in-page WebSocket sync channel.)

This plan proposes bringing in the queue + local-store pieces of the
architecture where Tickd's shape actually benefits, and explicitly not
building the parts that would be over-engineering for this app's data shape.
Scope recommendation is in "What not to build" below — read that before the
phases, since it explains why this isn't a 1:1 port of the diagram.

## Current write/read path (baseline)

```
TodayChecklist (dumb button grid)
  → TodayLive.toggle()
      1. checkedRef mutated synchronously (source of truth for toast/confetti math)
      2. setOptimisticChecked(snapshot)   — useOptimistic, paints instantly
      3. queueRef.current = queueRef.current.then(() => setChecked(...))
           → "use server" action: requireMembership, insert/delete daily_checks,
             revalidatePath + updateTag("group:<id>")
  ← next render of the group layout re-runs getGroupCore (React cache() + "use cache: remote")
```

Failure mode today: step 3 rejects (offline, server error) → the checkbox
already painted checked, the write never happened, and nothing tells the
queue to retry — the next real render (or reload) silently reverts it.

## Target architecture (scoped to Tickd)

```
┌─────────────┐   dispatch    ┌──────────────┐   drain    ┌───────────────┐
│ TodayLive /  │ ────────────▶│ Tx Queue      │──────────▶│ Server Action  │
│ TodayChecklist│  (sync,     │ (IndexedDB,   │  (retry,   │ setChecked /   │
│ (React state) │  no network)│ append-only)  │  backoff)  │ reorder / etc. │
└─────────────┘               └──────────────┘             └───────┬───────┘
       ▲                              ▲                             │
       │ subscribe                    │ bootstrap on load           │ writes + touches
       │                       ┌──────┴───────┐                    ▼
       │                       │ Local store   │             ┌───────────┐
       └───────────────────────│ (IndexedDB:   │◀────────────│ Postgres  │
         object graph re-hydrated  group snapshot,  sync msg  └─────┬─────┘
         from local store           tx log)                        │
                                                                     ▼
                                                            SSE / WS broadcast
                                                            (per group room)
```

Key departure from the brief's diagram: Tickd doesn't need a general
**in-memory reactive object graph** (MobX-style proxies over an arbitrary
entity graph) — the domain is small and shaped like one aggregate per screen
(`GroupSnapshot`, already computed server-side by `getGroupSnapshot`). React
state + `useOptimistic`/`useSyncExternalStore` already gives us "mutate and
re-render" for that shape without adopting a new reactivity library. What's
missing isn't reactivity, it's **durability of the pending write** and
**a live update channel from other members**. The plan below builds those two
pieces and leaves the render layer as React state reading from them.

## Phase 1 — Durable transaction queue (offline-safe writes)

**Goal:** a tick/reorder/rename made offline is never lost, and retries
automatically once connectivity returns, without changing what the user sees
(still instant).

- New module `src/lib/sync/tx-queue.ts` (client-only): a thin wrapper over
  IndexedDB (via the native API or `idb`) storing `{ id, groupId, kind,
payload, createdAt, attempts }` rows in an append-only `tx_queue` object
  store, one DB per origin (`tickd-sync`).
- Replace `TodayLive`'s `queueRef` promise chain with a call into this queue:
  `enqueue({ kind: "setChecked", groupId, checklistItemId, checked })`.
  The queue itself keeps the existing serialization property (drain
  strictly in FIFO order per group) — that invariant doesn't change, it just
  moves from an in-memory `Promise` chain to a persisted log so it survives a
  reload/crash mid-flight.
- A drain loop (started once, e.g. from a small provider mounted in
  `src/app/g/[groupId]/layout.tsx`) pops the oldest un-sent row, calls the
  matching existing server action (`setChecked`, `reorderChecklistItems`,
  `addChecklistItem`, ...), and on success deletes the row; on failure
  (network error specifically, not a validation `ActionResult.ok === false`)
  leaves it queued and retries with backoff, resuming on the browser's
  `online` event.
- A validation rejection (`ok: false`, e.g. "challenge hasn't started yet")
  is terminal, not retried — it's removed from the queue and surfaced as the
  existing toast; only transport failures get requeued.
- `today-checklist.tsx` / `TodayLive` need no visual changes — the optimistic
  paint is unchanged, this only replaces where the pending write lives while
  in flight.
- A small "syncing…" / "N changes pending" affordance (e.g. in
  `today-header.tsx`) reads the queue's row count, so offline users get
  feedback instead of a checkbox that looks done with no indication it
  hasn't actually reached the server yet.

This phase is the highest-value, lowest-risk slice: it's additive, touches
one write path first (`setChecked`, the highest-frequency mutation), and is
independently shippable/testable before Phase 2 exists.

## Phase 2 — Local store + instant bootstrap

**Goal:** opening a group renders from disk immediately, then reconciles with
the network — instead of every navigation waiting on `getGroupCore`.

- Mirror `GroupSnapshot` (already the exact shape `getGroupSnapshot`
  produces) into an IndexedDB `group_snapshot` store, keyed by `groupId`,
  written after every successful fetch.
- On mount, a client boundary in `src/app/g/[groupId]/page.tsx`'s tree reads
  the cached snapshot synchronously (via `useSyncExternalStore`) for first
  paint, then the existing server-rendered fetch reconciles it — effectively
  stale-while-revalidate, but the "stale" copy is the member's own last-known
  state rather than a loading spinner.
- This is the one piece that benefits from _some_ client-side store
  abstraction; given the domain is one snapshot object per group rather than
  a graph of independently-mutable entities, a plain `Map<groupId,
GroupSnapshot>` behind `useSyncExternalStore` is enough — no need for
  MobX/Zustand/Valtio.

## Phase 3 — Live sync resolver (cross-member push)

**Goal:** when a groupmate ticks an item, everyone else's open tab updates
without a manual reload.

- Lowest-lift option given the stack (Vercel + no existing WS
  infrastructure): Server-Sent Events. Add `src/app/api/g/[groupId]/events/
route.ts` streaming a `group:<id>` channel; `setChecked` et al. publish an
  "invalidate group X" message after their existing `updateTag` call (reuse
  `@upstash/redis`, already a dependency, as the pub/sub backbone — no new
  infra to provision).
- Client subscribes per open group page, and on a message either (a) merges
  a small diff payload if the event carries one, or (b) triggers the
  existing `getGroupCore` re-fetch path — (b) first, since it reuses code
  that already exists and is already correct; a diff-based merge is a later
  optimization once (a) proves necessary.
- This phase is genuinely optional relative to Phases 1–2: Tickd's data is
  low-frequency (a handful of ticks/day per person), so "catches up on next
  navigation" may be an acceptable UX bar. Recommend building Phases 1–2
  first and revisiting whether Phase 3 earns its complexity based on real
  usage/feedback.

## What not to build

- **A general in-memory reactive object graph (MobX-style).** Tickd's client
  state is one snapshot per group screen, not a large mutable graph of
  cross-referencing entities the way Linear's issue tracker is. Adopting a
  proxy-based reactivity library would be new architecture for no shape it
  actually needs to model.
- **CRDTs.** Nothing in Tickd is free-text collaborative editing (no
  Notion-style document). Every field mutated here (a boolean tick, an item
  label, a position) already has a natural authoritative resolution and
  Postgres already accepts the write as a single statement — see below.
- **Full LWW timestamp reconciliation as a general mechanism.** `setChecked`
  is already idempotent and commutative (`onConflictDoNothing` /
  delete-by-key) — two devices toggling the same box converges without a
  timestamp comparison. `reorderChecklistItems` (a full-array overwrite) is
  the one mutation where a genuine concurrent-edit conflict is possible;
  scope LWW specifically to that action (compare a `updatedAt` the queue
  carries against the row's current value) rather than building a generic
  conflict-resolution layer up front.

## Error handling, failsafes, validation, security

These apply to every phase, but Phase 1 (the tx queue) is where most of them
land first since it's what actually holds durable, replayable state.

### Error classification (what gets retried vs. what doesn't)

A queued write can fail two structurally different ways, and conflating them
is how you end up either retrying something that will never succeed or
silently dropping something that would have:

- **Transport failure** — the request never reached the server (offline, DNS,
  TLS, a dropped connection mid-flight). Heuristic: `navigator.onLine ===
false` at call time, or the rejection is a `TypeError` (what a `fetch`
  failure surfaces as in every browser). **Retried**, with backoff.
- **Terminal failure** — the server ran the action and said no: an
  `ActionResult` with `ok: false` (bad input, "challenge hasn't started
  yet"), or a thrown authorization error (`requireMembership` /
  `requireAdminMembership`). Retrying changes nothing about _why_ it failed.
  **Not retried** — removed from the queue immediately and surfaced as the
  existing toast, exactly like today's inline failure.

Getting this wrong in either direction is a real failure mode: retrying a
terminal failure spins forever burning battery/requests for a write that can
never land; retrying nothing on a transport blip silently loses the write,
which is the exact bug this whole plan exists to fix.

### Backoff, circuit breaker, and not spinning forever

- Exponential backoff with jitter, capped (e.g. 1s → 30s ceiling), not a
  tight retry loop — a real offline period can last hours, and an
  uncapped/unjittered retry storm from every open tab reconnecting at once
  is its own small DoS against the app's own API.
- A per-row attempt ceiling that doesn't discard the write, only pauses
  _auto_-retry and marks the row "stuck" once transport retries have
  clearly stopped being transient (network's up but this specific request
  keeps failing). Surfaced in the UI with a manual "retry" affordance
  rather than infinite silent background retries.
- **Coalescing**: repeated toggles of the _same_ item while offline collapse
  into one queued row (keyed by `kind:groupId:checklistItemId`), keeping
  only the latest desired state. This is both a UX correctness property
  (only the final state should ever reach the server, not a replay of every
  intermediate tap) and a bound on queue growth — a person fidgeting with
  one checkbox offline can't grow the queue unboundedly.
- Draining is serialized to one in-flight request at a time (continuing the
  existing `queueRef` invariant), and cross-tab drains coordinate through
  the Web Locks API where available, so two tabs open on the same account
  don't both fire the same request concurrently. Not load-bearing for
  correctness (see idempotency below) — it's a courtesy that halves
  redundant traffic, not a thing correctness depends on.

### Validation (defense in depth, not just UX)

- Every queued row's payload is `zod`-validated **twice**: once when it's
  enqueued (client-side, same rejection UX as today - reuses the existing
  schemas like `checklistItemLabelSchema`), and again when it's read back
  out of IndexedDB immediately before being sent. The second pass exists
  because IndexedDB is mutable, same-origin storage: a corrupted write from
  an app-version schema drift, or a malicious browser extension with
  storage access, could otherwise hand a server action attacker-shaped
  input that the UI layer never actually vetted. A row that fails the
  second check is dropped and logged, never sent.
- The **server remains the sole source of truth for validation and
  authorization** — nothing here changes what `setChecked` /
  `reorderChecklistItems` etc. already re-check server-side
  (`requireUserId`, `requireMembership`, `requireAdminMembership`, the
  Zod schemas in `src/server/validation/schemas.ts`, the
  `date < group.startDate` guard). The queue is a delivery mechanism for a
  call the server was always going to re-validate independently, not a
  trust boundary of its own.

### Security

- **No secrets in the queue.** Rows carry only domain identifiers already
  visible to the signed-in user (`groupId`, `checklistItemId`, a boolean) -
  never a session token, credential, or anything an attacker could reuse
  outside this browser profile. Auth stays exactly where it is today:
  server-side, per-request, via the existing session (`requireUserId`).
- **The queue can't grant authority the server wouldn't.** A compromised or
  buggy client can enqueue whatever it wants, but every row still runs
  through the _unmodified_ server action and its membership/role checks
  when drained - queuing a `reorderChecklistItems` call as a non-admin
  fails exactly as it does today, just after a network round trip instead
  of before one.
- **Idempotency is what makes retry-without-double-effect safe.**
  `setChecked` already only reaches its intended state
  (`onConflictDoNothing` / delete-by-key) - a transport failure that
  actually succeeded server-side before the response was lost, then gets
  retried, is a no-op the second time, not a duplicate write. This
  property is _required_ before any action is added to the retryable
  queue; `addChecklistItem` in particular needs an idempotency key (e.g.
  the queued row's own `id` reused as the inserted row's `id`, matching
  the pattern `onConflictDoNothing` already uses) before it's safe to
  queue, since naively retried it would insert the item twice.
- **IndexedDB open failures fail closed, not open.** Safari private
  browsing and some locked-down enterprise policies throw on `indexedDB.
open` rather than just being slow. The queue feature-detects and falls
  back to an in-memory (non-durable) queue in that case - the app keeps
  working exactly as it does today (in-tab optimistic + serialized writes,
  no offline durability), rather than throwing and breaking the checklist
  entirely.
- **Rate/backoff ceiling doubles as self-protection against the client's
  own bugs** - a runaway enqueue loop (a bug, not malice) is still bounded
  by the same coalescing + backoff, so it can't turn into an accidental
  self-inflicted flood of the server action.

### Observability / user-facing failure states

- Pending-row count surfaced in the UI (`today-header.tsx`) so offline
  usage is visible, not silently "look done, might not be."
- A row marked "stuck" (exhausted auto-retries) is distinguishable from
  "pending" - the user gets a manual retry action instead of the app
  quietly giving up in the background forever.

## Suggested sequencing

1. Phase 1 (tx queue) on `setChecked` only, ship and observe.
2. Extend Phase 1's queue to `reorderChecklistItems`, `addChecklistItem`,
   `renameChecklistItem`, `removeChecklistItem`.
3. Phase 2 (local snapshot store + instant bootstrap).
4. Revisit Phase 3 (SSE live sync) based on whether cross-member staleness
   is an actual reported problem.

## Files this plan expects to touch (by phase)

- **Phase 1:** new `src/lib/sync/tx-queue.ts`, `src/lib/sync/drain.ts`; edits
  to `src/components/today/today-live.tsx`,
  `src/components/settings/*` (wherever `reorderChecklistItems` /
  `addChecklistItem` are called), `src/components/today/today-header.tsx`
  (pending-count affordance).
- **Phase 2:** new `src/lib/sync/snapshot-store.ts`; edits to
  `src/app/g/[groupId]/page.tsx` and/or a new client boundary component.
- **Phase 3:** new `src/app/api/g/[groupId]/events/route.ts`; edits to
  `src/server/actions/checklist.ts`'s `refreshGroup` to also publish, and a
  new client subscriber hook.
