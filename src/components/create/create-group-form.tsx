"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { createGroup } from "@/server/actions/groups";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { DEFAULT_CHECKLIST_ITEMS } from "@/lib/constants";
import { todayISODate } from "@/lib/challenge-stats";
import { CalendarDays } from "lucide-react";

// Quick-pick shortcuts, not the only allowed values - the number input
// next to them accepts anything from 1 to 365 (see createGroupSchema).
const DURATION_PRESETS = [7, 14, 21, 30, 60, 90] as const;
const MIN_DURATION = 1;
const MAX_DURATION = 365;

// dnd-kit is real bundle weight for a feature that's only touched once the
// form is already open - split it into its own chunk instead of shipping
// it with every visit to the create-group page.
const ChecklistDraftEditor = dynamic(
  () => import("@/components/checklist/checklist-draft-editor").then((m) => m.ChecklistDraftEditor),
  {
    loading: () => <div className="bg-surface h-40 animate-pulse rounded-3xl" />,
  },
);

export function CreateGroupForm() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(31);
  // `todayISODate()` reads the real clock, so it can't run during
  // prerendering (Cache Components would freeze it at build time and serve
  // that same stale date to every visitor). Start empty and fill it in
  // once mounted, which only ever happens at request/client time. Also
  // doubles as the date input's `min` (see below) - stays "" until mount,
  // same reasoning, and an empty `min` just means no floor yet rather
  // than briefly allowing anything.
  const [today, setToday] = useState("");
  const [startDate, setStartDate] = useState("");
  useEffect(() => {
    const now = todayISODate();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: today's date can only be read once mounted (see the comment above), not derived from props/state.
    setToday(now);
    setStartDate(now);
  }, []);
  const [items, setItems] = useState(DEFAULT_CHECKLIST_ITEMS);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    if (!Number.isInteger(duration) || duration < MIN_DURATION || duration > MAX_DURATION) {
      setError(`Runs for needs to be between ${MIN_DURATION} and ${MAX_DURATION} days.`);
      return;
    }
    startTransition(async () => {
      const result = await createGroup({ name, durationDays: duration, startDate, items });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit}>
      <label className="text-faint mb-1.5 block text-[11px] tracking-[0.1em] uppercase">
        Group name
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="The August Eight"
        required
        className="border-text/[0.16] bg-surface text-text w-full rounded-full border-[1.5px] px-4 py-3.5 text-[16px] font-semibold"
      />

      <label className="text-faint mt-5.5 mb-1.5 block text-[11px] tracking-[0.1em] uppercase">
        Runs for
      </label>
      <div className="flex flex-wrap gap-2">
        {DURATION_PRESETS.map((d) => (
          <Pill key={d} type="button" active={duration === d} onClick={() => setDuration(d)}>
            {d} days
          </Pill>
        ))}
      </div>
      <div className="border-text/[0.16] bg-surface mt-2 flex items-center gap-2.5 rounded-full border-[1.5px] px-4 py-3">
        <input
          type="number"
          inputMode="numeric"
          min={MIN_DURATION}
          max={MAX_DURATION}
          value={duration}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (Number.isFinite(value)) setDuration(value);
          }}
          aria-label="Number of days"
          className="text-text focus-visible:outline-accent w-16 border-0 bg-transparent p-0 text-[15px] font-semibold outline-none focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <span className="text-muted text-[13px]">
          days - any custom length from {MIN_DURATION} to {MAX_DURATION}
        </span>
      </div>

      <label className="text-faint mt-5.5 mb-1.5 block text-[11px] tracking-[0.1em] uppercase">
        Starts
      </label>
      <div className="border-text/[0.16] bg-surface flex items-center gap-2.5 rounded-full border-[1.5px] px-4 py-3">
        <CalendarDays size={16} strokeWidth={2} className="text-faint" />
        <input
          type="date"
          value={startDate}
          min={today}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label="Starts"
          className="text-text focus-visible:outline-accent flex-1 border-0 bg-transparent p-0 text-[15px] font-semibold outline-none focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
        />
      </div>

      <div className="mt-6.5">
        <ChecklistDraftEditor initialLabels={items} onChange={setItems} />
      </div>

      {error && <p className="text-flame mt-3 text-[12.5px]">{error}</p>}

      <Button type="submit" disabled={pending} className="mt-6.5">
        {pending ? "Creating..." : "Create & get invite link"}
      </Button>
    </form>
  );
}
