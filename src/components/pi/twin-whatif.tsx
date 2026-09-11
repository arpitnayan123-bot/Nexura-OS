"use client";

/* ============================================================
 * PIE UI — TwinWhatIf · "Patient Twin Simulator"
 * The interactive Living-Twin console for the public PIE page:
 *   · vitals strip with a continuous heartbeat pulse
 *   · intervention catalog (clinical wording, no plain-English)
 *   · spline + area-gradient forecast curves (no bar charts)
 *   · the Time-to-Decay scrubber — drag/hover any day 0-90 and a
 *     holographic card floats above the curve with the twin's
 *     projected state
 *   · skeleton-glitch resolve while the projection "runs"
 *
 * Entirely browser-side on a baked-in demo twin: no API, no auth,
 * no PHI. [PIE API] In the Hospital OS console the same component
 * is fed by POST /api/nx/pi/simulate with the patient's real twin
 * state vector; here the catalog and projection math are local.
 * ============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, FlaskConical, HeartPulse, Moon, TrendingDown, Utensils, Wind } from "lucide-react";
import { RiskGauge, bandOf } from "@/components/pi/risk-gauge";

interface Intervention {
  id: string;
  label: string;
  kind: "medication" | "lifestyle";
  /** Time-to-Decay points removed per full adoption cycle */
  dailyDelta: number;
  horizonDays: number;
  outcomes: { label: string; delta: string; direction: "better" | "worse" | "neutral" }[];
  caveat: string;
}

const CATALOG: Intervention[] = [
  {
    id: "metformin", label: "Metformin +500 mg", kind: "medication", dailyDelta: 0.12, horizonDays: 90,
    outcomes: [
      { label: "HbA1c (90 d)", delta: "−0.5%", direction: "better" },
      { label: "Renal filtration load", delta: "+2% risk", direction: "worse" },
      { label: "Hypoglycaemia risk", delta: "low", direction: "neutral" },
    ],
    caveat: "eGFR is verified before and during therapy — the twin surfaces the renal trade-off for the attending clinician.",
  },
  {
    id: "walk30", label: "Walk 30 min / day", kind: "lifestyle", dailyDelta: 0.09, horizonDays: 90,
    outcomes: [
      { label: "Metabolic strain", delta: "−7 pts", direction: "better" },
      { label: "Resting HR (12 wk)", delta: "−4 bpm", direction: "better" },
      { label: "Adherence required", delta: "5 d / wk", direction: "neutral" },
    ],
    caveat: "Projection assumes moderate intensity; orthopaedic or cardiac clearance is advised before protocol activation.",
  },
  {
    id: "med-diet", label: "Mediterranean diet", kind: "lifestyle", dailyDelta: 0.07, horizonDays: 90,
    outcomes: [
      { label: "LDL cholesterol", delta: "−9 mg/dL", direction: "better" },
      { label: "Inflammation (hsCRP)", delta: "−14%", direction: "better" },
      { label: "Glycaemic variability", delta: "−6%", direction: "better" },
    ],
    caveat: "Diet effects compound — the twin curves bend from week 3, not day 1.",
  },
  {
    id: "sleep8", label: "Sleep 7–8 h protocol", kind: "lifestyle", dailyDelta: 0.05, horizonDays: 90,
    outcomes: [
      { label: "HRV recovery", delta: "+6 ms", direction: "better" },
      { label: "BP variability", delta: "−5%", direction: "better" },
      { label: "Daytime strain", delta: "−3 pts", direction: "better" },
    ],
    caveat: "Recovery physiology first — the wearable stream reflects the shift within two weeks.",
  },
];

const BASELINE = 58; // demo twin's Time-to-Decay index, watchlist band
const HORIZON = 90;

/* ---- projection math (deterministic, browser-side) ---- */

function baselineCurve(): number[] {
  // Untreated drift: the reactive path. Slow, relentless climb.
  return Array.from({ length: HORIZON + 1 }, (_, d) => 58 + (d / HORIZON) * 4.5);
}

function planCurve(selected: Intervention[]): number[] {
  return Array.from({ length: HORIZON + 1 }, (_, d) => {
    const adopted = selected.reduce(
      (acc, s) => acc + s.dailyDelta * Math.min(1, d / (s.horizonDays * 0.15)),
      0
    );
    return Math.max(12, 58 - adopted * 100 * (d / HORIZON));
  });
}

/** Catmull-Rom → cubic bezier for true spline smoothness. */
function splinePath(values: number[], w: number, h: number, max: number, min: number): string {
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / (max - min)) * h,
  }));
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

const BAND_TEXT: Record<string, string> = { stable: "text-cyan-300", watchlist: "text-amber-300", critical: "text-red-400" };

/* ---- vitals strip with heartbeat ---- */

