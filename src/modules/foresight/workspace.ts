/* ============================================================
 * NEXURA PREDICTIVE — WORKSPACE VIEW-MODEL LAYER
 *
 * Pure, deterministic builders that turn a ForesightReport
 * (+ the subject's real score history) into the data shapes
 * the Predictive Analysis workspace renders:
 *
 *   forecast series · executive strip · key metrics ·
 *   ranked drivers · risk register · recommended actions ·
 *   milestone timeline · narrative insights
 *
 * HONESTY CONTRACT (mirrors the engine's):
 *  - Every curve is derived from the engine's own trajectory
 *    endpoints; nothing is invented beyond its easing.
 *  - The uncertainty envelope is labelled ILLUSTRATIVE in the
 *    UI and widens with horizon, shrinks with data coverage.
 *  - Confidence stays a category, never a fabricated percent.
 *  - Same inputs + same versions => same workspace model.
 * ============================================================ */

import { SCORE_BANDS, bandFor } from "./calibration";
import type { Confidence, DomainId, ForesightReport } from "./types";
import { DOMAIN_LABELS } from "./labels";

export const HORIZONS = [1, 3, 5] as const;
export type HorizonYears = (typeof HORIZONS)[number];

export const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/* ------------------------- forecast ------------------------- */

export interface ObservedPoint {
  /** years relative to the current run (0 = today, negative = past) */
  t: number;
  v: number;
  /** ISO timestamp of the real measurement */
  at: string;
}

export interface ForecastPoint {
  t: number;
  v: number;
  /** illustrative uncertainty envelope around v */
  lo: number;
  hi: number;
}

export interface BandEdge {
  score: number;
  label: string;
}

export interface ForecastModel {
  observed: ObservedPoint[];
  unchanged: ForecastPoint[];
  withActions: ForecastPoint[];
  /** what-if replay overlay (same engine, modified levers) */
  simulation: ForecastPoint[] | null;
  bandEdges: BandEdge[];
  horizon: HorizonYears;
  /** endpoint deltas vs today */
  deltaUnchanged: number;
  deltaActions: number;
}

export interface ScoreSeriesEntry {
  at: string;
  score: number;
}

const clamp01to100 = (n: number) => Math.max(0, Math.min(100, n));

/** Same decelerating easing the results trajectory chart has always
 *  used — kept identical so both views never contradict each other. */
export function trajectoryAt(start: number, end: number, t: number): number {
  if (t <= 0) return start;
  const eased = 1 - Math.pow(1 - Math.min(1, t / 5), 1.8);
  return start + (end - start) * eased;
}

/** Illustrative half-width of the uncertainty envelope: zero-ish at
 *  the measured score, growing with horizon, scaled by how much of
 *  the critical profile was actually shared (completeness). */
export function envelopeHalfWidth(t: number, completenessPct: number): number {
  const coverage = Math.max(0, Math.min(100, completenessPct));
  const uncertainty = 0.35 + 0.75 * ((100 - coverage) / 100); // 0.35 .. ~1.1
  return (0.4 + 6.8 * Math.pow(Math.max(0, t), 0.9)) * uncertainty;
}

function curve(
  start: number,
  end: number,
  horizon: number,
  completenessPct: number,
  steps = 20
): ForecastPoint[] {
  const out: ForecastPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * horizon;
    /* the score is an integer domain (0-100) — every displayed
       value rounds, so the UI can never quote a raw float */
    const v = Math.round(clamp01to100(trajectoryAt(start, end, t)));
    const hw = envelopeHalfWidth(t, completenessPct);
    out.push({
      t,
      v,
      lo: Math.round(clamp01to100(v - hw)),
      hi: Math.round(clamp01to100(v + hw)),
    });
  }
  return out;
}

