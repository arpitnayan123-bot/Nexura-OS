/* ============================================================
 * PHI — landing hero
 * Calm, premium, trustworthy. Safety language before features.
 * ============================================================ */

"use client";

import { Activity, ArrowRight, ChevronDown, History, ShieldCheck } from "lucide-react";
import { DemoBadge, usePhiT } from "./ui-primitives";
import type { PhiStatusPayload } from "./api-client";

export function Landing({
  onStart,
  onOpenHistory,
  hasHistory,
  status,
}: {
  onStart: () => void;
  onOpenHistory: () => void;
  hasHistory: boolean;
  status: PhiStatusPayload | null;
}) {
  const { t } = usePhiT();

  const scrollToHow = () => {
    const el = document.getElementById("phi-how");
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
      {/* ambient glows — decoration only, never rose */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-12rem] h-[30rem] w-[46rem] -translate-x-1/2 rounded-full bg-teal-400/[0.07] blur-[120px]" />
        <div className="absolute right-[-10rem] top-[18rem] h-[22rem] w-[22rem] rounded-full bg-amber-300/[0.05] blur-[110px]" />
      </div>

      <div className="relative">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">
          {t("landing.eyebrow")}
        </p>

        <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
          {t("landing.h1a")}
          <span className="mt-1 block bg-gradient-to-r from-teal-200 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
            {t("landing.h1b")}
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          {t("landing.sub")}
        </p>

        <div className="mt-6">
          <DemoBadge label={t("landing.demoBadge")} />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-teal-300 px-7 py-3 text-sm font-semibold text-[#0A1220] shadow-[0_10px_36px_-12px_rgba(94,234,212,0.55)] transition hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            <Activity aria-hidden="true" className="h-4 w-4" />
            {t("landing.ctaPrimary")}
          </button>
          <button
            type="button"
            onClick={scrollToHow}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-7 py-3 text-sm font-semibold text-slate-200 transition hover:border-teal-300/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            {t("landing.ctaSecondary")}
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-7 text-xs leading-relaxed text-slate-400 sm:text-[13px]">
          {t("landing.trustRow")}
        </p>

        {/* How safety works — honest, always visible. Versions from GET /status. */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-teal-300" />
            {t("landing.safetyTitle")}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
            {t("landing.safetyBody")}
          </p>
          {status && (
            <p className="mt-3 font-mono text-[11px] tracking-wide text-slate-500">
              {t("results.versionLine", {
                engine: status.engineVersion,
                ruleset: status.rulesetVersion,
                content: status.contentVersion,
              })}
            </p>
          )}
        </div>

        {/* Continue where you left off */}
        {hasHistory && (
          <div className="mt-6 rounded-2xl border border-teal-300/25 bg-teal-300/[0.05] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <History aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-white">
                    {t("landing.continueTitle")}
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
                    {t("landing.continueDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenHistory}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-teal-300/40 bg-teal-300/10 px-5 py-2.5 text-sm font-semibold text-teal-100 transition hover:bg-teal-300/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
              >
                {t("landing.continueCta")}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* 3-step explainer */}
        <div id="phi-how" className="mt-16 scroll-mt-24">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            {t("landing.howTitle")}
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li
                key={n}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-teal-300/25"
              >
                <span
                  aria-hidden="true"
                  className="inline-grid h-8 w-8 place-items-center rounded-full border border-teal-300/40 bg-teal-300/10 font-mono text-sm font-semibold text-teal-200"
                >
                  {n}
                </span>
                <h3 className="mt-3.5 text-sm font-semibold leading-snug tracking-tight text-white">
                  {t(`landing.how${n}t`)}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
                  {t(`landing.how${n}d`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
