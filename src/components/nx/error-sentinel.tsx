"use client";

import { useEffect } from "react";

/* ============================================================
   BUG SENTINEL — in-app automatic bug detection & self-healing.

   Layer 1 — DETECT:   traps window.onerror + unhandledrejection
                       for every page, app-wide.
   Layer 2 — RECTIFY:  stale-bundle errors (ChunkLoadError, dynamic
                       import failures after a redeploy) are healed
                       instantly with one throttled auto-reload —
                       the browser picks up the fresh build.
   Layer 3 — REPORT:   everything else is rate-limited, deduped and
                       POSTed to /api/nx/system/errors so the
                       collector log + system-status diagnostics see
                       client-side health in near-realtime.

   No UI, no dependencies; safe to mount once in the root layout.
   ============================================================ */

const STALE_PATTERNS = [
  "ChunkLoadError",
  "Loading chunk",
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error building sitewide", // nextjs deploy id mismatch wording
  "dynamically imported module",
];

const RELOAD_KEY = "nx:sentinel:reload-at";
const SENT_KEY = "nx:sentinel:sent";
const RELOAD_THROTTLE_MS = 60_000; // max one healing reload per minute
const REPORT_MIN_GAP_MS = 1_500; // no report floods
const REPORT_MAX_SESSION = 20;

function isStaleChunkError(msg: string): boolean {
  return STALE_PATTERNS.some((p) => msg.includes(p));
}

function shouldReport(key: string): boolean {
  try {
    const now = Date.now();
    const last = Number(sessionStorage.getItem("nx:sentinel:last-report") ?? 0);
    if (now - last < REPORT_MIN_GAP_MS) return false;
    const seen = new Set(JSON.parse(sessionStorage.getItem(SENT_KEY) ?? "[]") as string[]);
    if (seen.has(key)) return false; // dedupe identical errors
    if (seen.size >= REPORT_MAX_SESSION) return false; // flood cap per session
    seen.add(key);
    sessionStorage.setItem(SENT_KEY, JSON.stringify([...seen]));
    sessionStorage.setItem("nx:sentinel:last-report", String(now));
    return true;
  } catch {
    return false;
  }
}

function report(payload: {
  kind: string;
  message: string;
  source?: string;
  line?: number;
  col?: number;
  stack?: string;
}) {
  try {
    void fetch("/api/nx/system/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        path: typeof location !== "undefined" ? location.pathname : undefined,
        at: new Date().toISOString(),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // reporting must never throw
  }
}

export function ErrorSentinel() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onError = (e: ErrorEvent) => {
      const msg = e.message || "unknown error";
      if (isStaleChunkError(msg)) {
        const now = Date.now();
        const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
        if (now - last > RELOAD_THROTTLE_MS) {
          sessionStorage.setItem(RELOAD_KEY, String(now));
          // self-heal: reload once to pick up the fresh deployment
          report({
            kind: "stale-chunk",
            message: msg.slice(0, 300),
            source: e.filename?.slice(0, 200),
            line: e.lineno,
            col: e.colno,
          });
          window.location.reload();
          return;
        }
      }
      if (shouldReport(`${e.lineno}:${msg}`)) {
        report({
          kind: "error",
          message: msg.slice(0, 300),
          source: e.filename?.slice(0, 200),
          line: e.lineno,
          col: e.colno,
          stack: (e.error instanceof Error ? e.error.stack : undefined)?.slice(0, 1500),
        });
      }
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      const msg =
        typeof e.reason === "string" ? e.reason : (e.reason?.message ?? "unhandled rejection");
      if (isStaleChunkError(msg)) {
        const now = Date.now();
        const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
        if (now - last > RELOAD_THROTTLE_MS) {
          sessionStorage.setItem(RELOAD_KEY, String(now));
          report({ kind: "stale-chunk", message: msg.slice(0, 300) });
          window.location.reload();
          return;
        }
      }
      if (shouldReport(`rejection:${msg}`)) {
        report({
          kind: "unhandledrejection",
          message: msg.slice(0, 300),
          stack: e.reason?.stack?.slice(0, 1500),
        });
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
