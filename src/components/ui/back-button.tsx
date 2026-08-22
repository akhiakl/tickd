import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Route } from "next";

/**
 * A round back-chevron button that navigates to `href`. Accepts a plain
 * string because callers build the target from a dynamic `groupId`, which
 * Next's typed-routes plugin can't verify statically the way it can a
 * literal path.
 */
export function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href as Route}
      aria-label="Back"
      className="border-text/[0.18] hover:bg-text/[0.06] flex h-9 w-9 flex-none items-center justify-center rounded-full border-[1.5px] transition-colors"
    >
      <ChevronLeft size={17} strokeWidth={2.75} />
    </Link>
  );
}
