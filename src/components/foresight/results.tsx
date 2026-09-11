"use client";

/* ============================================================
 * FORESIGHT RESULTS — the payoff.
 * Order is safety-locked: triage first, halo second, then
 * explainable domain cards, trajectory, plan, diet, questions.
 * ============================================================ */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2,
  Copy, HeartPulse, Leaf, PhoneCall, ShieldCheck, Sparkles, Stethoscope, TrendingUp,
} from "lucide-react";
import type { ForesightReport } from "@/modules/foresight/types";
import { DOMAIN_META, HealthHalo, TrajectoryChart } from "./viz";
import { Bar, Eyebrow, GlassCard, LevelChip, Ornament, SectionHead, fadeUp } from "./ui";
import { cn } from "@/lib/utils";

const BAND_COPY: Record<string, { headline: string; sub: string }> = {
  THRIVING: { headline: "You're building something rare", sub: "Your patterns read resilient. Protect what's working." },
  RESILIENT: { headline: "Solid ground, a few edges", sub: "Mostly resilient patterns with a couple of things worth watching." },
  BUILDING: { headline: "Real signals — real headroom", sub: "Several patterns deserve attention. All of them respond to action." },
  ATTENTION: { headline: "Your body is asking for help", sub: "Multiple domains are loaded. Start with the top card — and take the doctor list seriously." },
};

/* ---------------- triage takeovers ---------------- */

