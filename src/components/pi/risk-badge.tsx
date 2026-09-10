"use client";

/* ============================================================
 * PIE UI — RiskBadge
 * The Time-to-Decay visual language: Green (0-30) stable,
 * Yellow (31-70) watchlist, Red (71-100) critical imminent.
 * Shows score, band color, trend arrow and uncertainty marker.
 * ============================================================ */

export type RiskBandName = "green" | "yellow" | "red";

const BAND_STYLES: Record<RiskBandName, { chip: string; dot: string; label: string }> = {
  green: { chip: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900", dot: "bg-emerald-500", label: "Stable" },
  yellow: { chip: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900", dot: "bg-amber-500", label: "Watchlist" },
  red: { chip: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900", dot: "bg-rose-500", label: "Critical" },
};

export function bandOfScore(score: number): RiskBandName {
  if (score <= 30) return "green";
  if (score <= 70) return "yellow";
  return "red";
}

export function RiskBadge({
  score,
  trend,
  uncertain,
  size = "md",
}: {
  score: number;
  trend?: number[] | null; // recent scores for direction
  uncertain?: boolean;
  size?: "sm" | "md";
}) {
  const band = bandOfScore(score);
  const s = BAND_STYLES[band];
  let arrow: string | null = null;
  if (trend && trend.length >= 2) {
    const delta = trend[trend.length - 1] - trend[0];
    arrow = delta > 2 ? "▲" : delta < -2 ? "▼" : "▬";
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${s.chip} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
      title={`Time-to-Decay ${score}/100 — ${s.label}${uncertain ? " (uncertain — manual review)" : ""}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot} ${band === "red" ? "animate-pulse" : ""}`} />
      <span>{Math.round(score)}</span>
      {arrow && <span className="text-[10px] leading-none">{arrow}</span>}
      {uncertain && <span className="text-[10px] leading-none" title="Uncertain — Manual Review Required">?</span>}
      {size === "md" && <span className="font-medium opacity-75">{s.label}</span>}
    </span>
  );
}

/** Sparkline for the assessment trend (pure SVG). */
export function RiskSparkline({ points, w = 120, h = 32 }: { points: number[]; w?: number; h?: number }) {
  if (points.length < 2) return <div className="h-8 w-[120px] rounded bg-black/5 dark:bg-white/5" />;
  const max = Math.max(...points, 100);
  const min = 0;
  const step = w / (points.length - 1);
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const lastBand = bandOfScore(points[points.length - 1]);
  const stroke = lastBand === "red" ? "#f43f5e" : lastBand === "yellow" ? "#f59e0b" : "#10b981";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={y(points[points.length - 1])} r="2.5" fill={stroke} />
    </svg>
  );
}