export function buildForecast(
  report: ForesightReport,
  historyScores: ScoreSeriesEntry[],
  opts: { horizon?: HorizonYears; simulation?: ForesightReport | null } = {}
): ForecastModel {
  const horizon = opts.horizon ?? 5;
  const generatedAt = new Date(report.generatedAt).getTime();

  /* observed = the subject's REAL past runs (oldest -> newest),
     mapped to year-fractions before today. The current run anchors t=0. */
  const observed: ObservedPoint[] = historyScores
    .map((s) => ({
      t: (new Date(s.at).getTime() - generatedAt) / MS_PER_YEAR,
      v: Math.max(0, Math.min(100, Math.round(s.score))),
      at: s.at,
    }))
    .filter((p) => Number.isFinite(p.t) && p.t <= 0.02)
    .sort((a, b) => a.t - b.t);

  // guarantee the t=0 anchor (this run) exists exactly once
  const hasAnchor = observed.some((p) => Math.abs(p.t) < 0.003);
  const observedFinal = hasAnchor
    ? observed.map((p) => (Math.abs(p.t) < 0.003 ? { ...p, v: report.foresightScore } : p))
    : [...observed, { t: 0, v: report.foresightScore, at: report.generatedAt }];

  const unchanged = curve(report.foresightScore, report.trajectory.unchangedScore, horizon, report.completeness.pct);
  const withActions = curve(report.foresightScore, report.trajectory.withActionsScore, horizon, report.completeness.pct);
  const simulation = opts.simulation
    ? curve(opts.simulation.foresightScore, opts.simulation.trajectory.unchangedScore, horizon, report.completeness.pct)
    : null;

  /* deltas are derived from the horizon-SLICED curves so a +1y view
     can never quote the 5-year endpoint — no contradictory numbers. */
  const endU = unchanged[unchanged.length - 1].v;
  const endW = withActions[withActions.length - 1].v;

  return {
    observed: observedFinal,
    unchanged,
    withActions,
    simulation,
    bandEdges: [
      { score: SCORE_BANDS.THRIVING, label: "Thriving" },
      { score: SCORE_BANDS.RESILIENT, label: "Resilient" },
      { score: SCORE_BANDS.BUILDING, label: "Building" },
    ],
    horizon,
    deltaUnchanged: endU - report.foresightScore,
    deltaActions: endW - report.foresightScore,
  };
}

/* ------------------------- drivers ------------------------- */

export interface DriverRow {
  key: string;
  label: string;
  direction: "risk" | "protective";
  /** summed factor weight across domains (ordinal, not probability) */
  weight: number;
  /** 0-100 share of the strongest driver */
  share: number;
  domains: { id: DomainId; label: string }[];
  extraDomains: number;
}

/** Flattens + merges the engine's factor hits into ranked drivers.
 *  The same underlying signal (e.g. waist 96 cm) often loads several
 *  domains — merging tells that story once, with receipts. */
export function buildDrivers(report: ForesightReport, limit = 8): DriverRow[] {
  const merged = new Map<string, DriverRow>();
  for (const d of report.domains) {
    if (d.burden <= 0) continue;
    for (const f of d.factors) {
      const key = `${f.direction}::${f.label}`;
      const existing = merged.get(key);
      if (existing) {
        existing.weight += f.weight;
        if (!existing.domains.some((x) => x.id === d.id)) {
          existing.domains.push({ id: d.id, label: DOMAIN_LABELS[d.id] ?? d.id });
        }
      } else {
        merged.set(key, {
          key,
          label: f.label,
          direction: f.direction,
          weight: f.weight,
          share: 0,
          domains: [{ id: d.id, label: DOMAIN_LABELS[d.id] ?? d.id }],
          extraDomains: 0,
        });
      }
    }
  }
  const rows = [...merged.values()].sort((a, b) => b.weight - a.weight);
  const max = rows[0]?.weight ?? 1;
  for (const r of rows) {
    r.share = max > 0 ? Math.round((r.weight / max) * 100) : 0;
    r.extraDomains = Math.max(0, r.domains.length - 3);
    r.domains = r.domains.slice(0, 3);
  }
  return rows.slice(0, limit);
}

/* ------------------------- risks ------------------------- */

export type RiskLevel = "WATCH" | "ELEVATED" | "HIGH";

export interface RiskRow {
  domainId: DomainId;
  label: string;
  level: RiskLevel;
  burden: number;
  confidence: Confidence;
  headline: string;
  /** top risk-factor labels as evidence */
  evidence: string[];
  mitigation: string | null;
  screening: string | null;
}

