"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { createGroup } from "@/server/actions/groups";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { DEFAULT_CHECKLIST_ITEMS } from "@/lib/constants";
import { todayISODate } from "@/lib/challenge-stats";
import { CalendarDays } from "lucide-react";

const DURATIONS = [21, 31] as const;

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
  const [duration, setDuration] = useState<21 | 31>(31);
  // `todayISODate()` reads the real clock, so it can't run during
  // prerendering (Cache Components would freeze it at build time and serve
  // that same stale date to every visitor). Start empty and fill it in
  // once mounted, which only ever happens at request/client time.
  const [startDate, setStartDate] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: today's date can only be read once mounted (see the comment above), not derived from props/state.
    setStartDate(todayISODate());
  }, []);
  const [items, setItems] = useState(DEFAULT_CHECKLIST_ITEMS);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
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
      <div className="flex gap-2">
        {DURATIONS.map((d) => (
          <Pill
            key={d}
            type="button"
            active={duration === d}
            onClick={() => setDuration(d)}
            className="flex-1"
          >
            {d} days
          </Pill>
        ))}
      </div>

      <label className="text-faint mt-5.5 mb-1.5 block text-[11px] tracking-[0.1em] uppercase">
        Starts
      </label>
      <div className="border-text/[0.16] bg-surface flex items-center gap-2.5 rounded-full border-[1.5px] px-4 py-3">
        <CalendarDays size={16} strokeWidth={2} className="text-faint" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label="Starts"
          className="text-text flex-1 border-0 bg-transparent p-0 text-[15px] font-semibold focus:outline-none"
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
