"use client";

import { useCallback, useRef, useState } from "react";

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

  return { message, showToast };
}
