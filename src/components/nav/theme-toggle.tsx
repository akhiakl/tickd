"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

const noopSubscribe = () => () => {};

/** True only once the client has hydrated - avoids a server/client theme mismatch. */
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <IconButton aria-label="Toggle theme" onClick={() => setTheme(isDark ? "light" : "dark")}>
      {isDark ? (
        <Sun size={17} strokeWidth={2.2} className="text-flame-light" />
      ) : (
        <Moon size={17} strokeWidth={2.2} className="text-text" />
      )}
    </IconButton>
  );
}