export function buildRisks(report: ForesightReport): RiskRow[] {
  if (report.analysisWithheld) return [];
  return report.domains
    .filter((d): d is typeof d & { level: RiskLevel } => d.level !== "LOW" && d.burden >= 18)
    .sort((a, b) => b.burden - a.burden)
    .map((d) => ({
      domainId: d.id,
      label: DOMAIN_LABELS[d.id] ?? d.id,
      level: d.level,
      burden: d.burden,
      confidence: d.confidence,
      headline: d.headline,
      evidence: d.factors.filter((f) => f.direction === "risk").slice(0, 3).map((f) => f.label),
      mitigation: d.actions[0]?.title ?? null,
      screening: d.screening.find((s) => !s.test.startsWith("None"))?.test ?? null,
    }));
}

/* ------------------------- actions ------------------------- */

export interface ActionRow {
  key: string;
  title: string;
  detail: string;
  effort: "easy" | "moderate" | "with-doctor";
  priority: 1 | 2 | 3;
  domainId: DomainId;
  domainLabel: string;
}

export function buildActions(report: ForesightReport, limit = 9): ActionRow[] {
  if (report.analysisWithheld) return [];
  const levelPriority = { HIGH: 1, ELEVATED: 2, WATCH: 3 } as const;
  return report.domains
    .filter((d) => d.burden > 0 && d.actions.length > 0)
    .sort((a, b) => b.burden - a.burden)
    .flatMap((d) =>
      d.actions.map((a, i) => ({
        key: `${d.id}:${i}:${a.title}`,
        title: a.title,
        detail: a.detail,
        effort: a.effort,
        priority: levelPriority[d.level as keyof typeof levelPriority] ?? 3,
        domainId: d.id,
        domainLabel: DOMAIN_LABELS[d.id] ?? d.id,
      }))
    )
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}

/* ------------------------- timeline ------------------------- */

export type MilestoneKind = "screening" | "rescan" | "threshold" | "protective";
export type MilestoneCertainty = "measured" | "planned" | "illustrative";

export interface Milestone {
  key: string;
  /** absolute human date, e.g. "Nov 2026" (en-IN) */
  when: string;
  /** relative label, e.g. "now", "+3 months", "+2.4 years" */
  horizon: string;
  title: string;
  detail: string;
  kind: MilestoneKind;
  certainty: MilestoneCertainty;
  /** year-fraction for chart overlay ordering */
  t: number;
}

function fmtWhen(from: number, t: number): string {
  const d = new Date(from + t * MS_PER_YEAR);
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(d);
}

function fmtHorizon(t: number): string {
  if (t <= 0.02) return "now";
  const months = Math.round(t * 12);
  if (months < 12) return `+${months} mo`;
  const years = Math.round(t * 10) / 10;
  return `+${years} yr`;
}

/** Deterministic milestones: screening cadence from the plan, the
 *  8-12-week rescan ritual, and the engine trajectory's band
 *  crossings (clearly marked illustrative). */
