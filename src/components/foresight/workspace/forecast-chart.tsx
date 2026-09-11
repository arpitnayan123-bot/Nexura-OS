"use client";

/* ============================================================
 * FORECAST CHART — the visual centerpiece of Predictive Analysis.
 *
 * Left of the TODAY divider: the subject's REAL measured runs.
 * Right: two engine-derived futures (current course / plan
 * followed) inside an ILLUSTRATIVE uncertainty envelope that
 * widens with horizon and shrinks with data coverage. Band-edge
 * thresholds (building/resilient/thriving) come from the same
 * calibration the engine scores with.
 *
 * Interaction: pointer crosshair + full keyboard inspection
 * (arrows / Home / End / Esc), exact-value tooltip, copy-as-text
 * and SVG export. No decorative chart junk.
 * ============================================================ */

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Download } from "lucide-react";
import type { ForecastModel } from "@/modules/foresight/workspace";

const W = 920;
const H = 380;
const PAD_L = 54;
const PAD_R = 116;
const PAD_T = 34;
const PAD_B = 46;

const INK = {
  observed: "#F4F9FF",
  course: "#FB7185",
  plan: "#2DD4BF",
  sim: "#FCD34D",
  grid: "rgba(255,255,255,0.07)",
  text: "#C0BAA9",
  textBright: "#FFFEFA",
};

const fmtMonth = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" });

interface InspectPoint {
  t: number;
  observed: number | null;
  course: number;
  lo: number;
  hi: number;
  plan: number;
  sim: number | null;
}

