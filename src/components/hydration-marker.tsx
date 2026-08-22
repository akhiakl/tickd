"use client";

import { useEffect } from "react";

/**
 * Stamps `data-hydrated="true"` on `<html>` once React has taken over.
 * Exists for the Playwright suite: a click can otherwise land on
 * server-rendered markup before its event handlers are attached, falling
 * through to a native (unhandled) form submission. Renders nothing.
 */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return null;
}
