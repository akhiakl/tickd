"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { requestEmailCode, verifyEmailCode } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function CodeEntryForm({ email, callbackUrl }: { email: string; callbackUrl: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function press(key: string) {
    if (key === "back") return setCode((c) => c.slice(0, -1));
    if (code.length < 6) setCode((c) => c + key);
  }

  function verify() {
    setError(null);
    startTransition(async () => {
      const result = await verifyEmailCode(email, code);
      if (!result.ok) {
        setError(result.error);
        setCode("");
        return;
      }
      router.push(callbackUrl as Route);
      router.refresh();
    });
  }

  function resend() {
    startTransition(async () => {
      await requestEmailCode(email);
      setNotice("New code sent");
      setTimeout(() => setNotice(null), 1700);
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "bg-surface font-heading flex h-14 flex-1 items-center justify-center rounded-2xl border-[1.5px] text-2xl",
              code.length === i ? "border-accent" : "border-text/[0.14]",
            )}
          >
            {code[i] ?? ""}
          </span>
        ))}
      </div>

      {error && <p className="text-flame mt-3 text-[12.5px]">{error}</p>}

      <div className="mt-6.5 flex flex-wrap gap-2">
        {KEYS.map((key, i) =>
          // The blank grid slot is a layout spacer, not a control - a
          // disabled <button> with no text still needs an accessible name
          // per axe's button-name rule, so render a plain, hidden div here
          // instead of an inert button.
          key ? (
            <button
              key={`${key}-${i}`}
              type="button"
              onClick={() => press(key)}
              className="bg-surface font-heading w-[calc((100%-16px)/3)] rounded-[18px] py-[15px] text-xl"
            >
              {key === "back" ? "⌫" : key}
            </button>
          ) : (
            <div key={`spacer-${i}`} aria-hidden="true" className="w-[calc((100%-16px)/3)]" />
          ),
        )}
      </div>

      <Button
        type="button"
        onClick={verify}
        disabled={pending || code.length < 6}
        className="mt-5.5"
      >
        Verify
      </Button>
      <button
        type="button"
        onClick={resend}
        className="text-muted hover:text-text mt-2 w-full cursor-pointer bg-transparent py-2.5 text-[13.5px] font-bold"
      >
        {notice ?? "Send it again"}
      </button>
    </div>
  );
}
