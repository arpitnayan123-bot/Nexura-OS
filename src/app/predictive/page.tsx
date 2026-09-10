import Link from "next/link";
import {
  Activity, ArrowRight, BrainCircuit, CheckCircle2, Dna, FlaskConical, Footprints,
  GitBranch, HeartPulse, Lock, Moon, ScanSearch, ShieldCheck, Stethoscope, Utensils, Wind,
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
    "Healthcare is reactive. But Nexura is Predictive — we read your routine, meals, exercise, sleep, city air and earliest symptoms to see disease coming years early. Calibrated for Indian lives.",
};

/** Anonymize a demo patient name: "Suresh Kumar" -> "Suresh K." */
function anon(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase() ?? ""}.`;
}

const SIGNALS = [
  {
    icon: Utensils, name: "Your meals",
    desc: "How often you eat out, sugary drinks, late dinners, refined carbs like white rice. Food is the strongest daily habit behind Indian blood-sugar risk.",
  },
  {
    icon: Footprints, name: "How much you move",
    desc: "Steps, brisk walks, and how long you sit. Long sitting hours raise type-2 diabetes risk even when body weight looks normal.",
  },
  {
    icon: Moon, name: "Sleep & stress",
    desc: "How long and how regularly you sleep, plus late-night screen time. A few short nights already start shifting blood sugar and blood pressure — the twin notices the drift.",
  },
  {
    icon: Activity, name: "The first small signals",
    desc: "The whispers before any diagnosis: unusual tiredness, slowly creeping fasting sugar, resting heart rate rising, losing breath on stairs. Read as trends over weeks — never judged on one bad day.",
  },
  {
    icon: Wind, name: "The air you breathe",
    desc: "Air pollution is a first-class health risk in Indian cities. The engine weighs heart and blood-pressure load by the air your city actually breathes today.",
  },
  {
    icon: Dna, name: "Family history",
    desc: "A parent with diabetes or heart disease changes your risk today, not at 50. Family history sharpens every prediction and starts check-ups earlier.",
  },
];

const TRUST = [
  {
    icon: Stethoscope, title: "A doctor stays in charge",
    desc: "The engine suggests — a clinician reviews and approves every care plan. No machine ever acts on a patient alone.",
  },
  {
    icon: ScanSearch, title: "Every warning explains itself",
    desc: "Each prediction shows the exact reasons behind it, in plain language. No black boxes, no unexplained alarms.",
  },
  {
    icon: Lock, title: "Your data stays yours",
    desc: "Built to India's DPDP privacy law. Nothing is sold, nothing leaves the hospital without the patient's consent.",
  },
  {
    icon: FlaskConical, title: "Built on Indian health data",
    desc: "Calibrated on large public Indian health studies (ICMR-INDIAB, NFHS-5 style) — so the numbers fit Indian bodies, plates and cities.",
  },
];

const INDIA_CHIPS = [
  { k: "10 years earlier", v: "diseases like diabetes arrive about a decade sooner in India — so we start watching sooner" },
  { k: "23 / 27.5 BMI", v: "Indian bodies face risk at lower weights, so we use Indian thresholds — not the Western 25 / 30" },
  { k: "AQI-aware", v: "your city's air is part of the maths for heart and blood-pressure risk, city by city" },
  { k: "Indian plates", v: "vegetarian, mixed and eating-out patterns are modelled the way India actually eats" },
];

const BANDS = [
  { range: "0–30", label: "Steady", tone: "text-emerald-800 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900", dot: "bg-emerald-500", desc: "Recovery on track. Care continues as usual — the twin keeps watching quietly in the background." },
  { range: "31–70", label: "Watch closely", tone: "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900", dot: "bg-amber-500", desc: "Early drift detected. The engine shows exactly what is moving and what to monitor — before it becomes urgent." },
  { range: "71–100", label: "Act now", tone: "text-rose-800 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900", dot: "bg-rose-500 animate-pulse", desc: "A ready-to-run care plan is drafted and sent to the care team — often 12–24 hours before symptoms would have forced an emergency visit." },
];

const PIPELINE = [
  { icon: Activity, name: "Your whole life streams in", desc: "Vitals, lab reports, medicines, wearable data, meals, daily routine, doctor's notes and city air — cleaned up, impossible readings thrown out, everything written in standard medical language." },
  { icon: GitBranch, name: "Everything gets connected", desc: "Each fact is linked to what it influences — family history to risk, food to blood sugar, air to heart load — so finding patients like you takes one step, not one week." },
  { icon: HeartPulse, name: "A living digital twin", desc: "For every person the engine keeps a digital copy: your normal baseline, plus where you are heading if nothing in your life changes." },
  { icon: BrainCircuit, name: "One urgency score for everyone", desc: "Every patient gets a 0–100 score of how fast things are moving — years-slow lifestyle risk and hours-fast hospital crises, visible in a single screen." },
  { icon: Stethoscope, name: "Action before the crisis", desc: "When a red line is crossed, the engine drafts a ready-to-run care plan and lines up the nurse, lab and pharmacy tasks. A doctor approves it with one click." },
  { icon: ShieldCheck, name: "Checked, explained, audited", desc: "Every prediction carries its reasons. When the engine is not sure, it never acts alone. Fairness across age, gender and region is audited, and the system is built to medical-device standards." },
];

const HERO_STATS = [
  { k: "Years earlier", v: "a head start, from Indian onset curves" },
  { k: "Meals to air", v: "food, walks, sleep, stress and AQI — all read" },
  { k: "0–100", v: "one clear urgency score per person" },
  { k: "Every time", v: "each prediction shows its reasons" },
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
      {/* ============================================================
          HERO — deep aurora, premium and calm
      ============================================================ */}
      <section className="relative isolate overflow-hidden">
        {/* Base — deep violet-black */}
        <div className="pointer-events-none absolute inset-0 bg-[#0B0716]" />
        {/* Aurora glows */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-1/4 left-1/4 h-[60vh] w-[60vw] rounded-full bg-violet-600/30 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[50vh] w-[40vw] rounded-full bg-indigo-500/25 blur-[110px]" />
          <div className="absolute top-1/3 left-0 h-[40vh] w-[30vw] rounded-full bg-fuchsia-500/15 blur-[100px]" />
        </div>
        {/* Fine grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:56px_56px]"
        />
        {/* Soft vignette keeps text crisp over the glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_65%_at_50%_10%,transparent_35%,rgba(11,7,22,0.6)_100%)]" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-100 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-300" />
            </span>
            Nexura Predictive · Live on the demo hospital
          </div>

          <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Healthcare is reactive.
            <span className="mt-1 block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
              But Nexura is Predictive.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-violet-100/90 sm:text-lg">
            Most people meet a doctor only after the disease has already arrived. We read the beginning —
            what you eat, how you move and sleep, the air you breathe, the first small signals in your body —
            and warn you <strong className="font-semibold text-white">years before a diagnosis</strong>, while
            the story can still be changed.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="#feel-it"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_12px_40px_-10px_rgba(255,255,255,0.4)] transition hover:bg-violet-50"
            >
              Try it with your own routine <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#radar"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
            >
              See the live hospital radar
            </Link>
          </div>

          {/* Micro trust row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-violet-100/80">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-teal-300" /> No sign-up needed</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-teal-300" /> Runs in your browser, privately</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-teal-300" /> A doctor always approves the final step</span>
          </div>

          {/* Stats */}
          <div className="mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {HERO_STATS.map((s) => (
              <div key={s.k} className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-4 backdrop-blur">
                <p className="font-display text-lg font-bold text-white sm:text-xl">{s.k}</p>
                <p className="mt-1 text-xs leading-snug text-violet-100/85">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Gradient hairline into the body */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
      </section>

      {/* ============================================================
          TRUST — why you can believe the prediction
      ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">Why you can trust it</p>
        <h2 className="mt-3 max-w-2xl font-display text-2xl font-bold leading-snug sm:text-3xl">
          Powerful predictions mean nothing without trust. So trust comes first.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="rounded-2xl border border-black/8 bg-white/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-24px_rgba(124,58,237,0.35)] dark:border-white/10 dark:bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
                <t.icon className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <h3 className="mt-3.5 text-sm font-bold">{t.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          SIGNALS — the life it reads
      ============================================================ */}
      <section className="border-y border-black/5 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">What it reads</p>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Predicted from the life you actually live</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Not a questionnaire you fill once — a living picture that sharpens every day. The engine reads six
            streams and looks for the pattern that becomes a diagnosis years from now.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SIGNALS.map((s, i) => (
              <div key={s.name} className="group relative rounded-2xl border border-black/8 bg-white/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-violet-300/60 hover:shadow-[0_20px_50px_-24px_rgba(124,58,237,0.35)] dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/40">
                <span className="absolute right-4 top-4 font-display text-xs font-bold text-black/15 dark:text-white/20">0{i + 1}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-950/60 dark:text-violet-300 dark:group-hover:bg-violet-600 dark:group-hover:text-white">
                  <s.icon className="h-5 w-5" strokeWidth={2.1} />
                </div>
                <h3 className="mt-3.5 text-sm font-bold">{s.name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* India calibration panel */}
          <div className="mt-10 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-indigo-50/50 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-indigo-950/20">
            <div className="border-b border-violet-200/50 px-5 py-4 dark:border-violet-900/40">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Made for India
                </span>
                <p className="text-sm font-semibold">Most health AI is trained on Western bodies. Ours starts from Indian ones.</p>
              </div>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {INDIA_CHIPS.map((c) => (
                <div key={c.k} className="rounded-xl border border-violet-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="font-display text-base font-bold text-violet-700 dark:text-violet-300">{c.k}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          INTERACTIVE — feel the prediction
      ============================================================ */}
      <section id="feel-it" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">Feel it yourself</p>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Predict a life in ten seconds — yours</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Move the sliders to shape an ordinary week — food, walks, sleep, your city&apos;s air — and watch three
            5-year risks move instantly. It runs fully in your browser. Nothing is sent anywhere.
          </p>
          <div className="mt-8">
            <IndiaRiskExplorer />
          </div>
        </div>
      </section>

      {/* ============================================================
          LIVE RADAR — the clinician view
      ============================================================ */}
      <section id="radar" className="scroll-mt-24 border-y border-black/5 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">Already watching</p>
              <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">The live Crisis Radar — the view nurses watch all day</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This is the real clinician screen of {hospital?.name ?? "the demo hospital"}, running live right now
                on the demo cohort. Names are shortened for privacy. Every patient below is scored by the same
                engine you just tried.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1.5 font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> {counts.red} need action now
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> {counts.yellow} to watch closely
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {counts.green} steady
              </span>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-black/10 p-10 text-center text-sm text-muted-foreground dark:border-white/10">
              The radar is warming up — no scored patients yet. Admit a patient or record vitals inside Hospital OS
              and this table fills within seconds.
            </div>
          ) : (
            <div className="mt-8 overflow-hidden rounded-2xl border border-black/8 bg-background shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] dark:border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/8 bg-black/[0.03] text-left text-xs uppercase tracking-wider text-muted-foreground dark:border-white/10 dark:bg-white/5">
                    <th className="px-4 py-3.5 font-semibold">Urgency score</th>
                    <th className="px-4 py-3.5 font-semibold">Patient</th>
                    <th className="hidden px-4 py-3.5 font-semibold sm:table-cell">Main reason</th>
                    <th className="hidden px-4 py-3.5 font-semibold md:table-cell">Engine certainty</th>
                    <th className="hidden px-4 py-3.5 font-semibold lg:table-cell">Patient ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.patientId} className="border-t border-black/5 transition-colors first:border-t-0 hover:bg-violet-50/40 dark:border-white/5 dark:hover:bg-violet-950/20">
                      <td className="px-4 py-3.5">
                        <RiskBadge score={r.score} uncertain={r.uncertain} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 font-medium">{anon(r.patientName)}</td>
                      <td className="hidden max-w-[280px] truncate px-4 py-3.5 text-muted-foreground sm:table-cell">{r.topDriver ?? "—"}</td>
                      <td className="hidden px-4 py-3.5 text-muted-foreground md:table-cell">{(r.confidence * 100).toFixed(0)}%</td>
                      <td className="hidden px-4 py-3.5 font-mono text-xs text-muted-foreground lg:table-cell">{r.uhid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            The score runs 0–100: how quickly this person is heading for trouble. Below is what each range means.
          </p>
        </div>
      </section>

      {/* ============================================================
          BANDS — what the score means, in plain words
      ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">One number, plain meaning</p>
        <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">The urgency score, colour-coded</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The twin boils down vitals, trends and history into a single 0–100 number — so the care team sees who
          needs them first at a glance, not after a meeting.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {BANDS.map((b) => (
            <div key={b.range} className={`rounded-2xl border p-5 ${b.tone}`}>
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${b.dot}`} />
                <p className="text-sm font-bold">{b.range} · {b.label}</p>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed opacity-95">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          PIPELINE — how the engine thinks, plainly
      ============================================================ */}
      <section className="border-y border-black/5 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">Under the hood</p>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">How the engine thinks — in six plain steps</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            One continuous loop, from the life you live to a care plan that starts before the crisis — with a human
            approving every step that matters.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((p, i) => (
              <div key={p.name} className="group relative rounded-2xl border border-black/8 bg-white/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-violet-300/60 hover:shadow-[0_20px_50px_-24px_rgba(124,58,237,0.35)] dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/40">
                <span className="absolute right-4 top-4 font-display text-xs font-bold text-black/15 dark:text-white/20">0{i + 1}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-950/60 dark:text-violet-300 dark:group-hover:bg-violet-600 dark:group-hover:text-white">
                  <p.icon className="h-5 w-5" strokeWidth={2.1} />
                </div>
                <h3 className="mt-3.5 text-sm font-bold">{p.name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          WHAT-IF — change the story
      ============================================================ */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">Change the story</p>
        <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Pick a change, watch the risk bend</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Choose one or two changes and see the 90-day risk curve move — exactly what a doctor sees in the deep
          dive, on a demo patient.
        </p>
        <div className="mt-8">
          <WhatIfDemo />
        </div>
      </section>

      {/* ============================================================
          FOOTER STRIP — open by default
      ============================================================ */}
      <section className="border-t border-black/5 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-md">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FlaskConical className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
              Open by default — the API, the forecast and the radar are all public.
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Built to medical-device standards · DPDP-aligned privacy · Doctor-approved protocols only
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
            <Link href="/api/nx/predict/openapi" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
              For engineers: API spec
            </Link>
            <Link href="/predictive/my-future" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
              My Health Forecast
            </Link>
            <Link href="/hospital" className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-2 font-semibold text-white shadow-[0_10px_30px_-10px_rgba(124,58,237,0.6)] transition hover:bg-violet-700">
              Launch Hospital OS <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
