"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Next.js' last-resort error boundary - only rendered when the root
 * layout itself throws, which is why it has to bring its own `<html>`/
 * `<body>` rather than nesting inside RootLayout (that layout is exactly
 * what just failed). Deliberately minimal: no ThemeProvider, no fonts,
 * nothing that could itself be part of whatever broke - just enough to
 * report the error and give someone a way back in.
 *
 * Route-level crashes (a single page/segment throwing, the far more
 * common case) are a separate concern - `error.tsx` boundaries per
 * segment, not this file. This one is specifically the root-layout
 * fallback.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "24px",
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#f7f3e9",
          color: "#1d2019",
        }}
      >
        <p style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>Something went wrong.</p>
        <p style={{ fontSize: "14px", color: "#5f6455", margin: 0, maxWidth: 320 }}>
          This has been reported. Try reloading the page.
        </p>
        {/* A plain anchor, not next/link or router.push: the root layout
            itself just crashed, so a full page navigation is the safe
            path here rather than trusting client-router state. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            marginTop: "8px",
            padding: "10px 20px",
            borderRadius: "999px",
            background: "#232720",
            color: "#f6f1e6",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Take me home
        </a>
      </body>
    </html>
  );
}
