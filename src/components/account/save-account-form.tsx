"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { setCredentials, checkUsernameAvailable } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";

type Availability = "idle" | "checking" | "available" | "taken";

/** Debounce delay for the live availability check - short enough to feel
 * instant (Instagram-style "is this taken" while typing), long enough
 * that a fast typist doesn't fire a check per keystroke. */
const CHECK_DELAY_MS = 350;

/**
 * Optional upgrade for a guest account: setting a username/password lets
 * them log back in from another device (via /signin/password) without
 * losing this row's id/history, the way signing in as a fresh guest
 * elsewhere would. Auth0 accounts never see this (they already have a
 * real identity) - gated by the account page only rendering it when
 * `username` is null and there's no `authSub`.
 */
export function SaveAccountForm() {
  const [saved, setSaved] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Only ever set from the async check's own callback below (never
  // synchronously in the effect body), so "checking" isn't a state value
  // at all - it's derived below as "no resolved check matches the
  // current username yet", which covers both the debounce window and the
  // request itself with no separate state to keep in sync.
  const [lastChecked, setLastChecked] = useState<{ username: string; available: boolean } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const { message, showToast } = useToast();

  const trimmed = username.trim();
  const availability: Availability =
    trimmed.length < 3
      ? "idle"
      : lastChecked?.username === username
        ? lastChecked.available
          ? "available"
          : "taken"
        : "checking";

  // Debounced live check, canceled/superseded on every keystroke - the
  // `ignore` flag (React's own recommended pattern for effects that fetch)
  // stops a slow, stale check from clobbering a newer one that resolves
  // first.
  useEffect(() => {
    if (username.trim().length < 3) return;

    let ignore = false;
    const timer = setTimeout(() => {
      checkUsernameAvailable(username).then((available) => {
        if (!ignore) setLastChecked({ username, available });
      });
    }, CHECK_DELAY_MS);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [username]);

  function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setCredentials({ username, password });
      if (!result.ok) return setError(result.error);
      setSaved(true);
      showToast("Account saved");
    });
  }

  if (saved) {
    return (
      <div className="bg-surface mx-4 rounded-[22px] px-4.5 py-4">
        <div className="text-[15px] font-bold">Account saved</div>
        <div className="text-muted mt-0.5 text-[12.5px]">
          Log in as @{username} from any device to get back to this account.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-surface mx-4 rounded-[22px] px-4.5 py-4">
      <div className="text-[15px] font-bold">Save your account</div>
      <div className="text-muted mt-0.5 mb-3.5 text-[12.5px]">
        Set a username and password so you can log back in from another device without losing this
        one.
      </div>

      <div className="relative mb-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          maxLength={24}
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="Username"
          placeholder="Username"
          className="border-text/[0.16] bg-bg text-text w-full rounded-2xl border-[1.5px] px-4 py-3 pr-10 text-[15px]"
        />
        <span className="absolute top-1/2 right-3.5 -translate-y-1/2">
          {availability === "checking" && <Loader2 size={16} className="text-muted animate-spin" />}
          {availability === "available" && <Check size={16} className="text-accent" />}
          {availability === "taken" && <X size={16} className="text-flame" />}
        </span>
      </div>
      {availability === "taken" && (
        <p className="text-flame -mt-1 mb-2 text-[12px]">That username is taken.</p>
      )}

      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        type="password"
        maxLength={72}
        aria-label="Password"
        placeholder="Password"
        className="border-text/[0.16] bg-bg text-text w-full rounded-2xl border-[1.5px] px-4 py-3 text-[15px]"
      />

      {error && <p className="text-flame mt-2.5 text-[12.5px]">{error}</p>}

      <Button
        type="submit"
        disabled={pending || availability === "taken" || availability === "checking"}
        size="sm"
        className="mt-3.5"
      >
        {pending ? "Saving..." : "Save account"}
      </Button>

      <Toast message={message} />
    </form>
  );
}
