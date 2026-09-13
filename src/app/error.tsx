"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/* ============================================================
   ERROR BOUNDARY — Global route-level error handler
   Shows a friendly error page instead of a blank screen.
   Liquid Gold treatment — same family as the branded 404:
   charcoal ground, champagne ambient light, gold CTA.

   Behavior preserved: reports to Bug Sentinel, then
   AUTO-RECOVERY transparently retries up to 2 times per
   digest before this fallback ever shows.
   ============================================================ */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error Boundary]", error);
    // Feed the Bug Sentinel collector (best-effort, never throws).
    try {
      void fetch("/api/nx/system/errors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "boundary",
          message: (error.message || "route render error").slice(0, 300),
          stack: error.stack?.slice(0, 1500),
          path: typeof location !== "undefined" ? location.pathname : undefined,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {}

    // AUTO-RECOVERY: transparently retry up to 2 times per digest
    // before showing this fallback. Most transient render errors
    // (HMR races, stale chunks, one-off fetch failures) heal here
    // without the user ever seeing a broken page.
    try {
      const key = `nx:retry:${error.digest ?? error.message.slice(0, 80)}`;
      const attempts = Number(sessionStorage.getItem(key) ?? 0);
      if (attempts < 2) {
        sessionStorage.setItem(key, String(attempts + 1));
        setTimeout(() => reset(), 150 * (attempts + 1));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {}
  }, [error, reset]);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#141210] px-4 text-[#F6F1E7]">
      {/* ambient champagne light */}
      <div aria-hidden className="aurora-gold top-[-30%] left-1/2 h-[26rem] w-[40rem] -translate-x-1/2 opacity-35" />
      <div aria-hidden className="grain-fine" />

      <div className="relative w-full max-w-md text-center">
        {/* Icon in a champagne ring */}
        <div
          className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-white/5 ring-1 ring-white/10 shadow-lux-2"
          aria-hidden="true"
        >
          <AlertTriangle className="h-7 w-7 text-[#D9B87C]" />
        </div>

        {/* Message */}
        <p className="eyebrow justify-center">Something interrupted the chart</p>
        <h1 className="title-lux mt-3 text-2xl sm:text-3xl">
          This page hit a snag
        </h1>
        <p className="lede-lux mt-3 text-sm text-white/60">
          An unexpected error occurred and our team has been notified. Your data
          is safe — try again, or return to the homepage.
        </p>

        {/* Error digest (for debugging) */}
        {error.digest && (
          <p className="mx-auto mt-5 w-fit rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-[0.65rem] text-white/50">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="btn-gold h-10 rounded-full px-5 text-sm font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className="btn-glass-lux h-10 rounded-full border-white/15 bg-white/5 px-5 text-sm font-medium text-white/85"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