export function buildTimeline(report: ForesightReport, from = Date.now()): Milestone[] {
  if (report.analysisWithheld) return [];
  const out: Milestone[] = [];
  const push = (m: Omit<Milestone, "when" | "horizon">) => {
    out.push({ ...m, when: fmtWhen(from, m.t), horizon: fmtHorizon(m.t) });
  };

  /* 1 — now: confirm the loudest signal */
  const topBurdened = [...report.domains].sort((a, b) => b.burden - a.burden).find((d) => d.burden >= 18);
  if (topBurdened) {
    const screen = topBurdened.screening.find((s) => !s.test.startsWith("None"));
    if (screen) {
      push({
        key: "now-screen",
        t: 0,
        title: `Discuss ${screen.test}`,
        detail: screen.why,
        kind: "screening",
        certainty: "planned",
      });
    }
  }

  /* 2 — re-scan ritual at 8-12 weeks */
  push({
    key: "rescan",
    t: 0.21, // ~10 weeks
    title: "Re-run your check-in",
    detail: "Compare the two maps after 8–12 weeks of changes — the delta is the honest measure of progress.",
    kind: "rescan",
    certainty: "planned",
  });

  /* 3 — yearly cadence screening from the plan */
  const yearly = report.domains
    .flatMap((d) => d.screening.map((s) => ({ s, d })))
    .filter((x) => /year/i.test(x.s.cadence ?? "") && !x.s.test.startsWith("None"))
    .sort((a, b) => b.d.burden - a.d.burden)[0];
  if (yearly) {
    push({
      key: "yearly-screen",
      t: 1,
      title: `${yearly.s.test} — yearly cadence`,
      detail: yearly.s.why,
      kind: "screening",
      certainty: "planned",
    });
  }

  /* 4 — band crossings (illustrative): down = current course,
     up = plan followed. Linear scan at ~18-day steps. */
  const scan = (end: number, dir: "down" | "up"): number | null => {
    let lastBand = bandFor(report.foresightScore);
    for (let t = 0.05; t <= end; t += 0.05) {
      const v = trajectoryAt(report.foresightScore, dir === "down" ? report.trajectory.unchangedScore : report.trajectory.withActionsScore, t);
      const b = bandFor(v);
      if (b !== lastBand) return t;
      lastBand = b;
    }
    return null;
  };

  const downT = scan(5, "down");
  if (downT != null) {
    const crossed = bandFor(trajectoryAt(report.foresightScore, report.trajectory.unchangedScore, downT));
    push({
      key: "cross-down",
      t: downT,
      title: `Projected to enter ${crossed.toLowerCase()} range — if nothing changes`,
      detail: `The current-course curve crosses ${crossed === "ATTENTION" ? "below 45" : "a band edge"} around month ${Math.round(downT * 12)}. This is a direction, not a destiny — the plan exists to bend it.`,
      kind: "threshold",
      certainty: "illustrative",
    });
  }

  const upT = scan(5, "up");
  if (upT != null) {
    const crossed = bandFor(trajectoryAt(report.foresightScore, report.trajectory.withActionsScore, upT));
    push({
      key: "cross-up",
      t: upT,
      title: `Plan followed → ${crossed.toLowerCase()} range possible`,
      detail: `Following the plan's actions, the composite could cross into ${crossed} territory around month ${Math.round(upT * 12)}. Earned by the actions, not by the algorithm.`,
      kind: "threshold",
      certainty: "illustrative",
    });
  }

  return out.sort((a, b) => a.t - b.t).slice(0, 6);
}

/* ------------------------- insights ------------------------- */

export type InsightKind = "change" | "driver" | "trend" | "monitor" | "confidence";

export interface Insight {
  key: string;
  kind: InsightKind;
  title: string;
  body: string;
}

const CONF_SHORT: Record<Confidence, string> = {
  INSUFFICIENT_INFORMATION: "insufficient information",
  LOW_CONFIDENCE: "low confidence",
  MODERATE_CONFIDENCE: "moderate confidence",
  HIGHER_WITHIN_SCREENING_SCOPE: "higher confidence (within screening scope)",
};

const CONF_VALUE: Record<Confidence, string> = {
  INSUFFICIENT_INFORMATION: "thin",
  LOW_CONFIDENCE: "low",
  MODERATE_CONFIDENCE: "moderate",
  HIGHER_WITHIN_SCREENING_SCOPE: "higher",
};

/** Confidence for the whole map = the top burdened domain's category. */
export function mapConfidence(report: ForesightReport): { category: Confidence; text: string; value: string } {
  const top = [...report.domains].sort((a, b) => b.burden - a.burden)[0];
  const category: Confidence = top?.confidence ?? "INSUFFICIENT_INFORMATION";
  return { category, text: CONF_SHORT[category], value: CONF_VALUE[category] };
}

