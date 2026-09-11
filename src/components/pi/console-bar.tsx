"use client";

/* ============================================================
 * PIE UI — ConsoleBar
 * The command-center top bar: brand, engine status readout and
 * the booking CTA. Deliberately dark and glassy — this page is a
 * standalone console and never inherits the site theme.
 * ============================================================ */

import Link from "next/link";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { useBooking } from "@/components/site/booking-context";

export function ConsoleBar() {
  const { openBooking } = useBooking();
  return (
    <header className="sticky top-0 z-40 border-b border-sky-400/10 bg-slate-950/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-sky-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            aria-label="Return to Nexura Hospital OS"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Hospital OS</span>
            <span className="sm:hidden">OS</span>
          </Link>
          <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden="true" />
          <p className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/90 sm:block">
            Predictive Intelligence Engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/[0.07] px-3 py-1.5 md:inline-flex" title="Engine sweep running — cohort re-scored every 90 seconds">
            <span className="nxp-live h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Engine live · v4.2</span>
          </span>
          <button
            onClick={() => openBooking({ reason: "Predictive Intelligence Engine deployment" })}
            className="rounded-full border border-sky-400/40 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 px-4 py-1.5 text-xs font-semibold text-sky-200 transition hover:from-cyan-500/30 hover:to-violet-500/30 hover:shadow-[0_0_24px_-6px_rgba(56,189,248,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Deploy in your hospital
          </button>
        </div>
      </div>
    </header>
  );
}

/** Deployment CTA for the page footer band — opens the global booking modal. */
export function DeployCta() {
  const { openBooking } = useBooking();
  return (
    <button
      onClick={() => openBooking({ reason: "Predictive Intelligence Engine — deployment briefing" })}
      className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_40px_-10px_rgba(6,182,212,0.9)] transition hover:shadow-[0_0_52px_-8px_rgba(6,182,212,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
    >
      Book a deployment briefing
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
