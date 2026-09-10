"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/* ============================================================
   ERROR BOUNDARY — Global route-level error handler
   Shows a friendly error page instead of a blank screen.
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
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        {/* Message */}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          An unexpected error occurred. Our team has been notified.
          You can try again or go back to the homepage.
        </p>

        {/* Error digest (for debugging) */}
        {error.digest && (
          <p className="mb-6 rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-[0.6rem] text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
