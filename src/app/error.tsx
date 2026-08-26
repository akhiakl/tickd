"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { RefreshCw, Home } from "lucide-react";
import { Screen } from "@/components/layout/screen";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

/**
 * App-wide error boundary for anything under the root layout - catches a
 * render/action crash in any route segment that doesn't have its own
 * closer `error.tsx`, so it's a scoped, on-brand fallback instead of
 * falling all the way through to global-error.tsx's bare-bones one (that
 * file is reserved for the root layout itself failing, a much rarer
 * case - see its own comment).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Screen className="flex min-h-dvh flex-col px-6 pt-6 pb-10">
      <div className="flex items-center gap-2.5">
        <Logo size={30} />
        <span className="font-heading text-[19px] tracking-tight">Tickd</span>
      </div>

      <div className="mt-14 flex flex-1 flex-col items-center justify-center text-center">
        <div className="bg-surface flex h-[92px] w-[92px] items-center justify-center rounded-full">
          <RefreshCw size={30} strokeWidth={2} className="text-flame" />
        </div>

        <h1 className="font-heading mt-6.5 text-[28px] leading-[1.1] tracking-tight text-balance">
          Something went wrong.
        </h1>
        <p className="text-muted mt-3 max-w-[280px] text-[15.5px] leading-relaxed text-pretty">
          This has been reported. Give it another try, or head back home.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-2.5">
        <Button onClick={reset}>
          <RefreshCw size={17} strokeWidth={2.4} />
          Try again
        </Button>
        <LinkButton href="/" variant="outline">
          <Home size={17} strokeWidth={2.4} />
          Take me home
        </LinkButton>
      </div>
    </Screen>
  );
}
