import Link from "next/link";
import {
  Activity, ArrowRight, ArrowUpRight, BrainCircuit, Dna, FlaskConical, Footprints,
  GitBranch, HeartPulse, Lock, Moon, ScanSearch, ShieldCheck, Stethoscope, Utensils, Wind,
} from "lucide-react";
import { db } from "@/lib/db";
import { runRadar } from "@/modules/pi-engine/engine";
import { RiskBadge } from "@/components/pi/risk-badge";
import { WhatIfDemo } from "@/components/pi/what-if-demo";
import { IndiaRiskExplorer } from "@/components/pi/india-risk-explorer";

/* Public, always-fresh showcase: renders straight from the engine
   (server-side), anonymized. Cinematic dark canvas — intentionally
   theme-independent so every glyph sits on a controlled surface. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nexura Predictive · Predict before it catches you",
  description:
    "Healthcare is reactive. But Nexura is Predictive — the Predictive Intelligence Engine reads routine, meals, exercise, sleep, city air and the earliest physiological whispers to surface disease years before diagnosis. Calibrated on Indian epidemiology.",
};

/** Anonymize a demo patient name: "Suresh Kumar" -> "Suresh K." */
function anon(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase() ?? ""}.`;
}

const SIGNALS = [
  {
    icon: Utensils, name: "Meals & nutrition",
    desc: "Outside-food frequency, sugary drinks, late dinners, refined-carb load — the strongest modifiable driver in Indian cohorts.",
  },
  {
    icon: Footprints, name: "Movement & exercise",
    desc: "Steps, brisk-walk minutes, activity spacing through the day. Sedentary routines multiply type-2 risk even at normal BMI.",
  },
  {
    icon: Moon, name: "Sleep & stress rhythm",
    desc: "Duration, regularity, late-night screenpush. Short sleep bends insulin resistance and blood pressure within weeks.",
  },
  {
    icon: Activity, name: "Earliest symptoms",
    desc: "Fatigue creep, fasting-glucose drift, resting-HR slope, HRV decline, exertional dyspnoea — read as trends, never one-offs.",
  },
  {
    icon: Wind, name: "City air · AQI",
    desc: "Metro particulate load weighted into cardiac and hypertension risk — city by city, season by season.",
  },
  {
    icon: Dna, name: "Genes & family history",
    desc: "First-degree history sharpens every prior and pulls screening a decade earlier. The curve changes today, not at 50.",
  },
];

const TRUST = [
  {
    icon: Stethoscope, title: "Clinician-in-the-loop",
    desc: "Every pre-emptive protocol drafts for human approval. Sub-0.8 confidence never auto-acts — a doctor signs every step that matters.",
  },
  {
    icon: ScanSearch, title: "SHAP-grade explainability",
    desc: "Each score ships its driver attribution — the Why behind every prediction, every time. No unexplained alarms, ever.",
  },
  {
    icon: Lock, title: "DPDP-aligned privacy",
    desc: "Consented streams, aggregate priors, nothing sold. Patient data never leaves the hospital boundary without consent.",
  },
  {
    icon: ShieldCheck, title: "Governance & audit",
    desc: "Drift monitoring, demographic fairness audits, documented Class II SaMD posture — engineered to medical-device standards.",
  },
];

const INDIA_CHIPS = [
  { k: "10 yrs earlier", v: "Indian onset curves run a decade ahead of Western cohorts — surveillance starts earlier" },
  { k: "BMI 23 / 27.5", v: "Asian-Indian risk thresholds — not the Western 25 / 30" },
  { k: "AQI-weighted", v: "cardiac & hypertension multipliers per metro, severe-episode aware" },
  { k: "ICMR-INDIAB · NFHS-5", v: "aggregate population priors — never personal data" },
];

const BANDS = [
  { range: "0–30", label: "Stable", glow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]", tone: "text-emerald-300 border-emerald-400/25 bg-emerald-500/[0.08]", dot: "bg-emerald-400", desc: "Recovery on track. Routine care continues — the twin keeps watching quietly." },
  { range: "31–70", label: "Watchlist", glow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]", tone: "text-amber-300 border-amber-400/25 bg-amber-500/[0.08]", dot: "bg-amber-400", desc: "Early drift detected. The engine surfaces the drivers and pre-stages monitoring before anything turns acute." },
  { range: "71–100", label: "Critical", glow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]", tone: "text-rose-300 border-rose-400/30 bg-rose-500/[0.10]", dot: "bg-rose-400 animate-pulse", desc: "Crisis window open. A pre-emptive protocol is already drafting — 12–24 h before symptoms would force an emergency." },
];

const PIPELINE = [
  { icon: Activity, name: "Life Stream", desc: "Vitals, labs, meds, wearables, meals, routine, notes and city air stream in — median-MAD cleansed, coded to clinical vocabularies." },
  { icon: GitBranch, name: "Patient Graph", desc: "Every fact becomes a weighted edge — family history to risk, diet to glucose, air to cardiac load — so similar lives sit one query away." },
  { icon: HeartPulse, name: "Living Twin", desc: "A digital twin per person: physiology baselines plus a personal, continuously-learned trajectory that answers what happens if nothing changes." },
  { icon: BrainCircuit, name: "Crisis Radar", desc: "Everyone is scored 0–100 on Time-to-Decay and re-ranked continuously — years-scale lifestyle risk and hours-scale hospital crisis in one view." },
  { icon: Stethoscope, name: "Pre-emptive Protocols", desc: "Red lines draft guideline-backed protocols and coordinate nurse, lab and pharmacy tasks — a clinician approves with one click." },
  { icon: ShieldCheck, name: "Governance", desc: "SHAP Why on every prediction; sub-0.8 confidence never auto-acts; drift and demographic bias audited; documented Class II SaMD." },
];

const HERO_STATS = [
  { k: "5–7 yrs", v: "head start on Indian onset curves" },
  { k: "6 streams", v: "meals, movement, sleep, symptoms, air, genes" },
  { k: "0–100", v: "one Time-to-Decay score per patient" },
  { k: "100%", v: "of predictions carry a Why" },
];

export default async function PredictivePage() {
  const hospital = await db.hospital.findFirst({ select: { id: true, name: true } });
  const rows = hospital ? await runRadar(hospital.id, 8) : [];
  const counts = rows.reduce(
    (acc, r) => ({ red: acc.red + (r.band === "red" ? 1 : 0), yellow: acc.yellow + (r.band === "yellow" ? 1 : 0), green: acc.green + (r.band === "green" ? 1 : 0) }),
    { red: 0, yellow: 0, green: 0 }
  );

  return (
    <div className="min-h-screen bg-[#07040E] text-slate-100 antialiased">
      {/* ============================================================
          HERO — cinematic aurora over deep space
      ============================================================ */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-40 left-[15%] h-[34rem] w-[34rem] rounded-full bg-violet-600/25 blur-[130px]" />
          <div className="absolute top-1/4 -right-40 h-[30rem] w-[30rem] rounded-full bg-indigo-500/20 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[26rem] w-[26rem] rounded-full bg-fuchsia-600/15 blur-[110px]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(75%_60%_at_50%_35%,black,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-14rem] h-[36rem] w-[72rem] -translate-x-1/2 rounded-full border border-white/[0.07]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-8rem] h-[24rem] w-[52rem] -translate-x-1/2 rounded-full border border-white/[0.05]"
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pb-28 lg:pt-32">
          <div>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-300" />
              </span>
              Predictive Intelligence Engine · Live on the demo hospital
            </div>
          </div>

          <div>
            <h1 className="mt-7 max-w-4xl font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.4rem]">
              Healthcare is reactive.
              <span className="mt-2 block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
                But Nexura is Predictive.
              </span>
            </h1>
          </div>

          <div>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              The Predictive Intelligence Engine streams a person&apos;s routine — meals, movement, sleep, city air,
              vitals — into a <span className="font-semibold text-white">Living Twin</span> that surfaces disease{" "}
              <span className="font-semibold text-white">years before diagnosis</span>. Time-to-Decay compresses every
              patient to one actionable number. Calibrated on Indian epidemiology.
            </p>
          </div>

          <div>
            <div className="mt-10 flex flex-wrap items-center gap-3.5">
              <Link
                href="#feel-it"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B0716] shadow-[0_0_50px_-12px_rgba(167,139,250,0.7)] transition hover:shadow-[0_0_60px_-8px_rgba(167,139,250,0.9)]"
              >
                Run the engine on your own routine
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#radar"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/35 hover:bg-white/10"
              >
                Watch the Crisis Radar — live
              </Link>
            </div>
          </div>

          <div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-400">
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-teal-300" /> Zero sign-up · in-browser privacy</span>
              <span className="inline-flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5 text-teal-300" /> Clinician-approved protocols only</span>
            </div>
          </div>

          <div>
            <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {HERO_STATS.map((s) => (
                <div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 backdrop-blur transition hover:border-violet-400/30 hover:bg-white/[0.07]">
                  <p className="font-display text-xl font-bold text-white">{s.k}</p>
                  <p className="mt-1 text-xs leading-snug text-slate-400">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
      </section>

      {/* ============================================================
          TRUST — the governance layer
      ============================================================ */}
      <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">01 · Trust architecture</p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            Prediction without trust is noise. Trust is engineered first.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t, i) => (
            <div key={t.title}>
              <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[0.06] hover:shadow-[0_24px_60px_-30px_rgba(139,92,246,0.5)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-[0_8px_24px_-8px_rgba(124,58,237,0.8)]">
                  <t.icon className="h-5 w-5" strokeWidth={2.1} />
                </div>
                <h3 className="mt-4 text-sm font-bold text-white">{t.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          SIGNALS — what the engine reads
      ============================================================ */}
      <section className="relative border-y border-white/[0.07] bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">02 · Signal surface</p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Predicted from the life you actually live
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Not a questionnaire filled once — a living model that sharpens every day. Six streams in, one pattern
              out: the trajectory that becomes a diagnosis years from now.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SIGNALS.map((s, i) => (
              <div key={s.name}>
                <div className="group relative h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[0.06] hover:shadow-[0_24px_60px_-30px_rgba(139,92,246,0.5)]">
                  <span className="absolute right-5 top-5 font-display text-sm font-bold text-white/25 transition group-hover:text-violet-300/70">0{i + 1}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/15 text-violet-300 transition group-hover:bg-violet-500 group-hover:text-white">
                    <s.icon className="h-5 w-5" strokeWidth={2.1} />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-white">{s.name}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* India calibration panel */}
          <div>
            <div className="relative mt-10 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/60 via-[#0D0819] to-indigo-950/40 p-[1px]">
              <div className="rounded-2xl bg-[#0B0716]/80 p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_-6px_rgba(139,92,246,0.9)]">
                    India-calibrated
                  </span>
                  <p className="text-sm font-semibold text-white">
                    Most health AI is trained on Western bodies. This engine starts from Indian ones.
                  </p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {INDIA_CHIPS.map((c) => (
                    <div key={c.k} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-violet-400/30">
                      <p className="font-display text-base font-bold text-violet-300">{c.k}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{c.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          INTERACTIVE — run the engine yourself
      ============================================================ */}
      <section id="feel-it" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">03 · Hands on the engine</p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Shape a life. Watch the engine think.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              The same reasoning the twin runs nightly over real streams — deterministic, instant, and private by
              construction. Everything computes in your browser; nothing leaves this page.
            </p>
          </div>
          <div>
            <div className="mt-9">
              <IndiaRiskExplorer />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CRISIS RADAR — live clinician view
      ============================================================ */}
      <section id="radar" className="scroll-mt-16 border-y border-white/[0.07] bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">04 · Live production view</p>
                <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">The Crisis Radar, running now</h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
                  The real clinician screen of {hospital?.name ?? "the demo hospital"}, rendered live from the engine
                  on the demo cohort. Names are abbreviated for privacy. Every row is scored by the same engine you
                  just ran.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1.5 text-rose-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> {counts.red} critical
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> {counts.yellow} watchlist
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> {counts.green} stable
                </span>
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="mt-9 rounded-2xl border border-dashed border-white/15 p-12 text-center text-sm text-slate-400">
              The radar is warming up — no scored patients yet. Admit a patient or record vitals inside Hospital OS
              and this table fills within seconds.
            </div>
          ) : (
            <div>
              <div className="mt-9 overflow-hidden rounded-2xl border border-white/10 bg-[#0B0716]/70 shadow-[0_40px_120px_-60px_rgba(139,92,246,0.4)] backdrop-blur">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      <th className="px-4 py-3.5 font-semibold">Time-to-Decay</th>
                      <th className="px-4 py-3.5 font-semibold">Patient</th>
                      <th className="hidden px-4 py-3.5 font-semibold sm:table-cell">Top driver</th>
                      <th className="hidden px-4 py-3.5 font-semibold md:table-cell">Confidence</th>
                      <th className="hidden px-4 py-3.5 font-semibold lg:table-cell">UHID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.patientId} className="border-t border-white/[0.06] transition-colors first:border-t-0 hover:bg-violet-500/[0.06]">
                        <td className="px-4 py-3.5">
                          <RiskBadge score={r.score} uncertain={r.uncertain} size="sm" />
                        </td>
                        <td className="px-4 py-3.5 font-medium text-white">{anon(r.patientName)}</td>
                        <td className="hidden max-w-[280px] truncate px-4 py-3.5 text-slate-400 sm:table-cell">{r.topDriver ?? "—"}</td>
                        <td className="hidden px-4 py-3.5 tabular-nums text-slate-400 md:table-cell">{(r.confidence * 100).toFixed(0)}%</td>
                        <td className="hidden px-4 py-3.5 font-mono text-xs text-slate-400 lg:table-cell">{r.uhid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div>
            <p className="mt-4 text-xs text-slate-400">
              Time-to-Decay runs 0–100 — how fast a patient is decaying. The three bands below decode it.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          TIME-TO-DECAY BANDS
      ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">05 · The score</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">Time-to-Decay — one number for urgency</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            The twin compresses physiology, trajectory and history into a single 0–100 score of how fast a patient is
            decaying — and the entire product is colored around it, so triage is a glance, not a meeting.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {BANDS.map((b, i) => (
            <div key={b.range}>
              <div className={`h-full rounded-2xl border p-5 backdrop-blur transition hover:-translate-y-1 ${b.tone} ${b.glow}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${b.dot}`} />
                  <p className="text-sm font-bold">{b.range} · {b.label}</p>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-slate-300/90">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          PIPELINE — vertical timeline
      ============================================================ */}
      <section className="relative border-y border-white/[0.07] bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">06 · Under the hood</p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">How the engine thinks</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Six stages, one loop — from the life a person lives to a coordinated, auditable pre-emption of the crisis.
            </p>
          </div>

          <div className="relative mt-12">
            {/* Glowing rail */}
            <div aria-hidden className="absolute bottom-4 left-[22px] top-4 w-px bg-gradient-to-b from-violet-400/60 via-indigo-400/25 to-transparent sm:left-1/2" />
            <div className="space-y-8">
              {PIPELINE.map((p, i) => (
                <div key={p.name}>
                  <div className={`relative flex gap-5 sm:w-1/2 ${i % 2 === 0 ? "sm:pr-12" : "sm:ml-auto sm:pl-12"}`}>
                    {/* Node */}
                    <div
                      aria-hidden
                      className={`absolute top-5 grid h-11 w-11 place-items-center rounded-full border border-violet-400/30 bg-[#0B0716] font-display text-xs font-bold text-violet-300 shadow-[0_0_20px_-4px_rgba(139,92,246,0.7)] ${
                        i % 2 === 0 ? "left-0 sm:-right-[22px] sm:left-auto" : "left-0 sm:-left-[22px]"
                      }`}
                    >
                      0{i + 1}
                    </div>
                    <div className="ml-14 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.06] sm:ml-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/15 text-violet-300">
                          <p.icon className="h-4.5 w-4.5" strokeWidth={2.1} />
                        </div>
                        <h3 className="text-sm font-bold text-white">{p.name}</h3>
                      </div>
                      <p className="mt-2.5 text-[13px] leading-relaxed text-slate-400">{p.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          WHAT-IF SIMULATOR
      ============================================================ */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">07 · Counterfactuals</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">The What-If Simulator</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
            Pick interventions and watch the 90-day decay curve bend — the same projection clinicians see in the deep
            dive, running on a demo Living Twin.
          </p>
        </div>
        <div>
          <div className="mt-9">
            <WhatIfDemo />
          </div>
        </div>
      </section>

      {/* ============================================================
          CLOSING CTA
      ============================================================ */}
      <section className="relative overflow-hidden border-t border-white/[0.07]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[22rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[110px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
              The first visit that happens
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
                before the first symptom.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Every deliverable of the engine is public — the API, the forecast, the radar. Walk through the
              clinician view or come back to your own forecast anytime.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/hospital"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B0716] shadow-[0_0_50px_-12px_rgba(167,139,250,0.7)] transition hover:shadow-[0_0_60px_-8px_rgba(167,139,250,0.9)]"
              >
                Launch Hospital OS
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/predictive/my-future"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/35 hover:bg-white/10"
              >
                My Health Forecast
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER STRIP
      ============================================================ */}
      <footer className="border-t border-white/[0.07] bg-black/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
            <FlaskConical className="h-4 w-4 text-violet-300" />
            Nexura Predictive · Predictive Intelligence Engine
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
            <Link href="/api/nx/predict/openapi" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3.5 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
              OpenAPI spec <ArrowUpRight className="h-3 w-3" />
            </Link>
            <Link href="/" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3.5 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
              nexura.os <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