export function buildInsights(
  report: ForesightReport,
  prev: { score: number; at: string } | null,
  drivers: DriverRow[]
): Insight[] {
  const out: Insight[] = [];
  if (report.analysisWithheld) return out;

  /* change — grounded in the previous real run */
  if (prev) {
    const delta = report.foresightScore - Math.round(prev.score);
    const days = Math.max(1, Math.round((Date.now() - new Date(prev.at).getTime()) / 86400000));
    out.push({
      key: "change",
      kind: "change",
      title: delta === 0 ? "Holding steady since your last check-in" : delta > 0 ? "The map moved up since your last check-in" : "The map moved down since your last check-in",
      body:
        `Your composite is ${report.foresightScore} today vs ${Math.round(prev.score)} about ${days} day${days === 1 ? "" : "s"} ago ` +
        (delta === 0 ? "— the same band. Re-run after 8–12 weeks of changes for a meaningful delta." : `(${delta > 0 ? "+" : ""}${delta}). ${delta > 0 ? "The actions you took are showing up in the pattern." : "Worth rechecking the signals that slipped — they are highlighted in Drivers below."}`),
    });
  }

  /* driver — the loudest merged factor with its domain receipts.
     Factor labels often carry an embedded instruction after a
     semicolon ("…; confirm with a doctor") — strip it for the title. */
  const lead = drivers.find((d) => d.direction === "risk");
  if (lead) {
    const domList = lead.domains.map((d) => d.label).join(", ");
    const shortLabel = lead.label.split(";")[0].replace(/\.$/, "");
    out.push({
      key: "driver",
      kind: "driver",
      title: `${shortLabel} is carrying the largest share of risk`,
      body: `It loads ${domList}${lead.extraDomains > 0 ? ` and ${lead.extraDomains} more domain${lead.extraDomains === 1 ? "" : "s"}` : ""}. That concentration is why the plan starts there — one signal, several downstream scores.`,
    });
  }

  /* trend — the engine's own two endpoints */
  out.push({
    key: "trend",
    kind: "trend",
    title: report.trajectory.withActionsScore > report.foresightScore ? "The direction responds to the plan" : "The direction is close to flat — protect what works",
    body: `On the current course the composite drifts to ${report.trajectory.unchangedScore} by year five; following the plan bends it to ${report.trajectory.withActionsScore}. Both numbers come from the same versioned engine run — the difference is the size of the prize.`,
  });

  /* monitor — protective assets worth keeping */
  if (report.protectiveFactors.length > 0) {
    out.push({
      key: "monitor",
      kind: "monitor",
      title: "Keep the assets already working for you",
      body: `${report.protectiveFactors.slice(0, 3).join(" · ")}. Protective patterns decay quietly — the map re-reads them at every check-in, so keep them on the record.`,
    });
  }

  /* confidence — coverage + category, never fake precision */
  const conf = mapConfidence(report);
  out.push({
    key: "confidence",
    kind: "confidence",
    title: `Reading confidence: ${conf.text}`,
    body: `You shared ${report.completeness.pct}% of the critical profile${report.completeness.missing.length ? ` (missing: ${report.completeness.missing.slice(0, 4).join(", ")})` : ""}. Sharing more at the next check-in narrows the uncertainty band on the chart.`,
  });

  return out;
}

/* ------------------------- executive strip ------------------------- */

export interface ExecStrip {
  horizon: HorizonYears;
  scoreNow: number;
  band: string;
  direction: { kind: "up" | "down" | "flat"; delta: number; label: string };
  planDelta: number;
  confidenceText: string;
  confidenceValue: string;
  risk: { count: number; label: string; topLabel: string | null };
  nextEvent: Milestone | null;
}

export function buildExecStrip(
  report: ForesightReport,
  forecast: ForecastModel,
  timeline: Milestone[]
): ExecStrip {
  const d = forecast.deltaActions;
  const kind = d > 1 ? "up" : d < -1 ? "down" : "flat";
  const elevated = report.domains.filter((x) => x.level === "ELEVATED" || x.level === "HIGH");
  const top = [...elevated].sort((a, b) => b.burden - a.burden)[0];
  return {
    horizon: forecast.horizon,
    scoreNow: report.foresightScore,
    band: report.scoreBand,
    direction: {
      kind,
      delta: d,
      label:
        kind === "up"
          ? `Improves +${d} by +${forecast.horizon}y with the plan`
          : kind === "down"
            ? `Slips ${d} by +${forecast.horizon}y unless the plan lands`
            : `Holds roughly level over ${forecast.horizon}y`,
    },
    planDelta: d,
    confidenceText: mapConfidence(report).text,
    confidenceValue: mapConfidence(report).value,
    risk: {
      count: elevated.length,
      label: elevated.length === 0 ? "No elevated domains" : `${elevated.length} elevated`,
      topLabel: top ? (DOMAIN_LABELS[top.id] ?? top.id) : null,
    },
    nextEvent: timeline[0] ?? null,
  };
}

