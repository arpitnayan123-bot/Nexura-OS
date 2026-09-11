"use client";

/* ============================================================
 * FORESIGHT RESULTS — the Predictive Analysis workspace.
 *
 * Information architecture (top -> bottom, safety-locked):
 *   0. triage takeovers (EMERGENCY fully withholds analysis)
 *   A. workspace header   — status, horizon, exports, refresh
 *   B. executive strip    — standing, direction, confidence,
 *                           risk, next event
 *   C. overview band      — Health Halo + six key metrics
 *   D. forecast chart     — observed vs projected + envelope
 *   E. what this means    — grounded narrative insights
 *   F. drivers            — ranked, merged, signed
 *   G. risk register      — severity, evidence, mitigation
 *   H. scenario planning  — baseline / plan / custom (engine
 *                           replay drives halo+chart together)
 *   I. recommended actions— priority board with tracking
 *   J. timeline           — calendarizable milestones
 *   K. plan depth         — signal cards, atlas, screening,
 *                           diet, clinician handoff
 *   L. transparency       — model & data drawer
 *
 * All curves/models come from the pure workspace layer —
 * no section can ever contradict another.
 * ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2,
  Copy, HeartPulse, Leaf, PhoneCall, Sparkles, Stethoscope,
} from "lucide-react";
import type { DomainId, ForesightInput, ForesightReport } from "@/modules/foresight/types";
import {
  buildActions, buildDrivers, buildExecStrip, buildForecast, buildInsights,
  buildMetricCards, buildRisks, buildTimeline, type ScoreSeriesEntry,
} from "@/modules/foresight/workspace";
import { DOMAIN_META, HealthHalo } from "./viz";
import { Eyebrow, GlassCard, LevelChip, Ornament, SectionHead, Bar, fadeUp } from "./ui";
import { ScenarioLab, SCENARIOS, applyScenarios, type ScenarioMode } from "./whatif";
import { DomainModal } from "./domain-modal";
import { runForesight } from "@/modules/foresight/engine";
import { WorkspaceHeader } from "./workspace/header";
import { ExecStripView, MetricCards } from "./workspace/metrics";
import { ForecastChart } from "./workspace/forecast-chart";
import { WhatThisMeans } from "./workspace/insights";
import { DriversPanel } from "./workspace/drivers";
import { RisksPanel } from "./workspace/risks";
import { ActionsBoard, loadActionState, type ActionState } from "./workspace/actions";
import { TimelinePanel } from "./workspace/timeline";
import { TransparencyPanel } from "./workspace/transparency";
import { cn } from "@/lib/utils";

const BAND_COPY: Record<string, { headline: string; sub: string }> = {
  THRIVING: { headline: "You're building something rare", sub: "Your patterns read resilient. Protect what's working." },
  RESILIENT: { headline: "Solid ground, a few edges", sub: "Mostly resilient patterns with a couple of things worth watching." },
  BUILDING: { headline: "Real signals — real headroom", sub: "Several patterns deserve attention. All of them respond to action." },
  ATTENTION: { headline: "Your body is asking for help", sub: "Multiple domains are loaded. Start with the top card — and take the doctor list seriously." },
};

/* ---------------- triage takeovers (unchanged, safety first) ---------------- */

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
            <Eyebrow className="">Safety first — this comes before everything</Eyebrow>
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
  report, input, onRerun, onEditInputs, onSummary,
}: {
  report: ForesightReport;
  /** normalized input behind this run — powers the scenario lab */
  input?: ForesightInput | null;
  onRerun: () => void;
  onEditInputs: () => void;
  onSummary: (text: string) => void;
}) {
  const [emergencyAck, setEmergencyAck] = useState(false);
  const [copied, setCopied] = useState(false);
  const [horizon, setHorizon] = useState<5 | 3 | 1>(5);
  const [mode, setMode] = useState<ScenarioMode>("baseline");
  const [customIds, setCustomIds] = useState<string[]>([]);
  const [actionState, setActionState] = useState<ActionState>({});
  const [openDomain, setOpenDomain] = useState<DomainId | null>(null);
  const [series, setSeries] = useState<ScoreSeriesEntry[] | null>(null);
  const band = BAND_COPY[report.scoreBand] ?? BAND_COPY.BUILDING;
  const topDomains = report.topDomainIds
    .map((id) => report.domains.find((d) => d.id === id))
    .filter((d): d is NonNullable<typeof d> => !!d);

  /* real score history (observed line + previous-run delta), fail-soft */
  useEffect(() => {
    let alive = true;
    fetch("/api/nx/foresight/history")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        window.setTimeout(() => {
          if (alive && j?.ok) setSeries((j.data?.scoreSeries ?? []) as ScoreSeriesEntry[]);
        }, 0);
      })
      .catch(() => { /* offline — workspace still renders from this run alone */ });
    return () => { alive = false; };
  }, []);

  /* persisted action tracking hydrates client-side only */
  useEffect(() => {
    const t = window.setTimeout(() => setActionState(loadActionState()), 0);
    return () => window.clearTimeout(t);
  }, []);

  /* scenario mapping: mode -> simIds -> one engine replay that drives
     the halo, the chart overlay and the scenario cards together */
  const availableIds = useMemo(
    () => (input ? SCENARIOS.filter((s) => s.available(input)).map((s) => s.id) : []),
    [input]
  );
  const simIds = mode === "plan" ? availableIds : mode === "custom" ? customIds : [];
  const simActive = simIds.length > 0 && !!input && !report.analysisWithheld;
  const simReport = useMemo(
    () => (simActive && input ? runForesight(applyScenarios(input, simIds)) : null),
    [simActive, input, simIds]
  );
  const simDelta = simReport ? simReport.foresightScore - report.foresightScore : 0;

  /* workspace model — pure functions over the report */
  const forecast = useMemo(
    () => buildForecast(report, series ?? [], { horizon, simulation: simReport }),
    [report, series, horizon, simReport]
  );
  const timeline = useMemo(() => buildTimeline(report), [report]);
  const drivers = useMemo(() => buildDrivers(report, 14), [report]);
  const risks = useMemo(() => buildRisks(report), [report]);
  const actions = useMemo(() => buildActions(report), [report]);

  const prevRun = useMemo(() => {
    if (!series) return null;
    const gen = new Date(report.generatedAt).getTime();
    const prior = [...series].reverse().find((s) => new Date(s.at).getTime() < gen - 1000);
    return prior ?? null;
  }, [series, report.generatedAt]);

  const insights = useMemo(() => buildInsights(report, prevRun, drivers), [report, prevRun, drivers]);
  const exec = useMemo(() => buildExecStrip(report, forecast, timeline), [report, forecast, timeline]);
  const metricCards = useMemo(() => buildMetricCards(report, forecast, timeline, prevRun), [report, forecast, timeline, prevRun]);

  const watchList = useMemo(
    () => drivers.filter((d) => d.direction === "risk").slice(0, 3).map((d) => `${d.label} — loads ${d.domains.map((x) => x.label).join(", ")}`),
    [drivers]
  );

  const briefText = useMemo(() => {
    const lines = [
      `NEXURA PREDICTIVE — EXECUTIVE BRIEF (engine ${report.engineVersion})`,
      `Standing: ${report.foresightScore}/100 (${report.scoreBand}) · confidence: ${exec.confidenceText}`,
      `Direction: ${exec.direction.label}`,
      `Risk: ${exec.risk.count === 0 ? "no elevated domains" : `${exec.risk.count} elevated+ (led by ${exec.risk.topLabel})`}`,
      exec.nextEvent ? `Next: ${exec.nextEvent.title} (${exec.nextEvent.horizon}, ${exec.nextEvent.when})` : "",
      "",
      "TOP DRIVERS:",
      ...drivers.filter((d) => d.direction === "risk").slice(0, 3).map((d) => `- ${d.label} → ${d.domains.map((x) => x.label).join(", ")}`),
      "",
      "START HERE:",
      ...actions.filter((a) => a.priority === 1).slice(0, 3).map((a) => `- ${a.title} (${a.domainLabel})`),
      "",
      report.disclaimer,
    ].filter((l) => l !== undefined);
    return lines.join("\n");
  }, [report, exec, drivers, actions]);

  const atlasSorted = useMemo(
    () => [...report.domains].sort((a, b) => b.burden - a.burden),
    [report.domains]
  );

  const copyDoctorSummary = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch { /* clipboard blocked — no-op */ }
  };

  const resetScenario = () => { setMode("baseline"); setCustomIds([]); };

  if (report.triage.level === "EMERGENCY" && !emergencyAck) {
    return <EmergencyTakeover report={report} onAcknowledge={() => setEmergencyAck(true)} />;
  }

  return (
    <div className="space-y-11">
      {report.triage.level === "EMERGENCY" && (
        <button type="button" onClick={() => setEmergencyAck(false)}
          className="w-full rounded-2xl border border-rose-400/40 bg-rose-400/[0.08] p-4 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold nxf-rose">
            <AlertTriangle className="h-4 w-4" /> Emergency guidance is pinned at the top — tap to reopen
          </p>
        </button>
      )}
      {report.triage.level === "SAME_DAY" && <SameDayBanner report={report} />}

      {/* A — WORKSPACE HEADER */}
      <WorkspaceHeader
        report={report}
        horizon={horizon}
        onHorizon={setHorizon}
        simActive={simActive}
        briefText={briefText}
        onRefresh={onRerun}
        onConfigure={onEditInputs}
      />

      {/* B — EXECUTIVE STRIP + simulation banner */}
      <div className="space-y-3">
        <ExecStripView exec={exec} />
        {simActive && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-amber-300/45 bg-amber-300/[0.10] px-4 py-2.5"
            aria-live="polite"
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
            </span>
            <p className="text-[12.5px] font-semibold nxf-gold">
              Viewing the {mode === "plan" ? "committed plan" : "custom mix"} scenario — {simDelta >= 0 ? `+${simDelta}` : simDelta} vs your saved run. Halo, chart and scenario cards move together; your saved run is untouched.
            </p>
            <button type="button" onClick={resetScenario}
              className="rounded-full border border-amber-300/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider nxf-gold transition hover:bg-amber-300/20">
              back to my run
            </button>
          </motion.div>
        )}
      </div>

      {/* C — OVERVIEW BAND: signature halo + key metrics */}
      {!report.analysisWithheld && (
        <section aria-label="Overview — score and key metrics">
          <div className="grid items-start gap-6 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7 }}
              className="text-center lg:col-span-5"
            >
              <Eyebrow className="mb-3">Signal topology · tap an axis</Eyebrow>
              <HealthHalo
                domains={(simReport ?? report).domains}
                score={(simReport ?? report).foresightScore}
                band={(simReport ?? report).scoreBand}
                size={380}
                live={simActive}
                onSelectDomain={(id) => setOpenDomain(id)}
                activeId={openDomain}
              />
              <p className="mx-auto mt-3 max-w-sm text-[12px] leading-relaxed nxf-mute">
                The halo expands toward more risk-burden — it reads patterns, never diagnoses. {band.sub}
              </p>
            </motion.div>
            <div className="lg:col-span-7">
              <MetricCards cards={metricCards} />
            </div>
          </div>
        </section>
      )}

      {/* D — FORECAST CHART (the centerpiece) */}
      {!report.analysisWithheld && (
        <GlassCard className="p-5 sm:p-7" {...fadeUp}>
          <SectionHead
            eyebrow="The forecast"
            title="Observed truth vs projected direction"
            sub="Left of TODAY: your measured runs. Right of it: the engine's two futures inside an honest uncertainty envelope — wider where your data is thinner."
          />
          <ForecastChart model={forecast} generatedAt={report.generatedAt} />
        </GlassCard>
      )}

      {/* E — WHAT THIS MEANS */}
      {!report.analysisWithheld && (
        <WhatThisMeans
          insights={insights}
          watchList={watchList}
          coverageNote={`Coverage ${report.completeness.pct}% · ${prevRun ? "previous-run delta computed from your real history" : "this is your first recorded run — the delta read appears next check-in"}.`}
        />
      )}

      {/* F — DRIVERS */}
      {!report.analysisWithheld && <DriversPanel drivers={drivers} total={drivers.length} />}

      {/* G — RISK REGISTER */}
      {!report.analysisWithheld && <RisksPanel risks={risks} />}

      {/* H — SCENARIO PLANNING (drives halo + chart overlay) */}
      {input && !report.analysisWithheld && (
        <ScenarioLab
          baseInput={input}
          baseReport={report}
          mode={mode}
          onMode={setMode}
          customIds={customIds}
          onCustomIds={setCustomIds}
          simReport={simReport}
        />
      )}

      {/* I — RECOMMENDED ACTIONS */}
      {!report.analysisWithheld && <ActionsBoard actions={actions} state={actionState} onChange={setActionState} />}

      {/* J — TIMELINE */}
      {!report.analysisWithheld && <TimelinePanel milestones={timeline} />}

      {/* K1 — SIGNAL CARDS (deep per-domain stories) */}
      {!report.analysisWithheld && (
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
      )}

      {/* K2 — FULL ATLAS */}
      {!report.analysisWithheld && (
        <motion.section {...fadeUp}>
          <SectionHead
            eyebrow="The full atlas"
            title="All twelve domains, ranked"
            sub="Not just the loud three — every domain the engine scored, in burden order. Tap any card for its complete story."
          />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {atlasSorted.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setOpenDomain(d.id)}
                aria-haspopup="dialog"
                className={cn(
                  "group flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition",
                  "border-white/[0.08] bg-white/[0.03] hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-white/[0.05]",
                  openDomain === d.id && "border-amber-300/50 bg-amber-300/[0.06]"
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span aria-hidden="true" className="nxf-gold nxf-glyph-glow text-[15px]">{DOMAIN_META[d.id]?.glyph}</span>
                  <span className="nxf-mono text-[10px] nxf-mute">#{i + 1}</span>
                </div>
                <p className="text-[13px] font-semibold leading-tight nxf-hi">{DOMAIN_META[d.id]?.label ?? d.id}</p>
                <div className="flex w-full items-center justify-between gap-2">
                  <LevelChip level={d.level} />
                  <span className="nxf-mono text-[11px] nxf-dim">{d.burden}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* K3 — SCREENING PLAN */}
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

      {/* K4 — DIET PRESCRIPTION */}
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

      {/* K5 — DOCTOR SUMMARY */}
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

      {/* L — TRANSPARENCY + closing honesty */}
      {!report.analysisWithheld ? (
        <TransparencyPanel report={report} />
      ) : (
        <div className="flex flex-col gap-3 pb-4 text-center">
          <Ornament label="Honest data · versioned engine" className="mb-1" />
          <p className="mx-auto max-w-2xl text-[11.5px] leading-relaxed nxf-mute">{report.disclaimer}</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 pb-4 text-center">
        <p className="nxf-mono text-[10px] tracking-wider text-[#C0BAA9]">
          <span aria-hidden="true" className="nxf-glyph-glow nxf-gold">✦ </span>
          engine {report.engineVersion} · rules {report.rulesetVersion} · calibration {report.calibrationVersion}
        </p>
        <button type="button" onClick={onRerun} className="nxf-cta nxf-cta-ghost">
          <Activity className="h-4 w-4" aria-hidden="true" /> Run a fresh check-in
        </button>
      </div>

      {/* domain drill-down — from halo axes + atlas cards */}
      <DomainModal
        domain={(simReport ?? report).domains.find((d) => d.id === openDomain) ?? report.domains.find((d) => d.id === openDomain) ?? null}
        onClose={() => setOpenDomain(null)}
      />
    </div>
  );
}
