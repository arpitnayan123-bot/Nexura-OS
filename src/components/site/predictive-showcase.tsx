"use client";

/* ============================================================
 * PIE — homepage showcase section
 * Surfaces the Predictive Intelligence Engine on the landing
 * page: what it is, one live-feel stat row, and the two doors
 * in (public engine page + patient forecast).
 * ============================================================ */

import Link from "next/link";
import {
  Activity, ArrowRight, BrainCircuit, ShieldCheck, Sparkles,
} from "lucide-react";
import { Reveal } from "./ambient";

const TILES = [
  {
    icon: BrainCircuit,
    title: "Crisis Radar",
    desc: "Every patient scored 0–100 on Time-to-Decay, the whole hospital re-ranked continuously — red cases surface hours before they crash.",
  },
  {
    icon: Activity,
    title: "Living Twin",
    desc: "A digital twin per patient — physiology plus personal trajectory — that answers “what happens if we do nothing” and “what if we act now”.",
  },
  {
    icon: ShieldCheck,
    title: "Pre-emptive, with a human in charge",
    desc: "Red lines draft guideline-backed protocols, coordinate nurse and pharmacy tasks — and a clinician approves with one click. Every score carries its Why.",
  },
];

export function PredictiveShowcase() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-8 text-white shadow-[0_24px_80px_-32px_rgba(76,29,149,0.55)] sm:p-12">
            <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_15%_25%,rgba(139,92,246,0.35),transparent_45%),radial-gradient(circle_at_85%_75%,rgba(59,130,246,0.25),transparent_45%)]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> New · Predictive Intelligence Engine
              </div>
              <h2 className="mt-5 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl">
                Healthcare is reactive.
                <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
                  Nexura makes it predictive.
                </span>
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-violet-100/80 sm:text-base">
                The engine beneath every product: it streams vitals, labs, wearables and notes into a Living Twin,
                scores each patient&apos;s Time-to-Decay, and drafts pre-emptive protocols before the crisis —
                with a clinician&apos;s one-click approval sealing every action.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {TILES.map((t, i) => (
                  <Reveal key={t.title} delay={i * 0.08}>
                    <div className="h-full rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                        <t.icon className="h-4.5 w-4.5 text-violet-200" />
                      </div>
                      <h3 className="mt-3 text-sm font-bold">{t.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-violet-100/75">{t.desc}</p>
                    </div>
                  </Reveal>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/predictive"
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-violet-50"
                >
                  Explore the engine — live demo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/predictive/my-future"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
                >
                  Patients: see My Health Forecast
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
