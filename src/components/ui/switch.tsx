import { cn } from "@/lib/utils";

/**
 * Purely presentational toggle track. It renders as a `<span>` because it
 * always sits inside a row that is itself the clickable control - nesting
 * an interactive `<button>` inside another button is invalid HTML.
 *
 * `role="switch"` is an independently-nameable widget role, so it needs its
 * own accessible name even though the enclosing row already has one -
 * callers must pass `label` (the same text the row displays).
 */
export function Switch({
  on,
  label,
  className,
}: {
  on: boolean;
  label: string;
  className?: string;
}) {
  return (
    <span
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cn(
        "flex h-7 w-[46px] flex-none items-center rounded-full p-[3px] transition-colors",
        on ? "bg-accent justify-end" : "bg-text/[0.16] justify-start",
        className,
      )}
    >
      <span className={cn("block h-[22px] w-[22px] rounded-full", on ? "bg-on-panel" : "bg-bg")} />
    </span>
  );
}
