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
- **Phase 2 (reconciling pending writes into the initial render) —
  implemented**, scoped down from the original "instant bootstrap from
  IndexedDB" sketch - see that section below for why. New
  `src/lib/sync/reconcile.ts` (`applyPendingChecklistMutations`,
  `applyPendingChecks`, both pure and unit-tested in
  `reconcile.test.ts`); `today-live.tsx` and `checklist-settings-editor.tsx`
  each read the queue once on mount and reconcile it into their initial
  state.
  - This also surfaced (and fixed) a real bug: both components had been
    using `useOptimistic` for their checked-set/item-list state, whose
    documented behavior is to revert to the passed-in base props once its
    owning transition settles - fine when that transition is the actual
    Server Action call (Next auto-refreshes the route's props once it
    resolves, so the "revert" lands on already-matching data), but the
    tx-queue's `enqueue()` call resolves immediately on the local write,
    well before the real network round trip completes, so the revert was
    landing on stale props. Switched both to plain `useState`, with the
    optimistic `setState` calls moved outside `startTransition` (matching
    the pattern this file's toast/confetti calls already used, for the
    same reason: a `setState` made inside a still-pending transition
    doesn't paint until that transition's async work finishes).
- **Phase 3 (live sync resolver) — implemented as polling**, not the
  originally-sketched SSE + Redis pub/sub - see that section below for
  why (short version: `@upstash/redis` is REST-only, no `SUBSCRIBE`; a
  real fix would mean a new `ioredis` dependency plus a persistent
  per-client connection under Vercel's function-duration limits). New
  `src/app/api/g/[groupId]/sync-status/route.ts` (a tiny authenticated,
  rate-limited endpoint reusing the `tag:group:<id>` timestamp already
  written for cache invalidation) and `src/lib/sync/use-group-live-sync.ts`
  (a 15s poll, paused while the tab is hidden, that calls `router.refresh()`
  on a change), wired into `today-live.tsx`. Also fixed a bug this exposed:
  the reconciliation effect from Phase 2 was mount-only, so a
  `router.refresh()`'s fresh props would arrive but never actually get
  rendered - re-keyed it off `checkedItemIds`/`items` content signatures so
  it re-runs on every genuine prop change, not just mount. Covered by
  `use-group-live-sync.test.ts`; the route handler itself follows this
  repo's existing convention of leaving route handlers to the Playwright
  suite rather than Vitest (see `vitest.config.ts`'s coverage-include
  comment) - no dedicated e2e test added yet for the live-sync path
  specifically, since a real one needs two concurrent sessions and would
  need the poll interval made test-controllable; noted here as a gap
  rather than silently skipped.

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

## Phase 2 — Reconciling pending writes into the initial render

### Scope note: why this isn't the original "instant bootstrap from IndexedDB" plan

The original sketch of Phase 2 (mirror the full `GroupSnapshot` into
IndexedDB, hydrate a client boundary from it on mount for instant first
paint) assumed a client-fetched page that can render from local disk before
the network responds. Tickd's group pages are Server Components
(`src/app/g/[groupId]/(tabs)/page.tsx`) - the HTML itself is generated
server-side per request. Two consequences that weren't obvious until
looking at the actual render path:

- A cold/hard reload while genuinely offline can't render _anything_
  client-stored, IndexedDB included - the browser has no document to
  parse until it reaches the server at all. Fixing that needs a service
  worker caching the app shell/document (real, but a materially different
  and larger project: offline routing, cache invalidation for a stale
  shell, etc.) - out of scope here, and not implied by anything built so
  far.
- On a warm navigation (client-side routing between Today/Wall/Ranks, or
  back to an already-visited group), Next's own router cache already
  avoids re-fetching - an IndexedDB mirror wouldn't measurably improve on
  that for this app's request volume.

So the "instant bootstrap" framing doesn't actually pay off here without
first committing to PWA-shell infrastructure that's a separate decision.
What _does_ pay off, and fits Phase 1's own premise, is narrower and more
concrete:

**Goal:** a mutation sitting in the durable queue - made offline, or just
not sent yet - is reflected in what's rendered immediately after a reload,
not only after the queue finishes draining. Today, a reload while a
`setChecked` is still queued shows the server's last-synced (stale, e.g.
still unchecked) state until the drain catches up - usually near-instant if
online, but a real, visible gap if the reload happens while still offline
or the queue is mid-backoff.

- New `src/lib/sync/reconcile.ts`: a pure function that takes the
  server-rendered checklist items and applies any still-pending
  `renameChecklistItem` / `removeChecklistItem` / `addChecklistItem` /
  `reorderChecklistItems` rows for that group, in queue order - same
  logic the server will eventually apply, computed locally so the render
  doesn't have to wait for it.