function Vitals() {
  const items = [
    { icon: HeartPulse, k: "HR", v: "82", u: "bpm", beat: true, tone: "text-amber-300" },
    { icon: Activity, k: "BP", v: "128/84", u: "mmHg", tone: "text-cyan-300" },
    { icon: Wind, k: "SpO2", v: "97", u: "%", tone: "text-cyan-300" },
    { icon: Moon, k: "HRV", v: "41", u: "ms", tone: "text-violet-300" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.k} className="rounded-xl border border-sky-400/10 bg-sky-400/[0.04] px-3 py-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            <it.icon className={`h-3 w-3 ${it.beat ? "nxp-heartbeat text-rose-400" : ""}`} />
            {it.k}
          </p>
          <p className="mt-0.5 font-mono text-base font-semibold leading-none tabular-nums text-slate-100">
            {it.v} <span className="text-[10px] font-normal text-slate-300">{it.u}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

/* ---- component ---- */

export function TwinWhatIf() {
  const [selected, setSelected] = useState<string[]>(["metformin", "walk30"]);
  const [committed, setCommitted] = useState<Intervention[] | null>(null);
  const [computing, setComputing] = useState(true);
  const [day, setDay] = useState(45);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // The twin opens alive: first projection resolves out of the
  // skeleton-glitch so the simulator never shows an empty chart.
  useEffect(() => {
    const t = setTimeout(() => {
      setCommitted(CATALOG.filter((c) => selected.includes(c.id)));
      setComputing(false);
    }, 950);
    return () => clearTimeout(t);
  }, []);

  const baseline = useMemo(() => baselineCurve(), []);
  const plan = useMemo(() => (committed ? planCurve(committed) : null), [committed]);

  const W = 560, H = 200, MAX = 70, MIN = 8;
  const xOf = (d: number) => (d / HORIZON) * W;
  const yOf = (v: number) => H - ((v - MIN) / (MAX - MIN)) * H;

  const basePath = useMemo(() => splinePath(baseline, W, H, MAX, MIN), [baseline]);
  const planPath = useMemo(() => (plan ? splinePath(plan, W, H, MAX, MIN) : null), [plan]);
  const planArea = useMemo(() => {
    if (!planPath) return null;
    return `${planPath} L${W},${H} L0,${H} Z`;
  }, [planPath]);

  const baselineAt = baseline[Math.round(day)];
  const planAt = plan ? plan[Math.round(day)] : null;
  const projected = plan ? plan[HORIZON] : null;
  const delta = projected !== null ? Math.round((projected - BASELINE) * 10) / 10 : null;
  const scrubBand = bandOf(planAt ?? baselineAt);

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.slice(-3), id]));
  }

  function run() {
    if (!selected.length) return;
    setComputing(true);
    setCommitted(null);
    // Skeleton-glitch resolve — never a spinner (design directive).
    setTimeout(() => {
      setCommitted(selected.map((id) => CATALOG.find((c) => c.id === id)).filter((x): x is Intervention => Boolean(x)));
      setComputing(false);
    }, 850);
  }

  /** Hovering the chart scrubs the same holographic readout. */
  function scrubFromPointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setDay(Math.round(pct * HORIZON));
  }

  const cardPct = (day / HORIZON) * 100;
  const cardShift = cardPct < 14 ? "0%" : cardPct > 82 ? "-100%" : "-50%";

  return (
    <div className="flex h-full flex-col gap-4">
      {/* twin identity */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <p className="font-mono text-xs font-semibold tracking-wider text-slate-200">
            TWIN-4471 <span className="text-slate-400">·</span> Suresh K.
          </p>
          <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300">
            Live sync
          </span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">Watchlist · T2D trajectory</p>
      </div>

      <Vitals />

      {/* intervention catalog */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Intervention catalog</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATALOG.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                  on
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200 shadow-[0_0_16px_-4px_rgba(6,182,212,0.5)]"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-400/40 hover:text-slate-100"
                }`}
              >
                {c.kind === "medication" ? <FlaskConical className="mr-1 inline h-3 w-3" /> : <Activity className="mr-1 inline h-3 w-3" />}
                {c.label}
              </button>
            );
          })}
          <button
            onClick={run}
            disabled={computing || !selected.length}
            className="rounded-full border border-violet-400/50 bg-violet-500/20 px-4 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:opacity-50"
          >
            {computing ? "Computing…" : "Run projection"}
          </button>
        </div>
      </div>

      {/* forecast chart + scrubber */}
      <div className="relative my-auto">
        {/* holographic floating card */}
        <div
          className="nxp-holo pointer-events-none absolute z-10 -top-2 w-max rounded-xl border border-sky-400/40 bg-slate-900/85 px-3 py-2 shadow-[0_0_30px_-6px_rgba(56,189,248,0.55)] backdrop-blur-md transition-[left] duration-75"
          style={{ left: `clamp(84px, ${cardPct}%, calc(100% - 84px))`, transform: `translateX(${cardShift})` }}
          aria-live="polite"
        >
          <p className="font-mono text-sm font-bold leading-none text-sky-300">
            T+{day}<span className="text-[10px] text-slate-300">d</span>
          </p>
          <p className={`mt-1 font-mono text-xs font-semibold tabular-nums ${BAND_TEXT[scrubBand]}`}>
            {(planAt ?? baselineAt).toFixed(1)}<span className="text-slate-400">/100</span>{" "}
            <span className="text-[10px] uppercase tracking-[0.14em]">{scrubBand}</span>
          </p>
          {planAt !== null && (
            <p className="mt-0.5 font-mono text-[10px] text-slate-300 tabular-nums">
              Δ {(planAt - baselineAt).toFixed(1)} vs reactive path
            </p>
          )}
        </div>

        {computing ? (
          /* skeleton-glitch resolve */
          <div className="flex h-[200px] flex-col justify-center gap-3" aria-label="Computing projection">
            <div className="nxp-glitch h-3 w-3/4 rounded-full" />
            <div className="nxp-glitch h-3 w-1/2 rounded-full" />
            <div className="nxp-glitch h-3 w-2/3 rounded-full" />
            <div className="nxp-glitch h-3 w-1/3 rounded-full" />
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-[200px] w-full touch-none select-none"
            role="img"
            aria-label={`Forecast chart, day ${day}: reactive path ${baselineAt.toFixed(0)}, twin projection ${planAt?.toFixed(0) ?? "not run"}`}
            onPointerMove={scrubFromPointer}
            onPointerDown={scrubFromPointer}
          >
            <defs>
              <linearGradient id="nxp-plan-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="nxp-plan-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(6,182,212,0.28)" />
                <stop offset="100%" stopColor="rgba(139,92,246,0.02)" />
              </linearGradient>
            </defs>

            {/* band zones */}
            <rect x="0" y={yOf(30)} width={W} height={H - yOf(30)} fill="rgba(6,182,212,0.045)" />
            <rect x="0" y={yOf(70)} width={W} height={yOf(30) - yOf(70)} fill="rgba(245,158,11,0.05)" />
            <rect x="0" y="0" width={W} height={yOf(70)} fill="rgba(239,68,68,0.05)" />
            {[30, 70].map((g) => (
              <line key={g} x1="0" y1={yOf(g)} x2={W} y2={yOf(g)} stroke="rgba(148,163,184,0.14)" strokeDasharray="3 5" />
            ))}

            {/* reactive baseline */}
            <path d={basePath} fill="none" stroke="rgba(148,163,184,0.55)" strokeWidth="1.75" strokeDasharray="5 5" />

            {/* twin projection: area gradient + spline */}
            {planPath && (
              <>
                <path d={planArea ?? ""} fill="url(#nxp-plan-area)" />
                <path
                  d={planPath}
                  fill="none"
                  stroke="url(#nxp-plan-stroke)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 6px rgba(56,189,248,0.45))" }}
                />
              </>
            )}

            {/* scrub marker */}
            <line x1={xOf(day)} y1="0" x2={xOf(day)} y2={H} stroke="rgba(125,211,252,0.5)" strokeWidth="1" />
            <circle cx={xOf(day)} cy={yOf(baselineAt)} r="3" fill="#94a3b8" />
            {planAt !== null && (
              <circle cx={xOf(day)} cy={yOf(planAt)} r="4" fill="#22d3ee" style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.8))" }} />
            )}
          </svg>
        )}

        {/* Time-to-Decay scrubber */}
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <label htmlFor="nxp-decay" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
              Time-to-Decay horizon
            </label>
            <span className="font-mono text-[10px] tracking-wider text-slate-300">DAY 0 — 90</span>
          </div>
          <input
            id="nxp-decay"
            type="range"
            min={0}
            max={HORIZON}
            step={1}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="nxp-range mt-1"
            aria-valuetext={`Day ${day}, index ${(planAt ?? baselineAt).toFixed(0)} of 100, ${scrubBand}`}
          />
        </div>
      </div>

      {/* projection readout */}
      {committed && projected !== null && delta !== null && (
        <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <RiskGauge score={projected} size="sm" label="T+90 index" />
            <div className="flex-1 space-y-1.5">
              {committed.flatMap((c) =>
                c.outcomes.slice(0, 2).map((l, i) => (
                  <div key={`${c.id}-${i}`} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-300">{l.label}</span>
                    <span className={`font-mono font-semibold tabular-nums ${l.direction === "better" ? "text-emerald-300" : l.direction === "worse" ? "text-red-400" : "text-slate-300"}`}>
                      {l.delta}
                    </span>
                  </div>
                ))
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-bold text-emerald-300 tabular-nums">
              <TrendingDown className="h-3.5 w-3.5" />
              {delta > 0 ? "+" : ""}{delta} pts
            </span>
          </div>
          <p className="mt-3 border-t border-dashed border-white/10 pt-2.5 text-[11px] leading-relaxed text-slate-300">
            {committed[0]?.caveat}
          </p>
        </div>
      )}

      {!committed && !computing && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-300">
          <Utensils className="h-3 w-3 text-violet-300" />
          Select interventions and run the projection — the reactive path (dashed) shows the untreated trajectory.
        </p>
      )}
    </div>
  );
}
