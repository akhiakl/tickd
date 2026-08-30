"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { txQueue } from "@/lib/sync/tx-queue";
import { drainController } from "@/lib/sync/drain";
import { applyPendingChecklistMutations, applyPendingChecks } from "@/lib/sync/reconcile";
import { useGroupLiveSync } from "@/lib/sync/use-group-live-sync";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import { Confetti } from "@/components/ui/confetti";
import { TodayStatsPanel } from "@/components/today/today-stats-panel";
import { TodayChecklist } from "@/components/today/today-checklist";
import { StreakMilestoneToast } from "@/components/today/streak-milestone-toast";
import { ShareButton } from "@/components/today/share-button";
import type { ChecklistItemView } from "@/types/domain";

function confettiStorageKey(groupId: string, today: string) {
  return `tickd-confetti-${groupId}-${today}`;
}

/**
 * Owns everything on the Today page that needs to react to a tap the
 * instant it happens: the ring/streak (TodayStatsPanel), the checklist
 * itself, and the milestone celebration - previously three independent
 * consumers of server-rendered props, so ticking a box moved the
 * checklist's own optimistic checkmark right away but left the ring,
 * streak count, and milestone toast waiting on a full round trip (a real
 * lag, not just a cosmetic one) before they caught up.
 */
export function TodayLive({
  groupId,
  items,
  checkedItemIds,
  today,
  disabled = false,
  dayIndex,
  durationDays,
  priorStreak,
  mascot,
  banner,
}: {
  groupId: string;
  items: ChecklistItemView[];
  checkedItemIds: string[];
  /** The viewer's own local "today" (see getGroupSnapshot) - used as a
   * cooldown key so confetti fires once per day, not once per fumbled
   * checkbox. */
  today: string;
  /** True before the group's start date (in the viewer's own timezone) -
   * see TodayChecklist's own comment; `setChecked` rejects the same case
   * server-side, this is UI-only. */
  disabled?: boolean;
  dayIndex: number;
  durationDays: number;
  /** currentStreakWithToday's value with *today's own* contribution
   * excluded - i.e. the streak walking back through yesterday only.
   * Today can only ever add up to +1 (crossing from zero checks to any),
   * so the live ring derives the real streak from this plus whether
   * anything's currently checked, without re-running the full history
   * calculation on every tap. */
  priorStreak: number;
  /** GroupMascot, grouped visually with TodayStatsPanel into one sidebar
   * column (see the wrapper div around both, below). */
  mascot?: ReactNode;
  /** The not-started banner, shown above the checklist when `disabled` -
   * the only thing here that needs data (the group's start date) this
   * component doesn't otherwise have. */
  banner?: ReactNode;
}) {
  const [, startTransition] = useTransition();
  const { message, showToast } = useToast();
  // Plain useState, not useOptimistic: useOptimistic reverts its value
  // back to the base (checkedItemIds/items) the moment its enclosing
  // transition settles, which is exactly right for a tap's own in-flight
  // write but wrong for the mount-time reconciliation below - that
  // correction needs to *stick* until fresh server props actually arrive
  // (the next navigation), not snap back once its own transition ends.
  const [optimisticChecked, setOptimisticChecked] = useState(() => new Set(checkedItemIds));
  const [optimisticItems, setOptimisticItems] = useState(items);
  // Bumped (never reset) each time a checkmark lands the last item and
  // hasn't already been celebrated today - see Confetti's own comment for
  // why a changing value is its whole trigger API, rather than a boolean
  // it'd have to be reset back to false.
  const [celebration, setCelebration] = useState(0);

  // Surfaces a terminal queue failure (bad input, "hasn't started yet", a
  // membership check that failed server-side) the same way a direct
  // rejected setChecked call used to - a transport failure never reaches
  // here, it's retried by the drain controller instead. See
  // docs/local-first-sync-engine-plan.md and src/lib/sync/drain.ts.
  useEffect(() => {
    drainController.setErrorHandler(showToast);
    drainController.start();
    return () => drainController.setErrorHandler(null);
  }, [showToast]);

  // Phase 3 (docs/local-first-sync-engine-plan.md): polls for a
  // groupmate's change and, on one, calls router.refresh() - which hands
  // this component fresh `checkedItemIds`/`items` props. The reconciliation
  // effect below is what actually makes that refresh visible (see its own
  // comment): without it, fresh props would arrive but plain useState
  // wouldn't pick them up.
  useGroupLiveSync(groupId);

  // The running true count of checked items, mutated synchronously on
  // every tap - not derived from `optimisticChecked` (React state) at
  // toggle-call time. Two taps fired back to back are both handled
  // synchronously *before* React re-renders between them, so a second
  // `toggle()` call can still see the pre-first-tap render's stale
  // closure over `optimisticChecked` - which made "check the last two
  // boxes quickly" sometimes never compute a real doneCountAfter of
  // `items.length`, so the clean-sweep toast/confetti just silently
  // didn't fire. This ref is always current regardless of render timing;
  // `optimisticChecked` (via setOptimisticChecked below) becomes a mirror
  // of it for rendering, not the source of truth for this math anymore.
  const checkedRef = useRef(new Set(checkedItemIds));

  // Bumped synchronously by every tap (toggle(), below) - lets the
  // reconciliation effect notice a tap happened *while its own async
  // queue read was in flight* and discard its now-stale result instead of
  // clobbering a fresher optimistic update back to what the queue looked
  // like before that tap. Confirmed reachable, not just theoretical: an
  // e2e test tapping immediately after a fresh page load can land inside
  // that same window, since IndexedDB's first-ever open for an origin has
  // real (if small) latency. Nothing is lost either way - the tap's own
  // enqueue already persisted the write durably; this only decides which
  // value the *display* briefly shows before the next real reconciliation.
  const epochRef = useRef(0);

  // Content signatures, not the raw arrays/objects - `checkedItemIds` and
  // `items` are new references on every server render regardless of
  // whether their content actually changed, and this effect should only
  // redo reconciliation when it did (on mount, and again whenever fresh
  // server data actually lands - notably from useGroupLiveSync's
  // router.refresh() above, or the mutation's own eventual revalidation).
  const checkedSignature = checkedItemIds.join(",");
  const itemsSignature = items.map((item) => `${item.id}:${item.label}:${item.position}`).join("|");

  // Phase 2 (docs/local-first-sync-engine-plan.md): reconciles anything
  // still sitting in the durable queue on top of the latest server props.
  // On mount, this is what makes an offline tap (or item edit) that
  // hasn't drained yet show correctly instead of the server's
  // last-synced state. On a later prop change (Phase 3's live sync, or
  // this device's own write finally landing), re-running it is what keeps
  // a still-queued write from being clobbered by fresher-but-incomplete
  // server data arriving in the meantime - a groupmate's edit and this
  // device's own not-yet-sent one both need to be reflected together.
  // Silent by construction either way: no toast/confetti, this only ever
  // corrects the render to match intent already recorded in the queue.
  // Not wrapped in startTransition - see toggle()'s own comment below on
  // why a plain setState needs to be called outside one to actually paint
  // promptly, now that this is a plain useState rather than useOptimistic.
  useEffect(() => {
    let cancelled = false;
    const startEpoch = epochRef.current;
    void (async () => {
      const rows = (await txQueue.listPending()).filter((r) => r.payload.groupId === groupId);
      // A tap landed while this read was in flight - see epochRef's own
      // comment. Bail without touching state; the tap's own synchronous
      // update already reflects the current truth better than this
      // now-outdated snapshot would.
      if (cancelled || epochRef.current !== startEpoch) return;
      const reconciledChecked = applyPendingChecks(new Set(checkedItemIds), rows);
      // Reconciliation runs on every mount and every genuine prop change
      // (see this effect's own comment) - most of the time there's
      // nothing actually pending, so the "reconciled" result is just
      // `checkedItemIds` again. `new Set(...)` always allocates a fresh
      // object regardless, so without this check every one of those runs
      // would force a render anyway (React bails out of a plain useState
      // update by reference equality, and a fresh Set is never
      // reference-equal to the last one) - a real, confirmed source of an
      // extra render shortly after every Today page load.
      const changed =
        reconciledChecked.size !== checkedRef.current.size ||
        [...reconciledChecked].some((id) => !checkedRef.current.has(id));
      checkedRef.current = reconciledChecked;
      if (changed) setOptimisticChecked(new Set(reconciledChecked));
      // No analogous guard needed here: unlike the Set above, `items` is
      // passed through by reference when there's nothing to merge, and a
      // plain useState setter already bails out on a reference-equal
      // value - genuinely unchanged (mount, or a re-run whose signature
      // dep didn't actually move) costs nothing, while a real prop change
      // (this effect only reruns when checkedSignature/itemsSignature
      // actually differ, or on mount) correctly still updates.
      setOptimisticItems(rows.length ? applyPendingChecklistMutations(items, rows) : items);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, checkedSignature, itemsSignature]);

  function toggle(itemId: string) {
    if (disabled) return;
    epochRef.current++;
    const willBeDone = !checkedRef.current.has(itemId);
    if (willBeDone) checkedRef.current.add(itemId);
    else checkedRef.current.delete(itemId);
    const doneCountAfter = checkedRef.current.size;
    const snapshot = new Set(checkedRef.current);

    // The checkbox itself is plain state now too (not useOptimistic - see
    // this component's earlier comment on why: an optimistic value from
    // useOptimistic reverts to its base props once its transition settles,
    // which would undo the mount-time reconciliation effect above). A
    // plain setState made *inside* startTransition doesn't paint until
    // that transition's async work finishes, so this - like the toast and
    // confetti calls just below - is fired here, synchronously, outside
    // the transition that does the actual enqueue.
    setOptimisticChecked(snapshot);

    if (willBeDone) {
      const cleanSweep = doneCountAfter === optimisticItems.length;
      showToast(
        cleanSweep
          ? `Clean sweep. All ${optimisticItems.length} done.`
          : `Ticked - ${doneCountAfter}/${optimisticItems.length}`,
      );
      // The toast above still fires every time - only the confetti gets a
      // once-a-day cooldown, so someone un/re-checking the last item a
      // few times (by accident, or just fiddling) doesn't get a burst
      // each time.
      if (cleanSweep) {
        const key = confettiStorageKey(groupId, today);
        let celebratedToday = false;
        try {
          celebratedToday = localStorage.getItem(key) === "1";
        } catch {
          // Storage blocked/unavailable - fine, worst case confetti fires
          // more than once today instead of not at all.
        }
        if (!celebratedToday) {
          setCelebration((n) => n + 1);
          try {
            localStorage.setItem(key, "1");
          } catch {
            // Same tradeoff as above.
          }
        }
      }
    }

    startTransition(async () => {
      // Persisted (IndexedDB-backed, falling back to in-memory where
      // IndexedDB isn't available) rather than sent directly - a tap made
      // offline survives a reload and drains once connectivity returns,
      // instead of silently reverting the next time this data refetches.
      // Same-item taps coalesce onto one queued row (tx-queue.ts's
      // coalesceKey), so rapid re-toggling doesn't grow the queue or
      // replay intermediate states - only the final one is ever sent.
      // Ordering is still strictly one write in flight at a time
      // (drain.ts's drainLoop), which is what keeps each write's cache
      // invalidation (setChecked's revalidatePath/updateTag) from racing
      // a later one - the same invariant the old in-memory queue enforced.
      await txQueue.enqueue("setChecked", {
        groupId,
        checklistItemId: itemId,
        checked: willBeDone,
      });
      drainController.kick();
    });
  }

  const doneToday = optimisticChecked.size;
  const liveStreak = priorStreak + (doneToday > 0 ? 1 : 0);

  return (
    <>
      {/* One column: checklist. Always a real box (not conditionally
          `display: contents`) and always the same markup at every width -
          the grid this sits in (see (tabs)/page.tsx) is itself a real
          grid at every width, single-column below lg and two-column at
          lg, rather than a desktop-only overlay bolted onto an unrelated
          mobile layout. See
          design/project/desktop-redesign/TodayDesktop.dc.html and that
          folder's NOTES.md. `order-2`/`lg:order-none`: below lg, the
          stats/streak/mascot column (below) comes first, matching the
          app's original mobile order - only the two-column split at lg
          is new, not the mobile stacking order. */}
      <div className="order-2 flex flex-col gap-6 lg:order-none lg:col-start-1">
        {banner}
        <div>
          <div className="flex items-baseline justify-between px-1 pb-2.5">
            <span className="text-faint text-[11px] tracking-[0.12em] uppercase">
              Today&apos;s list
            </span>
            <span className="text-muted text-[12px]">
              {disabled ? "not started yet" : "tap to tick"}
            </span>
          </div>
          <div className="relative">
            <TodayChecklist
              items={optimisticItems}
              checkedIds={optimisticChecked}
              onToggle={toggle}
              disabled={disabled}
            />
            <Toast message={message} />
            <Confetti trigger={celebration} />
          </div>
        </div>
      </div>

      {/* Other column: the stats/streak panel (Share lives inside it, not
          floating - see ShareButton's own comment) + the mascot, as one
          sticky sidebar at every width the grid actually has two columns
          to offer (sticky is a no-op, harmlessly, everywhere else).
          `order-1`: comes first below lg (see the checklist column's own
          comment). StreakMilestoneToast lives in here too, not as a
          fourth top-level sibling - its own root is a real (if usually
          0-height) box, and this whole return spreads directly into the
          page's grid via Suspense/Fragment passthrough (see
          (tabs)/page.tsx), so a stray top-level box here would claim its
          own grid row and a full `gap` on each side of it - exactly the
          bug that used to push a large blank gap between the header and
          this panel. Nested inside this flex column instead, the same
          zero-height box only ever costs one `gap-4.5`, not a full grid
          gap on each side. */}
      <div className="order-1 flex flex-col gap-4.5 lg:sticky lg:top-6 lg:order-none lg:col-start-2 lg:self-start">
        <TodayStatsPanel
          doneToday={doneToday}
          itemCount={optimisticItems.length}
          dayIndex={dayIndex}
          durationDays={durationDays}
          streak={liveStreak}
          share={<ShareButton groupId={groupId} variant="inline" className="hidden lg:flex" />}
        />
        {mascot}
        <StreakMilestoneToast groupId={groupId} streak={liveStreak} />
      </div>
    </>
  );
}
