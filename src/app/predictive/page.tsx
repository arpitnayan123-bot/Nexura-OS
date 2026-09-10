import Link from "next/link";
import {
  Activity, ArrowRight, BrainCircuit, Dna, Footprints, GitBranch, HeartPulse, Lock,
  Moon, ScanSearch, ShieldCheck, Stethoscope, Utensils, Wind,
} from "lucide-react";
import { db } from "@/lib/db";
import { runRadar } from "@/modules/pi-engine/engine";
import { RiskGauge } from "@/components/pi/risk-gauge";
import { CrisisRadarCanvas } from "@/components/pi/crisis-radar-canvas";
import { TwinWhatIf } from "@/components/pi/twin-whatif";
import { ConsoleBar, DeployCta } from "@/components/pi/console-bar";
import { IndiaRiskExplorer } from "@/components/pi/india-risk-explorer";

/* ============================================================
 * NEXURA PREDICTIVE — "Glassmorphic Futurism" command center
 * The bridge of the starship: a live bento-grid where the
 * Predictive Intelligence Engine renders the hospital's future.
 *
 * Server component · force-dynamic · renders straight from the
 * engine (runRadar sweep), anonymized for public view.
 * Intentionally theme-independent: the console is always deep
 * navy with frosted-glass tiles and neon data inks.
 * ============================================================ */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nexura Predictive — Command Center",
  description:
    "Healthcare is Reactive. Nexura Makes it Predictive. The Predictive Intelligence Engine streams routine, meals, exercise, sleep, city air and the earliest physiological whispers into a Living Twin — surfacing disease years before diagnosis. Calibrated on Indian epidemiology.",
};