export function EmergencyTakeover({ report, onAcknowledge }: { report: ForesightReport; onAcknowledge: () => void }) {
  const t = report.triage;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="nxf-emergency relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500" />
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-rose-400/40 bg-rose-400/10">
            <AlertTriangle className="h-6 w-6 nxf-rose nxf-pulse-dot" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <Eyebrow className="!text-rose-300">Safety first — this comes before everything</Eyebrow>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight nxf-hi sm:text-3xl">{t.headline}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed nxf-body">{t.body}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {t.hits.map((h) => (
            <div key={h.id} className="rounded-2xl border border-rose-400/25 bg-white/[0.07] p-4">
              <p className="text-[15px] font-semibold nxf-hi">{h.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed nxf-body">{h.why}</p>
              <p className="mt-2 text-[13px] font-semibold leading-relaxed text-rose-200">{h.action}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="tel:108" className="nxf-cta !bg-gradient-to-r !from-rose-500 !to-rose-400 !text-white">
            <PhoneCall className="h-4 w-4" aria-hidden="true" /> Call 108 now
          </a>
          <a href="tel:14416" className="nxf-cta nxf-cta-ghost">
            Tele-MANAS 14416 (free, 24×7)
          </a>
          <button type="button" className="nxf-cta nxf-cta-ghost" onClick={onAcknowledge}>
            I understand — show the rest
          </button>
        </div>
        <p className="mt-4 text-[11.5px] leading-relaxed nxf-mute">
          Nexura has paused all pattern analysis. Nothing here is a diagnosis — emergency services and doctors handle what matters now.
        </p>
      </div>
    </motion.div>
  );
}

function SameDayBanner({ report }: { report: ForesightReport }) {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-5">
      <div className="flex items-start gap-3.5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 nxf-amber" aria-hidden="true" />
        <div>
          <p className="text-[15px] font-semibold nxf-hi">{report.triage.headline}</p>
          {report.triage.hits.map((h) => (
            <div key={h.id} className="mt-1.5 text-[13px] leading-relaxed nxf-body">
              <span className="font-semibold nxf-amber">{h.title}. </span>{h.why} <span className="font-semibold">{h.action}</span>
            </div>
          ))}
          <p className="mt-2 text-[11.5px] nxf-mute">Your full map is below — but this visit comes first.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- results view ---------------- */

export function ResultsView({
  report, onRerun, onSummary,
}: {
  report: ForesightReport;
  onRerun: () => void;
  onSummary: (text: string) => void;
}) {
  const [emergencyAck, setEmergencyAck] = useState(false);
  const [copied, setCopied] = useState(false);
  const band = BAND_COPY[report.scoreBand] ?? BAND_COPY.BUILDING;
  const topDomains = report.topDomainIds
    .map((id) => report.domains.find((d) => d.id === id))
    .filter((d): d is NonNullable<typeof d> => !!d);

  const copyDoctorSummary = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch { /* clipboard blocked — no-op */ }
  };

  if (report.triage.level === "EMERGENCY" && !emergencyAck) {
    return <EmergencyTakeover report={report} onAcknowledge={() => setEmergencyAck(true)} />;
  }

  return (
    <div className="space-y-10">
      {report.triage.level === "EMERGENCY" && (
        <button type="button" onClick={() => setEmergencyAck(false)}
          className="w-full rounded-2xl border border-rose-400/40 bg-rose-400/[0.08] p-4 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold nxf-rose">
            <AlertTriangle className="h-4 w-4" /> Emergency guidance is pinned at the top — tap to reopen
          </p>
        </button>
      )}
      {report.triage.level === "SAME_DAY" && <SameDayBanner report={report} />}

      {/* HERO — halo */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
        <Eyebrow className="mb-3">Your foresight map · engine {report.engineVersion}</Eyebrow>
        <h1 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight nxf-hi sm:text-[2.6rem] sm:leading-[1.12]">
          {report.analysisWithheld ? "Analysis paused for your safety" : band.headline}
        </h1>
        {!report.analysisWithheld && (
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed nxf-dim">{band.sub}</p>
        )}
        <div className="mt-8">
          <HealthHalo domains={report.domains} score={report.foresightScore} band={report.scoreBand} size={430} />
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-[12px] leading-relaxed nxf-mute">
          The halo expands toward domains carrying more risk-burden. It reads signal patterns — never a diagnosis, never a probability.
        </p>
      </motion.section>

      {/* protective strip */}
      {report.protectiveFactors.length > 0 && (
        <GlassCard className="p-5 sm:p-6" {...fadeUp}>
          <div className="flex items-start gap-3.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 nxf-teal" aria-hidden="true" />
            <div>
              <p className="text-[15px] font-semibold nxf-hi">What's already protecting you</p>
              <p className="mt-1 text-[13px] leading-relaxed nxf-dim">{report.protectiveFactors.join(" · ")}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* DOMAIN CARDS */}
      <motion.section {...fadeUp}>
        <SectionHead
          eyebrow="Signal cards"
          title="Where the weight sits — and why"
          sub="Every card lists the exact factors that moved it, the screening worth discussing, and the actions that move it back."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {topDomains.map((d, i) => (
            <GlassCard key={d.id} className="flex flex-col p-5" {...fadeUp} transition={{ duration: 0.6, delay: i * 0.08 }}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[15px] font-semibold nxf-hi">
                  <span aria-hidden="true" className="nxf-gold nxf-glyph-glow">{DOMAIN_META[d.id]?.glyph}</span>
                  {DOMAIN_META[d.id]?.label ?? d.id}
                </p>
                <LevelChip level={d.level} />
              </div>
              <p className="text-[13px] leading-relaxed nxf-body">{d.headline}</p>

              <div className="mt-3.5">
                <div className="mb-1.5 flex items-center justify-between text-[11px] nxf-mute">
                  <span>signal burden</span><span className="nxf-mono">{d.burden}/100</span>
                </div>
                <Bar pct={d.burden} tone={d.level === "HIGH" ? "rose" : d.level === "ELEVATED" ? "orange" : d.level === "WATCH" ? "amber" : "emerald"} />
              </div>

              <div className="mt-4 space-y-1.5">
                {d.factors.slice(0, 5).map((f) => (
                  <p key={f.id} className="flex items-start gap-2 text-[12px] leading-relaxed">
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", f.direction === "risk" ? (d.level === "HIGH" ? "bg-rose-300" : "bg-amber-300") : "bg-emerald-300")} />
                    <span className="nxf-dim">{f.label}</span>
                  </p>
                ))}
              </div>

              {d.screening.length > 0 && (
                <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] nxf-violet">
                    <Stethoscope className="h-3.5 w-3.5" /> Discuss with a doctor
                  </p>
                  {d.screening.slice(0, 2).map((s) => (
                    <p key={s.test} className="text-[12px] leading-relaxed nxf-dim">
                      <span className="font-semibold nxf-hi">{s.test}</span> — {s.why}
                    </p>
                  ))}
                </div>
              )}

              {d.actions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {d.actions.slice(0, 2).map((a) => (
                    <div key={a.title} className="rounded-xl border border-teal-400/15 bg-teal-400/[0.05] p-3">
                      <p className="text-[12.5px] font-semibold text-teal-200">{a.title}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed nxf-dim">{a.detail}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-auto pt-3 text-[10.5px] nxf-mute">confidence: {d.confidence.replaceAll("_", " ").toLowerCase()}</p>
            </GlassCard>
          ))}
        </div>
      </motion.section>

      {/* TRAJECTORY */}
      {!report.analysisWithheld && (
        <GlassCard className="p-5 sm:p-7" {...fadeUp}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Eyebrow className="mb-2">Five-year direction</Eyebrow>
              <h2 className="font-display text-xl font-semibold tracking-tight nxf-hi sm:text-2xl">Two futures from today</h2>
              <p className="mt-1 text-[13px] nxf-dim">Illustrative slope — the curve bends with the actions above, not with luck.</p>
            </div>
            <TrendingUp className="hidden h-6 w-6 nxf-teal sm:block" aria-hidden="true" />
          </div>
          <TrajectoryChart unchangedScore={report.trajectory.unchangedScore} withActionsScore={report.trajectory.withActionsScore} currentScore={report.foresightScore} />
          <div className="mt-2 flex flex-wrap gap-4 text-[12px]">
            <span className="flex items-center gap-1.5 nxf-dim"><span className="h-0.5 w-5 rounded bg-rose-300" /> stay on current course — {report.trajectory.unchangedScore}</span>
            <span className="flex items-center gap-1.5 nxf-dim"><span className="h-0.5 w-5 rounded bg-teal-300" /> act on the plan — {report.trajectory.withActionsScore}</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed nxf-mute">{report.trajectory.note}</p>
        </GlassCard>
      )}

      {/* SCREENING PLAN */}
      {!report.analysisWithheld && (
        <motion.section {...fadeUp}>
          <SectionHead eyebrow="Screening plan" title="Worth testing, worth asking" sub="A short list to carry into your next check-up — doctors confirm or drop each item." />
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-5" hover={false}>
              <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] nxf-violet">
                <Stethoscope className="h-4 w-4" /> Tests to discuss
              </p>
              <ul className="space-y-2.5">
                {report.domains.filter((d) => d.level === "WATCH" || d.level === "ELEVATED" || d.level === "HIGH").flatMap((d) => d.screening).filter((s) => !s.test.startsWith("None")).slice(0, 6).map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 nxf-violet" aria-hidden="true" />
                    <span className="nxf-body"><span className="font-semibold nxf-hi">{s.test}</span> — {s.why}{s.cadence ? ` (${s.cadence})` : ""}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
            <GlassCard className="p-5" hover={false}>
              <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] nxf-teal">
                <HeartPulse className="h-4 w-4" /> Questions for your doctor
              </p>
              <ul className="space-y-2.5">
                {report.clinicianQuestions.slice(0, 5).map((q, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 nxf-teal" aria-hidden="true" />
                    <span className="nxf-body">{q}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </motion.section>
      )}

      {/* DIET PRESCRIPTION */}
      {!report.analysisWithheld && (
        <GlassCard className="p-5 sm:p-7" {...fadeUp}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <Eyebrow className="mb-2">Food as instrumentation</Eyebrow>
              <h2 className="font-display text-xl font-semibold tracking-tight nxf-hi sm:text-2xl">
                Your kitchen, tuned — {report.diet.cuisineLabel}
              </h2>
            </div>
            <Leaf className="hidden h-6 w-6 text-emerald-300 sm:block" aria-hidden="true" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.diet.swaps.map((s, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <p className="text-[12px] nxf-mute line-through decoration-rose-300/50">{s.from}</p>
                <p className="mt-1 flex items-start gap-2 text-[13px] font-medium nxf-hi">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" /> {s.to}
                </p>
                {s.note ? <p className="mt-1 pl-5 text-[11.5px] nxf-mute">{s.note}</p> : null}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] nxf-mute">The plate rule — every meal, every cuisine</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {report.diet.plateRule.map((p, i) => (
                <p key={i} className="flex items-start gap-2 text-[12.5px] nxf-dim">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" /> {p}
                </p>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* DOCTOR SUMMARY */}
      <GlassCard className="p-5 sm:p-7" {...fadeUp}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow className="mb-2">Clinician handoff</Eyebrow>
            <h2 className="font-display text-xl font-semibold tracking-tight nxf-hi sm:text-2xl">One tap — everything a doctor needs</h2>
            <p className="mt-1 max-w-xl text-[13px] nxf-dim">
              A structured summary: signals, factors, suggested screening and your questions. Copy it into WhatsApp, email or print it for the visit.
            </p>
          </div>
          <button type="button" className="nxf-cta" onClick={() => onSummary(report.doctorSummary ?? "")}>
            <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? "Copied!" : "Copy doctor summary"}
          </button>
        </div>
      </GlassCard>

      {/* completeness + footer stamps */}
      <div className="flex flex-col gap-3 pb-4 text-center">
        <Ornament label="Honest data · versioned engine" className="mb-1" />
        <div className="mx-auto flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] nxf-mute">
            information shared: <span className="nxf-mono nxf-gold">{report.completeness.pct}%</span>
          </span>
          {report.completeness.missing.length > 0 && (
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] nxf-mute">
              missing: {report.completeness.missing.slice(0, 4).join(", ")}
            </span>
          )}
        </div>
        <p className="mx-auto max-w-2xl text-[11.5px] leading-relaxed nxf-mute">{report.disclaimer}</p>
        <p className="nxf-mono text-[10px] tracking-wider text-[#C0BAA9]">
          <span aria-hidden="true" className="nxf-glyph-glow nxf-gold">✦ </span>
          engine {report.engineVersion} · rules {report.rulesetVersion} · calibration {report.calibrationVersion}
        </p>
        <div className="pt-1">
          <button type="button" onClick={onRerun} className="nxf-cta nxf-cta-ghost">
            <Activity className="h-4 w-4" aria-hidden="true" /> Run a fresh check-in
          </button>
        </div>
      </div>
    </div>
  );
}