export function ForecastChart({ model, generatedAt }: { model: ForecastModel; generatedAt: string }) {
  const reduceMotion = useReducedMotion();
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { observed, unchanged, withActions, simulation, bandEdges, horizon } = model;

  const tMin = Math.min(-0.08, (observed[0]?.t ?? 0) - 0.02);
  const tMax = horizon;
  const x = (t: number) => PAD_L + ((t - tMin) / (tMax - tMin)) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - v / 100) * (H - PAD_T - PAD_B);

  const at = useMemo(() => new Date(generatedAt).getTime(), [generatedAt]);
  const dateAt = (t: number) => fmtMonth.format(new Date(at + t * 365.25 * 86400000));

  /* inspection lattice: real observed points + ~0.25y forecast steps */
  const inspect = useMemo<InspectPoint[]>(() => {
    const pts: InspectPoint[] = [];
    const sample = (t: number): InspectPoint => {
      const near = (arr: typeof unchanged, key: "v" | "lo" | "hi") => {
        if (t === 0) return unchanged[0][key];
        const idx = arr.findIndex((p) => p.t >= t);
        const p = idx === -1 ? arr[arr.length - 1] : arr[idx];
        return p[key];
      };
      const planNear = (() => {
        if (t === 0) return withActions[0].v;
        const idx = withActions.findIndex((p) => p.t >= t);
        return (idx === -1 ? withActions[withActions.length - 1] : withActions[idx]).v;
      })();
      const simNear = simulation
        ? (() => {
            if (t === 0) return simulation[0].v;
            const idx = simulation.findIndex((p) => p.t >= t);
            return (idx === -1 ? simulation[simulation.length - 1] : simulation[idx]).v;
          })()
        : null;
      const obs = observed.filter((o) => Math.abs(o.t - t) < 0.035).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
      return {
        t,
        observed: obs ? obs.v : null,
        course: near(unchanged, "v"),
        lo: near(unchanged, "lo"),
        hi: near(unchanged, "hi"),
        plan: planNear,
        sim: simNear,
      };
    };
    for (const o of observed) if (o.t < -0.02) pts.push(sample(Math.round(o.t * 200) / 200));
    const steps = Math.max(4, horizon * 4);
    for (let i = 0; i <= steps; i++) {
      const t = Math.round((i / steps) * horizon * 100) / 100;
      pts.push(sample(t));
    }
    return pts;
  }, [observed, unchanged, withActions, simulation, horizon]);

  const focus = focusIdx != null ? inspect[focusIdx] : null;

  /* paths */
  const linePath = (pts: { t: number; v: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const bandArea = () => {
    const up = unchanged.map((p) => `${x(p.t).toFixed(1)},${y(p.hi).toFixed(1)}`);
    const down = [...unchanged].reverse().map((p) => `${x(p.t).toFixed(1)},${y(p.lo).toFixed(1)}`);
    return `M${up.join(" L")} L${down.join(" L")} Z`;
  };

  /* x ticks */
  const ticks = useMemo<{ t: number; label: string }[]>(() => {
    if (horizon === 1) {
      return [0, 0.25, 0.5, 0.75, 1].map((t) => ({
        t,
        label: t === 0 ? "today" : t === 1 ? "+1y" : `+${Math.round(t * 12)}mo`,
      }));
    }
    return Array.from({ length: horizon + 1 }, (_, t) => ({ t, label: t === 0 ? "today" : `+${t}y` }));
  }, [horizon]);

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = tMin + ((px - PAD_L) / (W - PAD_L - PAD_R)) * (tMax - tMin);
    let best = 0;
    let bestD = Infinity;
    inspect.forEach((p, i) => {
      const d = Math.abs(p.t - t);
      if (d < bestD) { bestD = d; best = i; }
    });
    setFocusIdx(best);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocusIdx((i) => (i == null ? 0 : Math.min(inspect.length - 1, i + 1)));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocusIdx((i) => (i == null ? inspect.length - 1 : Math.max(0, i - 1)));
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusIdx(inspect.length - 1);
    } else if (e.key === "Escape") {
      setFocusIdx(null);
    }
  };

  const chartAsText = () => {
    const lines = [
      `NEXURA PREDICTIVE — FORECAST CHART (generated ${dateAt(0)})`,
      `Observed: ${observed.map((o) => `${dateAt(o.t)} = ${o.v}`).join(", ")}`,
      `Current course: ${dateAt(0)} ${unchanged[0].v} → +${horizon}y ${unchanged[unchanged.length - 1].v}`,
      `Plan followed: ${dateAt(0)} ${withActions[0].v} → +${horizon}y ${withActions[withActions.length - 1].v}`,
      simulation ? `Your simulation: → +${horizon}y ${simulation[simulation.length - 1].v}` : "",
      "Curves are illustrative risk-signal direction from the versioned engine — not a prediction of outcomes.",
    ].filter(Boolean);
    return lines.join("\n");
  };

  const copyChart = async () => {
    try {
      await navigator.clipboard.writeText(chartAsText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch { /* blocked — no-op */ }
  };

  const downloadSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexura-forecast-${horizon}y.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ariaSummary = `Forecast chart. Measured foresight score ${observed[observed.length - 1]?.v ?? "?"} of 100 today. ` +
    `On the current course the illustrative curve reaches ${unchanged[unchanged.length - 1].v} at +${horizon} years; ` +
    `following the plan reaches ${withActions[withActions.length - 1].v}. ` +
    `Use left and right arrow keys after focusing to inspect exact values.`;

  const focusAnnouncement = focus
    ? `${dateAt(focus.t)}${focus.t !== 0 ? ` (${focus.t > 0 ? "+" : ""}${Math.round(focus.t * 12)} months)` : ""}: ` +
      `${focus.observed != null ? `measured ${focus.observed}. ` : ""}` +
      `current course ${focus.course}, range ${focus.lo} to ${focus.hi}` +
      `${focus.sim != null ? `, your simulation ${focus.sim}` : ""}.`
    : "";

  /* tooltip geometry */
  const tip = (() => {
    if (!focus) return null;
    const lines: { text: string; ink: string; bold?: boolean }[] = [];
    lines.push({ text: `${dateAt(focus.t)} · ${focus.t === 0 ? "today" : focus.t < 0 ? `${Math.round(-focus.t * 12)} mo ago` : `+${(Math.round(focus.t * 10) / 10).toString()}y`}`, ink: INK.textBright, bold: true });
    if (focus.observed != null) lines.push({ text: `measured  ${focus.observed}`, ink: INK.observed });
    lines.push({ text: `current course  ${focus.course}  (${focus.lo}–${focus.hi})`, ink: INK.course });
    lines.push({ text: `plan followed  ${focus.plan}`, ink: INK.plan });
    if (focus.sim != null) lines.push({ text: `your simulation  ${focus.sim}`, ink: INK.sim });
    const tw = Math.max(...lines.map((l) => l.text.length)) * 7.4 + 28;
    const th = lines.length * 17 + 16;
    const fx = Math.min(Math.max(x(focus.t) - tw / 2, 6), W - tw - 6);
    const fy = focus.t <= 0 ? PAD_T + 6 : Math.max(PAD_T + 6, Math.min(y(focus.course), y(focus.plan)) - th - 12);
    return { lines, tw, th, fx, fy };
  })();

  const initial = reduceMotion ? false : { pathLength: 0 };

  return (
    <div>
      {/* keyboard-reachable inspection layer */}
      <div
        tabIndex={0}
        role="application"
        aria-label={ariaSummary}
        onKeyDown={onKeyDown}
        onBlur={() => setFocusIdx(null)}
        className="nxf-focus-ring -mx-1 overflow-x-auto rounded-2xl px-1 pb-1"
      >
        <svg
          ref={svgRef}
          id="nxf-forecast-svg"
          viewBox={`0 0 ${W} ${H}`}
          className="block min-w-[640px] w-full"
          role="img"
          aria-hidden="true" /* description lives on the application wrapper above */
          onPointerMove={onPointerMove}
          onPointerLeave={() => setFocusIdx(null)}
        >
          <defs>
            <linearGradient id="fcBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(251,113,133,0.16)" />
              <stop offset="100%" stopColor="rgba(251,113,133,0.04)" />
            </linearGradient>
            <linearGradient id="fcObsArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(244,249,255,0.14)" />
              <stop offset="100%" stopColor="rgba(244,249,255,0)" />
            </linearGradient>
          </defs>

          {/* y grid + axis labels */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={PAD_L} y1={y(v)} x2={W - PAD_R + 8} y2={y(v)} stroke={INK.grid} strokeWidth="1" />
              <text x={PAD_L - 10} y={y(v) + 4} textAnchor="end" fontSize="11.5" fill={INK.text}>{v}</text>
            </g>
          ))}
          <text
            transform={`rotate(-90 16 ${(H - PAD_B + PAD_T) / 2})`}
            x={16}
            y={(H - PAD_B + PAD_T) / 2}
            textAnchor="middle"
            fontSize="10.5"
            fill={INK.text}
            style={{ letterSpacing: "0.08em" }}
          >
            SCORE (0–100)
          </text>

          {/* x ticks */}
          {ticks.map((tk) => (
            <g key={tk.t}>
              <line x1={x(tk.t)} y1={y(0)} x2={x(tk.t)} y2={y(0) + 6} stroke={INK.grid} />
              <text x={x(tk.t)} y={H - 16} textAnchor="middle" fontSize="11.5" fill={INK.text}>{tk.label}</text>
            </g>
          ))}

          {/* band-edge thresholds (engine's own calibration) */}
          {bandEdges.map((b) => (
            <g key={b.score}>
              <line x1={PAD_L} y1={y(b.score)} x2={W - PAD_R + 8} y2={y(b.score)} stroke="rgba(252,211,77,0.28)" strokeWidth="1" strokeDasharray="5 6" />
              <text x={W - PAD_R + 14} y={y(b.score) + 4} fontSize="10" fill="#FDE68A" style={{ letterSpacing: "0.1em" }}>
                {b.label.toUpperCase()}
              </text>
            </g>
          ))}

          {/* observed region (real data) */}
          {observed.length >= 2 && (
            <>
              <path
                d={`${linePath(observed)} L${x(0)},${y(0)} L${x(observed[0].t)},${y(0)} Z`}
                fill="url(#fcObsArea)"
              />
              <path d={linePath(observed)} fill="none" stroke={INK.observed} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {observed.map((o, i) => (
                <circle key={i} cx={x(o.t)} cy={y(o.v)} r="4" fill={INK.observed} stroke="rgba(13,25,54,0.9)" strokeWidth="1.6" />
              ))}
            </>
          )}

          {/* uncertainty envelope + forecast curves */}
          <path d={bandArea()} fill="url(#fcBand)" />
          <motion.path
            d={linePath(unchanged)}
            fill="none" stroke={INK.course} strokeWidth="2.4" strokeLinecap="round"
            strokeDasharray="1 0"
            initial={initial}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.25 }}
          />
          <motion.path
            d={linePath(withActions)}
            fill="none" stroke={INK.plan} strokeWidth="2.4" strokeLinecap="round"
            initial={initial}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.45 }}
          />
          {simulation && (
            <motion.path
              d={linePath(simulation)}
              fill="none" stroke={INK.sim} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="7 6"
              initial={false}
              animate={{ opacity: [0, 1] }}
              transition={{ duration: 0.5 }}
            />
          )}

          {/* TODAY divider */}
          <line x1={x(0)} y1={PAD_T - 6} x2={x(0)} y2={y(0)} stroke="rgba(244,249,255,0.4)" strokeWidth="1.4" strokeDasharray="4 5" />
          <text x={x(0)} y={PAD_T - 14} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={INK.textBright} style={{ letterSpacing: "0.14em" }}>
            TODAY
          </text>

          {/* endpoint markers + values */}
          <circle cx={x(0)} cy={y(unchanged[0].v)} r="4.6" fill={INK.observed} stroke="rgba(13,25,54,0.95)" strokeWidth="2" />
          <circle cx={x(unchanged[unchanged.length - 1].t)} cy={y(unchanged[unchanged.length - 1].v)} r="4.4" fill={INK.course} stroke="rgba(13,25,54,0.9)" strokeWidth="1.6" />
          <circle cx={x(withActions[withActions.length - 1].t)} cy={y(withActions[withActions.length - 1].v)} r="4.4" fill={INK.plan} stroke="rgba(13,25,54,0.9)" strokeWidth="1.6" />
          {simulation && (
            <circle cx={x(simulation[simulation.length - 1].t)} cy={y(simulation[simulation.length - 1].v)} r="4.4" fill={INK.sim} stroke="rgba(13,25,54,0.9)" strokeWidth="1.6" />
          )}
          <text x={W - PAD_R + 4} y={y(unchanged[unchanged.length - 1].v) + 4} fontSize="12" fontWeight="700" fill={INK.course}>{unchanged[unchanged.length - 1].v}</text>
          <text x={W - PAD_R + 4} y={y(withActions[withActions.length - 1].v) - 8} fontSize="12" fontWeight="700" fill={INK.plan}>{withActions[withActions.length - 1].v}</text>

          {/* crosshair */}
          {focus && (
            <g pointerEvents="none">
              <line x1={x(focus.t)} y1={PAD_T} x2={x(focus.t)} y2={y(0)} stroke="rgba(252,211,77,0.55)" strokeWidth="1.2" />
              {focus.observed != null && <circle cx={x(focus.t)} cy={y(focus.observed)} r="5.4" fill="none" stroke={INK.observed} strokeWidth="2" />}
              <circle cx={x(focus.t)} cy={y(focus.course)} r="4.6" fill={INK.course} stroke="rgba(13,25,54,0.9)" strokeWidth="1.4" />
              <circle cx={x(focus.t)} cy={y(focus.plan)} r="4.6" fill={INK.plan} stroke="rgba(13,25,54,0.9)" strokeWidth="1.4" />
              {focus.sim != null && <circle cx={x(focus.t)} cy={y(focus.sim)} r="4.6" fill={INK.sim} stroke="rgba(13,25,54,0.9)" strokeWidth="1.4" />}
              {tip && (
                <>
                  <rect x={tip.fx} y={tip.fy} rx="10" width={tip.tw} height={tip.th}
                    fill="rgba(9,17,38,0.95)" stroke="rgba(252,211,77,0.45)" strokeWidth="1" />
                  {tip.lines.map((l, i) => (
                    <text key={i} x={tip.fx + 13} y={tip.fy + 22 + i * 17}
                      fontSize={l.bold ? "11.5" : "11"} fontWeight={l.bold ? 700 : 500} fill={l.ink}>
                      {l.text}
                    </text>
                  ))}
                </>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* screen-reader live region for keyboard inspection */}
      <p aria-live="polite" role="status" className="sr-only">{focusAnnouncement}</p>

      {/* legend + honest caption + export */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
        <span className="flex items-center gap-1.5 nxf-dim"><span className="h-0.5 w-5 rounded" style={{ background: INK.observed }} /> your measured runs</span>
        <span className="flex items-center gap-1.5 nxf-dim"><span className="h-0.5 w-5 rounded" style={{ background: INK.course }} /> current course — {unchanged[unchanged.length - 1].v}</span>
        <span className="flex items-center gap-1.5 nxf-dim"><span className="h-0.5 w-5 rounded" style={{ background: INK.plan }} /> plan followed — {withActions[withActions.length - 1].v}</span>
        {simulation && (
          <span className="flex items-center gap-1.5 nxf-gold"><span className="h-0.5 w-5 rounded" style={{ background: INK.sim }} /> your simulation — {simulation[simulation.length - 1].v}</span>
        )}
        <span className="flex items-center gap-1.5 nxf-mute">
          <span aria-hidden="true" className="inline-block h-2.5 w-5 rounded-sm" style={{ background: "rgba(251,113,133,0.16)" }} /> uncertainty band (illustrative)
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[11.5px] leading-relaxed nxf-mute">
          {observed.length < 2
            ? "First run recorded — every future check-in extends the measured line on the left of TODAY."
            : `${observed.length} measured runs feed the observed line. Everything right of TODAY is the engine's illustrative direction, not a promise.`}
          {" "}Focus the chart and use ← → keys (Home / End / Esc) to inspect exact values.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className="nxf-pill !py-2" onClick={() => void copyChart()}>
            {copied ? <Check className="h-3.5 w-3.5 nxf-teal" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5 nxf-mute" aria-hidden="true" />}
            <span>{copied ? "Copied" : "Copy values"}</span>
          </button>
          <button type="button" className="nxf-pill !py-2" onClick={downloadSvg}>
            <Download className="h-3.5 w-3.5 nxf-mute" aria-hidden="true" />
            <span>Download SVG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