/** Anonymize a demo patient name: "Suresh Kumar" -> "Suresh K." */
function anon(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase() ?? ""}.`;
}

const SIGNALS = [
  { icon: Utensils, name: "Meals & nutrition", desc: "Outside-food frequency, refined-carb load, late dinners — the strongest modifiable driver in Indian cohorts." },
  { icon: Footprints, name: "Movement & exercise", desc: "Steps, brisk-walk minutes, activity spacing. Sedentary routines multiply type-2 risk even at normal BMI." },
  { icon: Moon, name: "Sleep & stress rhythm", desc: "Duration, regularity, late-night screenpush. Short sleep bends insulin resistance and BP within weeks." },
  { icon: Activity, name: "Earliest symptoms", desc: "Fatigue creep, fasting-glucose drift, resting-HR slope, HRV decline — read as trends, never one-offs." },
  { icon: Wind, name: "City air · AQI", desc: "Metro particulate load weighted into cardiac and hypertension risk — city by city, season by season." },
  { icon: Dna, name: "Genes & family history", desc: "First-degree history sharpens every prior and pulls screening forward a decade." },
];

const PIPELINE = [
  { icon: Activity, name: "Life Stream", desc: "Vitals, labs, meds, wearables, meals, notes and city air stream in — median-MAD cleansed, coded to clinical vocabularies." },
  { icon: GitBranch, name: "Patient Graph", desc: "Every fact becomes a weighted edge — family history to risk, diet to glucose, air to cardiac load." },
  { icon: HeartPulse, name: "Living Twin", desc: "A digital twin per person: physiology baselines plus a continuously-learned personal trajectory." },
  { icon: BrainCircuit, name: "Crisis Radar", desc: "Every patient scored 0–100 on Time-to-Decay, re-ranked continuously — years-scale and hours-scale risk in one view." },
  { icon: Stethoscope, name: "Pre-Emptive Protocols", desc: "Critical bands draft guideline-backed protocols and coordinate nurse, lab and pharmacy tasks — clinician approves." },
  { icon: ShieldCheck, name: "Governance", desc: "SHAP attribution on every prediction; sub-0.8 confidence never auto-acts; drift and bias audited." },
];

const TRUST = [
  { icon: ScanSearch, k: "Explainable by design", v: "SHAP Why on every score" },
  { icon: Lock, k: "Confidence-gated", v: "No auto-action below 0.80" },
  { icon: ShieldCheck, k: "Audited models", v: "Drift + demographic bias reviews" },
  { icon: Stethoscope, k: "Clinician sovereign", v: "Class II SaMD documentation" },
];

const WARD_FALLBACK = "Unassigned";

export default async function PredictivePage() {
  /* [PIE API] Live cohort sweep — runRadar() scores the active
     cohort on Time-to-Decay and sorts descending. In the Hospital
     OS this payload streams from GET /api/nx/pi/radar; here it is
     resolved server-side so the console always opens fresh. */
  const hospital = await db.hospital.findFirst({ select: { id: true, name: true } });
  const rows = hospital ? await runRadar(hospital.id, 8) : [];
  const counts = rows.reduce(
    (acc, r) => ({
      red: acc.red + (r.band === "red" ? 1 : 0),
      yellow: acc.yellow + (r.band === "yellow" ? 1 : 0),
      green: acc.green + (r.band === "green" ? 1 : 0),
    }),
    { red: 0, yellow: 0, green: 0 }
  );
  const meanScore = rows.length ? Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length) : 0;
  const radarNodes = rows.map((r) => ({ id: r.patientId, band: r.band, score: r.score }));

  return (
    <div className="nxp-shell relative min-h-screen overflow-x-clip text-slate-200 antialiased">
      {/* ambient moving mesh — data-flow aurora */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="nxp-drift absolute -top-32 left-[8%] h-[30rem] w-[30rem] rounded-full bg-cyan-500/[0.13] blur-[130px]" />
        <div className="nxp-drift absolute top-[38%] -right-40 h-[28rem] w-[28rem] rounded-full bg-teal-400/[0.10] blur-[120px]" style={{ animationDelay: "-6s" }} />
        <div className="nxp-drift absolute bottom-[-6rem] left-[30%] h-[32rem] w-[32rem] rounded-full bg-violet-600/[0.12] blur-[140px]" style={{ animationDelay: "-11s" }} />
      </div>
      <div className="nxp-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      <ConsoleBar />

      <main className="relative mx-auto max-w-[1400px] px-4 pb-24 sm:px-6 lg:px-10">
        {/* ============================================================
            HERO — the Crisis Radar
        ============================================================ */}
        <section aria-labelledby="pie-title" className="pt-12 lg:pt-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
            {/* title treatment — top left */}
            <div className="lg:col-span-5">
              <p className="inline-flex items-center gap-2.5 rounded-full border border-sky-400/20 bg-sky-400/[0.06] px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-300">
                <span className="nxp-live h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                Predictive Intelligence Engine
              </p>

              <h1 id="pie-title" className="mt-6 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl">
                Healthcare is Reactive.
                <span className="mt-2 block bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-transparent [text-shadow:0_0_40px_rgba(56,189,248,0.25)]">
                  Nexura Makes it Predictive.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300">
                One continuous intelligence layer across the institution. Six signal streams resolve into a Living Twin
                per patient, scored on the <span className="font-semibold text-sky-300">Time-to-Decay index</span> and
                re-ranked every ninety seconds — years-scale lifestyle risk and hours-scale hospital crisis in a single
                field of view.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="#priority"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_36px_-10px_rgba(6,182,212,0.8)] transition hover:shadow-[0_0_46px_-8px_rgba(6,182,212,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  Open the Priority Queue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="#twin"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-200 backdrop-blur transition hover:border-sky-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                >
                  Simulate a Living Twin
                </Link>
              </div>

              {/* live cohort counters */}
              <dl className="mt-10 grid grid-cols-3 gap-3">
                {[
                  { k: "Cohort sweep", v: rows.length, tone: "text-slate-100" },
                  { k: "Watchlist", v: counts.yellow, tone: "text-amber-300" },
                  { k: "Critical", v: counts.red, tone: "text-red-400" },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl nxp-glass px-4 py-3.5">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{s.k}</dt>
                    <dd className={`mt-1 font-mono text-2xl font-bold tabular-nums ${s.tone}`}>{String(s.v).padStart(2, "0")}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* the radar — center-left centerpiece */}
            <div className="relative lg:col-span-7 lg:flex lg:flex-col">
              <div className="relative h-[340px] overflow-hidden rounded-3xl nxp-glass sm:h-[420px] lg:min-h-[480px] lg:flex-1">
                {/* HUD corner brackets */}
                <span aria-hidden className="absolute left-3 top-3 h-5 w-5 rounded-tl-lg border-l-2 border-t-2 border-sky-400/40" />
                <span aria-hidden className="absolute right-3 top-3 h-5 w-5 rounded-tr-lg border-r-2 border-t-2 border-sky-400/40" />
                <span aria-hidden className="absolute bottom-3 left-3 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-sky-400/40" />
                <span aria-hidden className="absolute bottom-3 right-3 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-sky-400/40" />

                <CrisisRadarCanvas nodes={radarNodes} className="absolute inset-0" />

                {/* HUD overlays */}
                <div className="pointer-events-none absolute left-6 top-5">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/90">Crisis Radar</p>
                  <p className="mt-0.5 font-mono text-[10px] tracking-[0.14em] text-slate-400">
                    SECTOR VIEW · {hospital?.name?.toUpperCase() ?? "DEMO HOSPITAL"} · WARDS A–F
                  </p>
                </div>
                <div className="pointer-events-none absolute bottom-5 right-6 flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 backdrop-blur">
                  {[
                    { c: "bg-cyan-400", l: "Stable", n: counts.green },
                    { c: "bg-amber-400", l: "Watchlist", n: counts.yellow },
                    { c: "bg-red-400", l: "Critical", n: counts.red },
                  ].map((b) => (
                    <span key={b.l} className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${b.c} ${b.l === "Critical" ? "nxp-heartbeat" : ""}`} aria-hidden="true" />
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                        {b.l} <span className="text-slate-500">{b.n}</span>
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* cohort mean gauge */}
              <div className="mt-4 flex items-center justify-between rounded-2xl nxp-glass px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Cohort mean · Time-to-Decay</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Mean of every active twin in the current sweep — the index the radar is ranked by.
                  </p>
                </div>
                <RiskGauge score={meanScore} size="md" showBand={false} label="Index / 100" />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            BENTO ROW 2 — Priority Queue | Patient Twin Simulator
        ============================================================ */}
        <section aria-labelledby="priority-title" className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Priority Queue */}
          <div id="priority" className="scroll-mt-24 rounded-3xl nxp-glass p-5 sm:p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="priority-title" className="text-lg font-bold tracking-tight text-white">Priority Queue</h2>
                <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Top critical alerts · Time-to-Decay desc
                </p>
              </div>
              <span className="rounded-full border border-sky-400/25 bg-sky-400/[0.07] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                {rows.length} twins in sweep
              </span>
            </div>

            {/* [PIE API] Alert cards inject from runRadar rows —
                patient, ward, UHID, score, top driver, drafted protocol. */}
            <ul className="mt-5 space-y-3">
              {rows.map((r) => (
                <li
                  key={r.patientId}
                  className="nxp-glass-hover rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 hover:border-sky-400/35"
                >
                  <div className="flex items-center gap-4">
                    <RiskGauge score={r.score} size="sm" showBand={false} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-100">{anon(r.patientName)}</p>
                        <span className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-slate-300">
                          {r.ward ?? WARD_FALLBACK}
                        </span>
                        <span className="font-mono text-[10px] tracking-wider text-slate-400">{r.uhid}</span>
                        {r.uncertain && (
                          <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            Manual review
                          </span>
                        )}
                      </div>
                      {r.topDriver && <p className="mt-1 truncate text-xs text-slate-400">{r.topDriver}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {r.openProtocolId ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/35 bg-violet-500/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">
                            <span className="nxp-heartbeat h-1.5 w-1.5 rounded-full bg-violet-300" aria-hidden="true" />
                            Pre-Emptive Protocol drafted
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Surveillance
                          </span>
                        )}
                        <span className="font-mono text-[10px] tracking-wider text-slate-400">
                          CONF {r.confidence.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {rows.length === 0 && (
              <div className="mt-5 flex items-center justify-center rounded-2xl border border-dashed border-white/10 px-4 py-10">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">Cohort sweep returned zero rows — engine idle</p>
              </div>
            )}
          </div>

          {/* Patient Twin Simulator */}
          <div id="twin" className="scroll-mt-24 rounded-3xl nxp-glass p-5 sm:p-6 lg:col-span-5">
            <div className="mb-5">
              <h2 className="text-lg font-bold tracking-tight text-white">Patient Twin Simulator</h2>
              <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Individual living twin · What-if horizon
              </p>
            </div>
            <TwinWhatIf />
          </div>
        </section>

        {/* ============================================================
            BENTO ROW 3 — Signal Fabric | Population Efficacy Forecast
        ============================================================ */}
        <section aria-labelledby="signals-title" className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="rounded-3xl nxp-glass p-5 sm:p-6 lg:col-span-5">
            <h2 id="signals-title" className="text-lg font-bold tracking-tight text-white">Signal Fabric</h2>
            <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Six streaming signal classes
            </p>
            <ul className="mt-5 space-y-2.5">
              {/* [PIE API] Each class maps to an ingestion stream in the
                  Patient Graph; weights surface in the SHAP breakdown. */}
              {SIGNALS.map((s) => (
                <li
                  key={s.name}
                  className="nxp-glass-hover group flex items-start gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 hover:border-violet-400/35"
                >
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-300 transition group-hover:shadow-[0_0_18px_-4px_rgba(139,92,246,0.7)]">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100">{s.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div id="forecast" className="scroll-mt-24 lg:col-span-7">
            <IndiaRiskExplorer />
          </div>
        </section>

        {/* ============================================================
            PROTOCOL PIPELINE
        ============================================================ */}
        <section id="pipeline" aria-labelledby="pipeline-title" className="mt-6 scroll-mt-24 rounded-3xl nxp-glass p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="pipeline-title" className="text-lg font-bold tracking-tight text-white">Protocol Pipeline</h2>
              <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Ingest → Graph → Twin → Radar → Protocol → Governance
              </p>
            </div>
            <span className="font-mono text-[10px] tracking-[0.16em] text-slate-400">RESCORED EVERY 90 s</span>
          </div>

          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {PIPELINE.map((p, i) => (
              <li
                key={p.name}
                className="nxp-glass-hover relative rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 hover:border-cyan-400/35"
              >
                <span aria-hidden className="absolute right-3.5 top-3 font-mono text-[10px] font-semibold tracking-[0.18em] text-slate-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
                  <p.icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-sm font-bold text-slate-100">{p.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{p.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ============================================================
            CLINICAL GOVERNANCE STRIP
        ============================================================ */}
        <section aria-label="Clinical governance" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.k} className="nxp-glass-hover flex items-center gap-3.5 rounded-2xl nxp-glass p-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-300">
                <t.icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-100">{t.k}</p>
                <p className="mt-0.5 font-mono text-[11px] tracking-wide text-slate-400">{t.v}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ============================================================
            DEPLOYMENT CTA
        ============================================================ */}
        <section aria-labelledby="deploy-title" className="relative mt-16 overflow-hidden rounded-3xl border border-sky-400/20">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.10] via-slate-900/60 to-violet-600/[0.12]" aria-hidden="true" />
          <div className="nxp-grid absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative flex flex-col items-start gap-6 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-300">
                Bring the bridge to your institution
              </p>
              <h2 id="deploy-title" className="mt-3 max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Deploy the Predictive Intelligence Engine in your hospital.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                A deployment briefing walks your clinical leadership through the live radar, the twin simulator and the
                governance model — mapped onto your wards, your EMR and your population.
              </p>
            </div>
            <DeployCta />
          </div>
        </section>

        {/* footer line */}
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Nexura · Predictive Intelligence Engine · Demo sweep — anonymized
          </p>
          <Link href="/" className="text-xs font-semibold text-slate-400 transition hover:text-sky-300">
            Return to Hospital OS →
          </Link>
        </footer>
      </main>
    </div>
  );
}
