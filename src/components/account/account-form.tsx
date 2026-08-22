"use client";

import { useState, useTransition } from "react";
import { updatePreferences, updateProfile } from "@/server/actions/account";
import { AVATAR_SWATCHES } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";

type Prefs = {
  reminderEnabled: boolean;
  weeklyRecapEnabled: boolean;
  showStreaks: boolean;
  hideFromRanks: boolean;
};

const PREF_COPY: { key: keyof Prefs; label: string; sub: string }[] = [
  { key: "reminderEnabled", label: "Evening nudge", sub: "One reminder at 8pm if items are open" },
  { key: "weeklyRecapEnabled", label: "Weekly recap", sub: "Sunday summary of your streak" },
  { key: "showStreaks", label: "Show streaks", sub: "Flame counts on the group list" },
  { key: "hideFromRanks", label: "Hide me from ranks", sub: "You still count to group totals" },
];

export function AccountForm({
  initialName,
  email,
  initialColor,
  initialPrefs,
}: {
  initialName: string;
  email: string;
  initialColor: string;
  initialPrefs: Prefs;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [, startTransition] = useTransition();
  const { message, showToast } = useToast();

  function saveProfile(nextName: string, nextColor: string) {
    startTransition(async () => {
      const result = await updateProfile({ name: nextName, color: nextColor });
      if (!result.ok) showToast(result.error);
    });
  }

  function togglePref(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    startTransition(async () => {
      await updatePreferences(next);
    });
  }

  return (
    <div>
      <div className="bg-surface mx-4 flex items-center gap-4 rounded-[28px] p-5">
        <Avatar name={name} color={color} size={60} />
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => saveProfile(name, color)}
            aria-label="Your name"
            className="font-heading text-text w-full border-0 bg-transparent p-0 text-[21px] focus:outline-none"
          />
          <div className="text-muted mt-0.5 text-[12.5px]">{email}</div>
        </div>
      </div>

      <div className="text-faint px-6 pt-6.5 pb-2 text-[11px] tracking-[0.12em] uppercase">
        Your colour
      </div>
      <div className="flex flex-wrap gap-2.5 px-5.5">
        {AVATAR_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => {
              setColor(swatch);
              saveProfile(name, swatch);
            }}
            className={cn(
              "h-11 w-11 rounded-full border-[3px]",
              color === swatch ? "border-text" : "border-transparent",
            )}
            style={{ background: swatch }}
            aria-label={`Choose ${swatch}`}
          />
        ))}
      </div>

      <div className="text-faint px-6 pt-6.5 pb-2 text-[11px] tracking-[0.12em] uppercase">
        Preferences
      </div>
      <div className="flex flex-col gap-1.5 px-4">
        {PREF_COPY.map(({ key, label, sub }) => (
          <button
            key={key}
            type="button"
            onClick={() => togglePref(key)}
            className="bg-surface hover:bg-surface-2 flex w-full items-center gap-3.5 rounded-[22px] px-4.5 py-3.5 text-left transition-colors"
          >
            <span className="flex-1">
              <span className="block text-[15px] font-bold">{label}</span>
              <span className="text-muted mt-0.5 block text-[12.5px]">{sub}</span>
            </span>
            <Switch on={prefs[key]} label={label} />
          </button>
        ))}
      </div>

      <Toast message={message} />
    </div>
  );
}
