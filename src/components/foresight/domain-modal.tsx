"use client";

/* ============================================================
 * FORESIGHT DOMAIN DRILL-DOWN — the full atlas behind a vertex.
 *
 * Every halo vertex and every atlas chip opens this modal:
 * the complete, honest detail for one domain — all factors
 * (risk AND protective), all screening items, all actions,
 * the questions worth asking. Nothing hidden behind "top 3".
 * ============================================================ */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, HeartPulse, ShieldCheck, Sparkles, Stethoscope, X } from "lucide-react";
import type { DomainResult } from "@/modules/foresight/types";
import { DOMAIN_META } from "./viz";
import { Bar, LevelChip } from "./ui";
import { cn } from "@/lib/utils";

export function DomainModal({
  domain,
  onClose,
}: {
  domain: DomainResult | null;
  onClose: () => void;
}) {
  /* close on Escape + lock scroll while open */
  useEffect(() => {
    if (!domain) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [domain, onClose]);

  if (!domain) return null;
  const meta = DOMAIN_META[domain.id];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${meta?.label ?? domain.id} details`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
        className="nxf-glass nxf-scroll max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-[22px] p-5 sm:p-7"
      >
        {/* header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-display text-xl font-semibold nxf-hi">
              <span aria-hidden="true" className="nxf-gold nxf-glyph-glow">
                {meta?.glyph}
              </span>
              {meta?.label ?? domain.id}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <LevelChip level={domain.level} />
              <span className="text-[11px] nxf-mute">
                confidence: {domain.confidence.replaceAll("_", " ").toLowerCase()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 nxf-body transition hover:border-amber-300/50 hover:text-amber-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* burden */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] nxf-mute">
            <span>signal burden — screening scope, not a probability</span>
            <span className="nxf-mono">{domain.burden}/100</span>
          </div>
          <Bar
            pct={domain.burden}
            tone={
              domain.level === "HIGH"
                ? "rose"
                : domain.level === "ELEVATED"
                  ? "orange"
                  : domain.level === "WATCH"
                    ? "amber"
                    : "emerald"
            }
          />
        </div>

        {domain.headline && (
          <p className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-[13.5px] leading-relaxed nxf-body">
            {domain.headline}
          </p>
        )}

        {/* factors — complete list, both directions */}
        {domain.factors.length > 0 && (
          <section className="mb-5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] nxf-gold">
              <Sparkles className="h-3.5 w-3.5" /> Every factor the engine weighed
            </p>
            <div className="space-y-1.5">
              {domain.factors.map((f) => (
                <div
                  key={f.id}
                  className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      f.direction === "risk"
                        ? domain.level === "HIGH"
                          ? "bg-rose-300"
                          : "bg-amber-300"
                        : "bg-emerald-300",
                    )}
                  />
                  <p className="text-[12.5px] leading-relaxed nxf-dim">
                    {f.label}
                    <span className="ml-1.5 nxf-mono text-[10.5px] nxf-mute">
                      {f.direction === "risk" ? "+" : "−"}
                      {f.weight}
                    </span>
                    {f.detail ? (
                      <span className="block text-[11.5px] nxf-mute">{f.detail}</span>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* screening */}
          {domain.screening.length > 0 && (
            <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] nxf-violet">
                <Stethoscope className="h-3.5 w-3.5" /> Worth testing
              </p>
              <ul className="space-y-2">
                {domain.screening.map((s) => (
                  <li key={s.test} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
                    <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 nxf-violet" />
                    <span className="nxf-dim">
                      <span className="font-semibold nxf-hi">{s.test}</span> — {s.why}
                      {s.cadence ? (
                        <span className="block text-[11px] nxf-mute">{s.cadence}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* actions */}
          {domain.actions.length > 0 && (
            <section className="rounded-xl border border-teal-400/15 bg-teal-400/[0.05] p-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-teal-200">
                <HeartPulse className="h-3.5 w-3.5" /> What moves it back
              </p>
              <ul className="space-y-2">
                {domain.actions.map((a) => (
                  <li key={a.title} className="text-[12.5px] leading-relaxed">
                    <p className="font-semibold text-teal-100">{a.title}</p>
                    <p className="nxf-dim">{a.detail}</p>
                    <p className="text-[10.5px] uppercase tracking-wider nxf-mute">
                      effort: {a.effort}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* questions */}
        {domain.clinicianQuestions.length > 0 && (
          <section className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] nxf-teal">
              <ShieldCheck className="h-3.5 w-3.5" /> Ask your doctor
            </p>
            <ul className="space-y-1.5">
              {domain.clinicianQuestions.map((q, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[12.5px] leading-relaxed nxf-dim"
                >
                  <span className="nxf-gold">›</span> {q}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-4 text-[11px] leading-relaxed nxf-mute">
          Signal level within screening scope — never a diagnosis, never a probability. Your doctor
          confirms or clears every item here with your full history.
        </p>
      </motion.div>
    </div>
  );
}