/* ------------------------- metric cards ------------------------- */

export interface MetricCard {
  key: string;
  label: string;
  value: string;
  unit?: string;
  trend: "up" | "down" | "flat";
  trendText: string;
  context: string;
  spark?: number[];
  sparkInk?: "gold" | "teal" | "rose";
}

export function buildMetricCards(
  report: ForesightReport,
  forecast: ForecastModel,
  timeline: Milestone[],
  prev: { score: number; at: string } | null
): MetricCard[] {
  const series = forecast.observed.map((o) => o.v);
  const deltaPrev = prev ? report.foresightScore - Math.round(prev.score) : null;
  const elevated = report.domains.filter((x) => x.level === "ELEVATED" || x.level === "HIGH").length;
  const top = [...report.domains].sort((a, b) => b.burden - a.burden)[0];

  const cards: MetricCard[] = [
    {
      key: "score-now",
      label: "Foresight score today",
      value: String(report.foresightScore),
      unit: "/100",
      trend: deltaPrev == null || deltaPrev === 0 ? "flat" : deltaPrev > 0 ? "up" : "down",
      trendText: deltaPrev == null ? "first recorded run" : `${deltaPrev > 0 ? "+" : ""}${deltaPrev} vs previous run`,
      context: `${report.scoreBand.toLowerCase()} band · measured from the signals you shared`,
      spark: series.length >= 2 ? series : undefined,
      sparkInk: "gold",
    },
    {
      key: "proj-unchanged",
      label: `Projected at +${forecast.horizon}y — current course`,
      value: String(forecast.unchanged[forecast.unchanged.length - 1].v),
      unit: "/100",
      trend: forecast.deltaUnchanged < 0 ? "down" : forecast.deltaUnchanged > 0 ? "up" : "flat",
      trendText: `${forecast.deltaUnchanged > 0 ? "+" : ""}${forecast.deltaUnchanged} vs today`,
      context: "Where the pattern drifts if nothing changes (illustrative)",
      spark: [report.foresightScore, forecast.unchanged[forecast.unchanged.length - 1].v],
      sparkInk: "rose",
    },
    {
      key: "proj-plan",
      label: `Projected at +${forecast.horizon}y — plan followed`,
      value: String(forecast.withActions[forecast.withActions.length - 1].v),
      unit: "/100",
      trend: forecast.deltaActions >= 0 ? "up" : "down",
      trendText: `${forecast.deltaActions > 0 ? "+" : ""}${forecast.deltaActions} vs today`,
      context: "The same engine, re-run against your completed actions",
      spark: [report.foresightScore, forecast.withActions[forecast.withActions.length - 1].v],
      sparkInk: "teal",
    },
    {
      key: "coverage",
      label: "Data confidence",
      value: `${report.completeness.pct}%`,
      trend: report.completeness.pct >= 70 ? "up" : report.completeness.pct >= 45 ? "flat" : "down",
      trendText: mapConfidence(report).text,
      context: report.completeness.missing.length
        ? `not shared yet: ${report.completeness.missing.slice(0, 3).join(", ")}`
        : "critical profile fully shared",
    },
    {
      key: "exposure",
      label: "Risk exposure",
      value: `${elevated}`,
      unit: "of 12 domains",
      trend: elevated >= 3 ? "down" : elevated >= 1 ? "flat" : "up",
      trendText: elevated === 0 ? "none elevated or high" : `${top ? (DOMAIN_LABELS[top.id] ?? top.id) : ""} leads at ${top?.burden ?? 0}`,
      context: elevated === 0 ? "all twelve domains read steady" : "elevated/high signal burden — see Risk register",
    },
    {
      key: "next-event",
      label: "Next significant milestone",
      value: timeline[0]?.horizon ?? "—",
      trend: "flat",
      trendText: timeline[0]?.when ?? "no milestones pending",
      context: timeline[0]?.title ?? "run a check-in to build your timeline",
    },
  ];
  return cards;
}
