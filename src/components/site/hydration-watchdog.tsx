"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __nxHydrated?: boolean;
  }
}

/**
 * Hydration heartbeat.
 *
 * An inline <script> in the root layout arms a 4-second timer that adds
 * `nx-force-visible` to <html> UNLESS this component has flagged the page
 * as successfully hydrated (window.__nxHydrated = true).
 *
 * Why: every entrance animation on the site (framer-motion <Reveal>,
 * hero visuals, strips) server-renders with inline `opacity: 0`. If React
 * never hydrates — e.g. a sandbox restart kills a JS chunk mid-flight in
 * the preview window — those elements would stay permanently invisible and
 * whole sections (including the homepage hero with Dr. Amelia Hart)
 * would appear "missing". The watchdog makes that failure mode impossible:
 * worst case, content shows immediately without its entrance animation.
 */
export function HydrationWatchdog() {
  useEffect(() => {
    window.__nxHydrated = true;
  }, []);

  return null;
}
