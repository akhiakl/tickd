"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { setCredentials, checkUsernameAvailable, type UsernameCheck } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";

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
  const [lastChecked, setLastChecked] = useState<{
    username: string;
    result: UsernameCheck;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const { message, showToast } = useToast();

  const trimmed = username.trim();
  const status: UsernameCheck["status"] | "idle" | "checking" =
    trimmed.length < 3
      ? "idle"
      : lastChecked?.username === username
        ? lastChecked.result.status
        : "checking";
  const invalidReason = status === "invalid" ? lastChecked?.result.reason : undefined;

  // Debounced live check, canceled/superseded on every keystroke - the
  // `ignore` flag (React's own recommended pattern for effects that fetch)
  // stops a slow, stale check from clobbering a newer one that resolves
  // first.
  useEffect(() => {
    if (username.trim().length < 3) return;

    let ignore = false;
    const timer = setTimeout(() => {
      checkUsernameAvailable(username).then((result) => {
        if (!ignore) setLastChecked({ username, result });
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
      <div className="bg-surface mx-4 rounded-[22px] px-4.5 py-4 lg:mx-0">
        <div className="text-[15px] font-bold">Account saved</div>
        <div className="text-muted mt-0.5 text-[12.5px]">
          Log in as @{username} from any device to get back to this account.
        </div>
      </div>
    );
  }

  return (
    // Promoted to a prominent panel - previously a bg-surface card at the
    // same visual weight as every preference toggle below it, even though
    // converting a guest to a persistent login is arguably the most
    // important thing on this page. See
    // design/project/desktop-redesign/AccountDesktop.dc.html and that
    // folder's NOTES.md.
    <form
      onSubmit={submit}
      className="bg-panel text-on-panel mx-4 rounded-[26px] px-5.5 py-6.5 shadow-[0_16px_32px_-14px_rgba(29,32,25,0.35)] lg:mx-0"
    >
      <div className="font-heading text-[20px]">Save your account</div>
      <div className="text-panel-soft mt-2 mb-5 text-[13.5px] leading-normal">
        Set a username and password so you can log back in from another device without losing this
        one.
      </div>

      <div className="relative mb-2.5">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          required
          maxLength={24}
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="Username"
          placeholder="Username"
          className="text-on-panel placeholder:text-panel-soft bg-on-panel/10 w-full rounded-2xl border-0 px-4 py-3 pr-10 text-[15px]"
        />
        <span className="absolute top-1/2 right-3.5 -translate-y-1/2">
          {status === "checking" && <Loader2 size={16} className="text-panel-soft animate-spin" />}
          {status === "available" && <Check size={16} className="text-accent" />}
          {(status === "taken" || status === "invalid") && (
            <X size={16} className="text-flame-light" />
          )}
        </span>
      </div>
      {status === "taken" && (
        <p className="text-flame-light -mt-1 mb-2 text-[12px]">That username is taken.</p>
      )}
      {status === "invalid" && invalidReason && (
        <p className="text-flame-light -mt-1 mb-2 text-[12px]">{invalidReason}</p>
      )}

      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        type="password"
        maxLength={72}
        aria-label="Password"
        placeholder="Password"
        className="text-on-panel placeholder:text-panel-soft bg-on-panel/10 w-full rounded-2xl border-0 px-4 py-3 text-[15px]"
      />

      {error && <p className="text-flame-light mt-2.5 text-[12.5px]">{error}</p>}

      <Button
        type="submit"
        disabled={pending || status === "taken" || status === "invalid" || status === "checking"}
        className="mt-3.5"
      >
        {pending ? "Saving..." : "Save account"}
      </Button>

      <Toast message={message} />
    </form>
  );
}
