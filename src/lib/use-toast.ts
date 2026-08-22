"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Local, per-component ephemeral toast message with auto-dismiss. */
export function useToast(durationMs = 1700) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      timer.current = setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs],
  );

  // Clear any pending dismiss timer on unmount so it doesn't fire a state
  // update (or leak) after the component using this hook is gone.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { message, showToast };
}
