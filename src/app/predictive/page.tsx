import Link from "next/link";
import {
  Activity, ArrowRight, BrainCircuit, Database, FlaskConical, GitBranch,
  Network, ShieldCheck, Stethoscope,
} from "lucide-react";
import { db } from "@/lib/db";
import { runRadar } from "@/modules/pi-engine/engine";
import { RiskBadge } from "@/components/pi/risk-badge";
import { WhatIfDemo } from "@/components/pi/what-if-demo";

/* Public, always-fresh showcase: renders straight from the engine
   (server-side), anonymized, so the preview shows PIE without a login. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Predictive Intelligence Engine · Nexura OS",
  description:
    "Healthcare is reactive. Nexura makes it predictive — the Living Twin, Crisis Radar and Pre-Emptive Protocols, explained and running live on demo data.",
};

/** Anonymize a demo patient name: "Suresh Kumar" -> "Suresh K." */
function anon(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase() ?? ""}.`;
}

const BANDS = [
  { range: "0–30", label: "Green · Stable", tone: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900", dot: "bg-emerald-500", desc: "Recovery on track. Routine care continues — the twin keeps watching quietly." },
  { range: "31–70", label: "Yellow · Watchlist", tone: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900", dot: "bg-amber-500", desc: "Early drift detected. The engine surfaces drivers and suggests monitoring before anything becomes acute." },
  { range: "71–100", label: "Red · Critical", tone: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900", dot: "bg-rose-500 animate-pulse", desc: "Crisis window open. A pre-emptive protocol is generated now — 12–24 h before symptoms would have forced an emergency." },
];

const PIPELINE = [
  { icon: Database, name: "1 · Life Stream", desc: "Vitals, labs, meds, wearables, notes, social determinants and adherence stream in — cleansed by median-MAD outlier rejection and normalized to clinical codings." },
  { icon: Network, name: "2 · Patient Graph", desc: "Every fact becomes a weighted edge — genes to drugs, conditions to lifestyle, environment to outcomes — synced continuously so cohorts of similar patients are one query away." },
  { icon: Activity, name: "3 · Living Twin", desc: "A digital twin blends physiology baselines (hemodynamics, metabolism, renal) with an online-learning series model that tracks each patient's personal trajectory." },
  { icon: BrainCircuit, name: "4 · Crisis Radar", desc: "The twin scores every patient 0–100 on Time-to-Decay and re-ranks the whole hospital continuously — sepsis flagged 12–24 h early, readmission and chronic decay in view." },
  { icon: Stethoscope, name: "5 · Pre-Emptive Protocols", desc: "Crossing a red line drafts a guideline-backed protocol with evidence, then coordinates it — nurse tasks, pharmacy, lab work — while a clinician holds final approval." },
  { icon: ShieldCheck, name: "6 · Governance", desc: "Every prediction carries a Why (SHAP drivers); sub-0.8 confidence never auto-acts; drift and demographic bias are audited; the stack is documented as Class II SaMD." },
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
            <BrainCircuit className="h-3.5 w-3.5" /> PIE · Predictive Intelligence Engine
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Healthcare is reactive.
            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
              Nexura makes it predictive.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-violet-100/80 sm:text-lg">
            Beneath every Nexura product runs an engine that never sleeps: a Living Twin for each patient,
            a Crisis Radar that re-ranks the whole hospital continuously, and protocols that act
            <em> before</em> the emergency — with a human always in the loop.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/predictive/my-future"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-violet-50"
            >
              See a patient&apos;s Health Forecast <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/hospital"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Open Hospital OS — Crisis Radar inside
            </Link>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3 text-center">
            {[
              { k: "12–24 h", v: "sepsis head start" },
              { k: "0–100", v: "Time-to-Decay score" },
              { k: "100%", v: "predictions carry a Why" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-4 backdrop-blur">
                <p className="font-display text-xl font-bold text-white sm:text-2xl">{s.k}</p>
                <p className="mt-1 text-[11px] leading-snug text-violet-200/80">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Live radar ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">The Crisis Radar, live</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              This is the real engine scoring the demo cohort of {hospital?.name ?? "the demo hospital"} right now —
              rendered server-side from the same code path clinicians see. Names are abbreviated for privacy.
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
        <p className="mt-3 text-[11px] text-muted-foreground">
          Inside Hospital OS, the same table ranks every assigned patient and opens a deep dive per row — trend,
          contributing factors, one-click protocol approval and the What-If simulator.
        </p>
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
          Six stages, one loop — from raw signals to a coordinated, auditable pre-emption of the crisis.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((p) => (
            <div key={p.name} className="group rounded-2xl border border-black/8 bg-white/60 p-5 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5">
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
            <GitBranch className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            Every deliverable of the engine is public: the API, the forecast, the radar.
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
            <Link href="/api/nx/predict/openapi" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
              <FlaskConical className="h-3.5 w-3.5" /> OpenAPI spec
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
