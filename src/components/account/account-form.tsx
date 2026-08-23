"use client";

import { useMemo, useState, useTransition } from "react";
import { Shuffle } from "lucide-react";
import {
  updatePreferences,
  updateProfile,
  randomizeAvatar,
  setTimezonePreference,
} from "@/server/actions/account";
import { AVATAR_SWATCHES } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import { ensurePushSubscribed } from "@/lib/push-subscribe";

/** Toggling either of these on needs a live push subscription behind it -
 * see ensurePushSubscribed's own comment for why one subscription covers
 * both. */
const PUSH_BACKED_PREFS = new Set<keyof Prefs>(["reminderEnabled", "weeklyRecapEnabled"]);

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
  initialAvatarSeed,
  initialTimezone,
  initialPrefs,
}: {
  initialName: string;
  email: string | null;
  initialColor: string;
  initialAvatarSeed: string;
  initialTimezone: string | null;
  initialPrefs: Prefs;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [avatarSeed, setAvatarSeed] = useState(initialAvatarSeed);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [, startTransition] = useTransition();
  const { message, showToast } = useToast();

  // Pre-fills with whatever the browser/network reports so picking a
  // timezone is a one-tap confirm for most people, but it's just a
  // starting point for the <select> below - nothing is saved until they
  // actually choose one (or leave the pre-filled default in place and it
  // saves on change, same as any other field here). Never overwrites a
  // timezone that's already stored - see setTimezone's own comment for why.
  const detectedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  }, []);
  const [timezone, setTimezoneState] = useState(initialTimezone ?? detectedTimezone);
  const timezoneOptions = useMemo(() => {
    try {
      const zones = Intl.supportedValuesOf("timeZone");
      // Make sure whatever's currently selected is always a valid option,
      // even if the runtime's list doesn't happen to include it.
      return zones.includes(timezone) ? zones : [timezone, ...zones];
    } catch {
      return [timezone];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveTimezone(next: string) {
    setTimezoneState(next);
    startTransition(async () => {
      const result = await setTimezonePreference(next);
      if (!result.ok) showToast(result.error);
    });
  }

  function saveProfile(nextName: string, nextColor: string) {
    startTransition(async () => {
      const result = await updateProfile({ name: nextName, color: nextColor });
      if (!result.ok) showToast(result.error);
    });
  }

  function randomize() {
    startTransition(async () => {
      const result = await randomizeAvatar();
      if (!result.ok) return showToast(result.error);
      if (result.avatarSeed) setAvatarSeed(result.avatarSeed);
    });
  }

  function togglePref(key: keyof Prefs) {
    const turningOn = !prefs[key];
    const next = { ...prefs, [key]: turningOn };
    setPrefs(next);
    startTransition(async () => {
      await updatePreferences(next);
    });

    // Best-effort, and deliberately not blocking the toggle's own save
    // above: the preference itself always saves regardless of whether
    // this device can actually receive a push (an unsupported browser, a
    // denied permission), so a failure here just means "delivery to this
    // device won't work," not "the setting didn't save."
    if (turningOn && PUSH_BACKED_PREFS.has(key)) {
      ensurePushSubscribed().then((result) => {
        if (result.ok) return;
        if (result.reason === "denied") {
          showToast("Notifications are blocked for this site in your browser settings");
        } else if (result.reason === "unsupported") {
          showToast("This browser doesn't support push notifications");
        }
        // "unconfigured" (no VAPID key set up) and "error" fail silently -
        // neither is something the person toggling a preference can act on.
      });
    }
  }

  return (
    <div>
      <div className="bg-surface mx-4 flex items-center gap-4 rounded-[28px] p-5">
        <div className="relative flex-none">
          <Avatar name={name} color={color} seed={avatarSeed} size={60} />
          <button
            type="button"
            onClick={randomize}
            aria-label="Randomize your avatar"
            className="bg-panel text-on-panel hover:bg-panel-2 absolute -right-1 -bottom-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full ring-2 ring-[var(--color-surface)]"
          >
            <Shuffle size={12} strokeWidth={2.5} />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => saveProfile(name, color)}
            aria-label="Your name"
            className="font-heading text-text w-full border-0 bg-transparent p-0 text-[21px] focus:outline-none"
          />
          <div className="text-muted mt-0.5 text-[12.5px]">{email ?? "Guest account"}</div>
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
        Your timezone
      </div>
      <div className="px-5.5">
        <label className="bg-surface flex items-center justify-between gap-3 rounded-[22px] px-4.5 py-3.5">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Timezone</span>
            <span className="text-muted mt-0.5 block text-[12.5px]">
              Sets your day, streak, and the clock others see next to your name
            </span>
          </span>
          <select
            value={timezone}
            onChange={(e) => saveTimezone(e.target.value)}
            aria-label="Your timezone"
            className="text-text max-w-[130px] flex-none truncate bg-transparent text-right text-[13px] font-semibold focus:outline-none"
          >
            {timezoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
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
