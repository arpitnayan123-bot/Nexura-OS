import Link from "next/link";
import {
  Activity, ArrowRight, BrainCircuit, Dna, FlaskConical, Footprints,
  GitBranch, HeartPulse, Moon, ShieldCheck, Stethoscope, Utensils, Wind,
} from "lucide-react";
import { db } from "@/lib/db";
import { runRadar } from "@/modules/pi-engine/engine";
import { RiskBadge } from "@/components/pi/risk-badge";
import { WhatIfDemo } from "@/components/pi/what-if-demo";
import { IndiaRiskExplorer } from "@/components/pi/india-risk-explorer";

/* Public, always-fresh showcase: renders straight from the engine
   (server-side), anonymized, so the preview shows PIE without a login. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nexura Predictive · Predict before it catches you",
  description:
    "Healthcare is reactive. Nexura makes it predictive — we read your routine, meals, exercise, sleep, city air and earliest symptoms to see disease coming years early. Calibrated for Indian lives.",
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
    desc: "The thali pattern — outside-food frequency, sugary drinks, late dinners, refined carbs. Diet is the strongest modifiable signal in Indian cohorts.",
  },
  {
    icon: Footprints, name: "Movement & exercise",
    desc: "Steps, brisk-walk minutes, activity spacing through the day. Sedentary routines multiply type-2 risk even when weight looks normal.",
  },
  {
    icon: Moon, name: "Sleep & stress rhythm",
    desc: "Hours, regularity, late-night screenpush. Short sleep bends insulin resistance and blood pressure within weeks — the twin catches the drift.",
  },
  {
    icon: Activity, name: "Earliest symptoms",
    desc: "The whispers before the diagnosis: unusual fatigue, fasting-glucose creep, resting-HR rise, HRV decline, breathlessness on stairs — read as trends, never one-offs.",
  },
  {
    icon: Wind, name: "Your city's air",
    desc: "AQI exposure is a first-order Indian risk factor — the engine weights cardiac and blood-pressure load by the air you actually breathe.",
  },
  {
    icon: Dna, name: "Genes & family history",
    desc: "A diabetic parent changes your curve today, not at 50. Family history sharpens every prediction and pulls screening earlier.",
  },
];

const INDIA_CHIPS = [
  { k: "10 yrs", v: "earlier disease onset than Western cohorts — so our models start watching sooner" },
  { k: "23 / 27.5", v: "Asian-Indian BMI risk thresholds, not the Western 25 / 30" },
  { k: "AQI-aware", v: "air-quality load built into cardiac & hypertension risk, city by city" },
  { k: "Diet archetypes", v: "vegetarian, mixed and outside-food patterns modeled the Indian way" },
];

const BANDS = [
  { range: "0–30", label: "Green · Stable", tone: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900", dot: "bg-emerald-500", desc: "Recovery on track. Routine care continues — the twin keeps watching quietly." },
  { range: "31–70", label: "Yellow · Watchlist", tone: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900", dot: "bg-amber-500", desc: "Early drift detected. The engine surfaces drivers and suggests monitoring before anything becomes acute." },
  { range: "71–100", label: "Red · Critical", tone: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900", dot: "bg-rose-500 animate-pulse", desc: "Crisis window open. A pre-emptive protocol is generated now — 12–24 h before symptoms would have forced an emergency." },
];

const PIPELINE = [
  { icon: Activity, name: "1 · Life Stream", desc: "Vitals, labs, meds, wearables, meals, routine, notes and city air stream in — cleansed by median-MAD outlier rejection and coded to clinical vocabularies." },
  { icon: GitBranch, name: "2 · Patient Graph", desc: "Every fact becomes a weighted edge — family history to risk, diet to glucose, air to cardiac load — so similar lives are one query away." },
  { icon: HeartPulse, name: "3 · Living Twin", desc: "A digital twin per person: physiology baselines plus a personal, continuously-learned trajectory that answers what happens if nothing changes." },
  { icon: BrainCircuit, name: "4 · Crisis Radar", desc: "Everyone is scored 0–100 on Time-to-Decay and re-ranked continuously — years-scale lifestyle risk and hours-scale hospital crisis in one view." },
  { icon: Stethoscope, name: "5 · Pre-Emptive Protocols", desc: "Red lines draft guideline-backed protocols and coordinate nurse, lab and pharmacy tasks — a clinician approves with one click." },
  { icon: ShieldCheck, name: "6 · Governance", desc: "Every prediction carries a Why (SHAP drivers); sub-0.8 confidence never auto-acts; drift and demographic bias are audited; documented as Class II SaMD." },
];

export default async function PredictivePage() {
  const hospital = await db.hospital.findFirst({ select: { id: true, name: true } });
  const rows = hospital ? await runRadar(hospital.id, 8) : [];
  const counts = rows.reduce(
    (acc, r) => ({ red: acc.red + (r.band === "red" ? 1 : 0), yellow: acc.yellow + (r.band === "yellow" ? 1 : 0), green: acc.green + (r.band === "green" ? 1 : 0) }),
    { red: 0, yellow: 0, green: 0 }
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden border-b border-black/5 dark:border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.25),transparent_45%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200 backdrop-blur">
            <BrainCircuit className="h-3.5 w-3.5" /> Nexura Predictive · The Predictive Intelligence Engine
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Healthcare is reactive.
            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
              Nexura makes it predictive.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-violet-100/85 sm:text-lg">
            Most people meet a doctor only after a disease has already caught them. Nexura reads the beginning —
            your daily routine, your meals, your walks, your sleep, your city&apos;s air, the earliest whispers of
            symptoms — and warns you while there is still time to change the story.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#feel-it"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-violet-50"
            >
              Try it with your own routine <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/predictive/my-future"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Patients: see My Health Forecast
            </Link>
          </div>
          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[
              { k: "5–7 yrs", v: "head start on Indian onset curves" },
              { k: "Meals→air", v: "routine, food, sleep, steps, AQI" },
              { k: "0–100", v: "one Time-to-Decay score" },
              { k: "100%", v: "predictions carry a Why" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-4 backdrop-blur">
                <p className="font-display text-lg font-bold text-white sm:text-xl">{s.k}</p>
                <p className="mt-1 text-[11px] leading-snug text-violet-200/85">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- The life it reads ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Predicted from the life you actually live</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Not a questionnaire you fill once — a living picture that sharpens every day. The engine reads six streams
          and looks for the pattern that becomes a diagnosis years from now.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SIGNALS.map((s) => (
            <div key={s.name} className="rounded-2xl border border-black/8 bg-white/60 p-5 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mt-3 text-sm font-bold">{s.name}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* India calibration strip */}
        <div className="mt-8 rounded-2xl border border-violet-200/60 bg-violet-50/50 p-5 dark:border-violet-900/50 dark:bg-violet-950/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              🇮🇳 Calibrated for Indian lives
            </span>
            <p className="text-xs font-medium text-muted-foreground">Most health AI is trained on Western bodies. Ours starts from Indian ones.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {INDIA_CHIPS.map((c) => (
              <div key={c.k} className="rounded-xl border border-black/8 bg-white/70 p-3.5 dark:border-white/10 dark:bg-white/5">
                <p className="font-display text-base font-bold text-violet-700 dark:text-violet-300">{c.k}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{c.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Interactive: feel the prediction ---------- */}
      <section id="feel-it" className="scroll-mt-20 border-y border-black/5 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">See it predict you — right here</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Shape an ordinary week and watch the engine think. This is the same reasoning the twin runs every night
            over real streams — simplified, private, and instant.
          </p>
          <div className="mt-6">
            <IndiaRiskExplorer />
          </div>
        </div>
      </section>

      {/* ---------- Live radar ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Then it watches over you — the Crisis Radar, live</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The same engine scores every patient of {hospital?.name ?? "the demo hospital"} continuously — this is
              the real clinician view on the demo cohort, rendered live. Names are abbreviated for privacy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> {counts.red} critical
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> {counts.yellow} watchlist
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {counts.green} stable
            </span>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-black/10 p-10 text-center text-sm text-muted-foreground dark:border-white/10">
            The radar is warming up — no scored patients yet. Admit or record vitals inside Hospital OS and this
            table fills within seconds.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-black/8 shadow-sm dark:border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/[0.03] text-left text-xs uppercase tracking-wider text-muted-foreground dark:bg-white/5">
                  <th className="px-4 py-3 font-semibold">Time-to-Decay</th>
                  <th className="px-4 py-3 font-semibold">Patient</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Top driver</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Confidence</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">UHID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.patientId} className="border-t border-black/5 dark:border-white/5">
                    <td className="px-4 py-3">
                      <RiskBadge score={r.score} uncertain={r.uncertain} size="sm" />
                    </td>
                    <td className="px-4 py-3 font-medium">{anon(r.patientName)}</td>
                    <td className="hidden max-w-[280px] truncate px-4 py-3 text-muted-foreground sm:table-cell">{r.topDriver ?? "—"}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{(r.confidence * 100).toFixed(0)}%</td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground lg:table-cell">{r.uhid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- Time-to-Decay language ---------- */}
      <section className="border-y border-black/5 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">One number for urgency: Time-to-Decay</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The twin compresses physiology, trajectory and history into a single 0–100 score of how fast a
            patient is decaying — and colors the entire product around it, so triage is a glance, not a meeting.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {BANDS.map((b) => (
              <div key={b.range} className={`rounded-2xl border p-5 ${b.tone}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${b.dot}`} />
                  <p className="text-sm font-bold">{b.range} · {b.label.split(" · ")[1]}</p>
                </div>
                <p className="mt-2 text-xs leading-relaxed opacity-90">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Pipeline ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">How the engine thinks</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Six stages, one loop — from the life you live to a coordinated, auditable pre-emption of the crisis.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((p) => (
            <div key={p.name} className="rounded-2xl border border-black/8 bg-white/60 p-5 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                <p.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mt-3 text-sm font-bold">{p.name}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- What-If demo ---------- */}
      <section className="mx-auto max-w-4xl px-4 pb-14 sm:px-6 lg:px-8">
        <WhatIfDemo />
      </section>

      {/* ---------- Footer strip ---------- */}
      <section className="border-t border-black/5 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            Every deliverable of the engine is public: the API, the forecast, the radar.
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
            <Link href="/api/nx/predict/openapi" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
              OpenAPI spec
            </Link>
            <Link href="/predictive/my-future" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
              My Health Forecast
            </Link>
            <Link href="/hospital" className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-white transition hover:bg-violet-700">
              Launch Hospital OS <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