- `today-live.tsx` and `checklist-settings-editor.tsx` both read the tx
  queue once on mount and reconcile: `TodayLive` overlays pending
  `setChecked` rows onto its initial checked set _and_ pending item
  mutations onto its item list; the settings editor overlays pending item
  mutations onto its list. Both already own an optimistic-state slice
  (`useOptimistic`) this plugs into - no new state shape, just a richer
  initial value.
- Silent by construction: this only ever corrects what's already
  rendered to match intent already recorded in the queue - it doesn't
  toast, celebrate, or otherwise announce anything (that stays tied to an
  actual user tap, not a mount-time reconciliation).
- If a genuine "reload while fully offline should still render the app at
  all" requirement shows up later, that's a distinct project (a service
  worker + cached app shell) to scope separately - this phase deliberately
  doesn't reach for it.

## Phase 3 — Live sync resolver (cross-member push) — implemented as polling

**Goal:** when a groupmate ticks an item, everyone else's open tab updates
without a manual reload.

### Scope note: why this isn't SSE + Redis pub/sub

The original sketch assumed `@upstash/redis` could serve as a pub/sub
backbone for an SSE stream. It can't, for this stack specifically:

- `@upstash/redis` (the only Redis client already in the app - see
  `cache-handlers/redis-remote.js` and `src/server/rate-limit.ts`) is a
  **REST** client - request/response only. Real Redis `SUBSCRIBE` needs a
  persistent TCP connection, which means a different client (`ioredis`)
  against Upstash's TCP endpoint - a materially different dependency and
  connection model from the fetch-based one used everywhere else in this
  app.
- Independent of the Redis question, a genuinely live SSE connection needs
  to stay open per connected client for as long as they're watching -
  which runs straight into Vercel serverless function duration limits
  (reconnect/backoff logic, cost per concurrent open connection, and a
  materially different deployment shape than the rest of this
  request/response app).

Asked directly, the choice was: accept that added dependency + connection
model + duration-limit complexity for true push, or ship something that
delivers the same user-visible outcome (no manual reload needed) within the
infrastructure already in place. Went with the latter:

**What's implemented: lightweight polling, reusing existing infrastructure.**

- `src/app/api/g/[groupId]/sync-status/route.ts` - a tiny authenticated,
  membership-checked, rate-limited GET returning the _same_
  `tag:group:<id>` timestamp `cache-handlers/redis-remote.js` already
  writes on every `updateTag` call (every checklist mutation already makes
  this call via `refreshGroup` in `src/server/actions/checklist.ts`, to
  invalidate `getGroupCore`'s shared cache). No new write path - this
  reads infrastructure that already existed for cache invalidation.
- `src/lib/sync/use-group-live-sync.ts` - a client hook polling that
  endpoint every 15s, comparing against its own last-seen value, and
  calling `router.refresh()` (a normal Next.js re-render of the current
  route's Server Components, not a client-side merge) the moment it sees
  the timestamp move. Paused entirely (no timer running at all) while the
  tab is hidden, resumed immediately on refocus or the browser's `online`
  event rather than waiting out the rest of the interval.
- Wired into `today-live.tsx` only (the highest-traffic surface) - Wall/
  Ranks/Settings can adopt the same hook trivially later if staleness
  there turns out to matter.
- **A real bug this exposed and fixed:** `router.refresh()` only helps if
  the component that receives the fresh props actually re-derives its
  rendered state from them. `today-live.tsx`'s `optimisticChecked`/
  `optimisticItems` were plain `useState` seeded once via a lazy
  initializer (see Phase 2's note on why they're not `useOptimistic`) -
  which meant a live-sync-triggered refresh would fetch fresh data and
  hand it down as new props, and the component would silently keep
  rendering the old state anyway. Fixed by re-keying the reconciliation
  effect (Phase 2) off _content signatures_ of `checkedItemIds`/`items`
  rather than running it mount-only, so it re-runs on every genuine prop
  change - re-basing onto the fresh server data and re-applying whatever's
  still in the local queue on top, so a groupmate's edit and this device's
  own not-yet-sent one both end up reflected together.
- Trade-off versus true push: up to ~15s of latency before a groupmate's
  tick appears, versus sub-second. Given Tickd's actual data shape (a
  handful of ticks/day per person, not a live collaborative document),
  this is judged an acceptable bar - revisit toward true SSE/pub-sub only
  if real usage shows 15s is a genuinely reported problem, at which point
  the `ioredis` + persistent-connection trade-off above is worth
  re-litigating with real evidence behind it.

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
