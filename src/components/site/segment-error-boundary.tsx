"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
   SEGMENT ERROR BOUNDARY — shared implementation for the
   per-segment error.tsx files (/predictive, /clinic, /pharmacy,
   /portal, /connect, /know-your-health, /global).

   Next.js requires each error.tsx to be a Client Component, so
   every segment file is a thin "use client" wrapper that passes
   its variant — one calm panel, parameterized per segment so it
   blends with that section's visual tone.

   Copy is fixed by mission spec:
   - title  "This section hit a snag"
   - body   "Your data is safe — you can retry or return to the homepage."
   - actions  Try again (reset()) + Go home (Link /)
   ============================================================ */

export type SegmentErrorVariant = "canvas" | "warm" | "connect" | "light" | "kyh";

type VariantStyle = {
  shell: string;
  shellStyle?: React.CSSProperties;
  panel: string;
  iconWrap: string;
  title: string;
  body: string;
  primary: string;
  ghost: string;
};

const VARIANTS: Record<SegmentErrorVariant, VariantStyle> = {
  /* /predictive — nxf dark canvas. Note: globals.css forces pure-white
     ink inside .nxf-root, so the primary action carries a deep emerald
     background (white ink stays readable) per the nxf button convention. */
  canvas: {
    shell: "nxf-root grid min-h-screen place-items-center px-4",
    shellStyle: { backgroundColor: "#0B1630", minHeight: "100dvh", colorScheme: "dark" },
    panel: "w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm",
    iconWrap: "bg-white/10 ring-1 ring-white/15",
    title: "text-xl font-semibold tracking-tight opacity-95",
    body: "text-sm leading-relaxed opacity-75",
    primary: "bg-[#0E8A6A] hover:bg-[#0FA37C]",
    ghost: "border border-white/25 hover:bg-white/10 opacity-90",
  },
  /* /clinic /pharmacy /portal — light warm panels on the #FAF7F2 canvas.
     Accent: Liquid Gold (platform brand) — replaces the pre-gold coral. */
  warm: {
    shell: "grid min-h-screen place-items-center bg-[#FAF7F2] px-4",
    panel: "w-full max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-[#EFE9E0] shadow-depth",
    iconWrap: "bg-[#A16207]/10 text-[#8A5A04]",
    title: "text-xl font-semibold tracking-tight text-[#2A2622]",
    body: "text-sm leading-relaxed text-[#7A6F63]",
    primary: "bg-[#A16207] text-[#FFFDF6] hover:bg-[#8A5A04] shadow-[0_8px_22px_-8px_rgba(166,124,42,0.55)]",
    ghost: "border border-[#E7E5E4] text-[#57534E] hover:bg-[#FAF7F2]",
  },
  /* /connect — dark warm-brown canvas used by the connect app shells.
     Champagne solid reads best on the dark brown (deep gold would sink). */
  connect: {
    shell: "grid min-h-screen place-items-center bg-[#1F1B17] px-4",
    panel: "w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center",
    iconWrap: "bg-[#D9B87C]/15 text-[#D9B87C]",
    title: "text-xl font-semibold tracking-tight text-white",
    body: "text-sm leading-relaxed text-white/60",
    primary: "bg-[#D9B87C] text-[#1F1B17] hover:bg-[#C9A55F] shadow-[0_8px_22px_-8px_rgba(217,184,124,0.35)]",
    ghost: "border border-white/20 text-white/80 hover:bg-white/10",
  },
  /* /global — white marketing page, slate ink, Liquid Gold accent. */
  light: {
    shell: "grid min-h-screen place-items-center bg-white px-4",
    panel: "w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center",
    iconWrap: "bg-[#A16207]/10 text-[#8A5A04]",
    title: "text-xl font-semibold tracking-tight text-slate-900",
    body: "text-sm leading-relaxed text-slate-500",
    primary: "bg-[#A16207] text-[#FFFDF6] hover:bg-[#8A5A04] shadow-[0_8px_22px_-8px_rgba(166,124,42,0.55)]",
    ghost: "border border-slate-200 text-slate-600 hover:bg-slate-100",
  },
  /* /know-your-health — KYH glass aesthetic on the #FAF7F2 mesh,
     Liquid Gold accent (replaces the pre-gold rose). */
  kyh: {
    shell: "mesh-bg grid min-h-screen place-items-center bg-[#FAF7F2] px-4",
    panel: "glass-soft shadow-depth w-full max-w-md rounded-2xl p-6 text-center sm:p-8",
    iconWrap: "bg-[#A16207]/12 text-[#8A5A04]",
    title: "text-xl font-semibold tracking-tight text-[#1F1B17]",
    body: "text-sm leading-relaxed text-[#9A8F84]",
    primary: "bg-[#A16207] text-[#FFFDF6] hover:bg-[#8A5A04] shadow-[0_8px_22px_-8px_rgba(166,124,42,0.55)]",
    ghost: "border border-[#E7E0D6] text-[#5A5248] hover:bg-white/70",
  },
};

export function SegmentErrorBoundary({
  error,
  reset,
  variant,
  tag,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  variant: SegmentErrorVariant;
  tag: string;
}) {
  useEffect(() => {
    console.error(`[Segment Error:${tag}]`, error);
    // Feed the Bug Sentinel collector (best-effort, never throws) —
    // same shape the root error boundary reports.
    try {
      void fetch("/api/nx/system/errors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "boundary",
          message: (error.message || "segment render error").slice(0, 300),
          stack: error.stack?.slice(0, 1500),
          path: typeof location !== "undefined" ? location.pathname : undefined,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, [error, tag]);

  const v = VARIANTS[variant];

  return (
    <div className={v.shell} style={v.shellStyle}>
      <div className={v.panel} role="alert">
        <div
          className={cn(
            "mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full",
            v.iconWrap
          )}
          aria-hidden="true"
        >
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className={v.title}>This section hit a snag</h1>
        <p className={cn("mt-2", v.body)}>
          Your data is safe — you can retry or return to the homepage.
        </p>

        {error.digest && (
          <p className={cn("mt-5 rounded-lg bg-black/5 px-3 py-2 font-mono text-[0.65rem] opacity-80", v.body)}>
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
              v.primary
            )}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
              v.ghost
            )}
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
