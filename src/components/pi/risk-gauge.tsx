"use client";

/* ============================================================
 * PIE UI — RiskGauge
 * Circular "Time-to-Decay" risk gauge. A neon ring fills to the
 * score with a smooth color ramp (cyan → amber → crimson) and a
 * soft glow. Numerals render in JetBrains Mono for precision.
 *
 * [PIE API] Score injects from RiskAssessment.score (0-100) —
 * server-side runRadar() on /predictive, or the clinician API in
 * the Hospital OS console. The gauge is presentational only.
 * ============================================================ */

import { useEffect, useState } from "react";

export type GaugeBand = "stable" | "watchlist" | "critical";

export function bandOf(score: number): GaugeBand {
  if (score <= 30) return "stable";
  if (score <= 70) return "watchlist";
  return "critical";
}

const BAND_COLOR: Record<GaugeBand, { ring: string; glow: string; text: string }> = {
  stable: { ring: "#06b6d4", glow: "rgba(6,182,212,0.55)", text: "text-cyan-300" },
  watchlist: { ring: "#f59e0b", glow: "rgba(245,158,11,0.55)", text: "text-amber-300" },
  critical: { ring: "#ef4444", glow: "rgba(239,68,68,0.6)", text: "text-red-400" },
};

const BAND_LABEL: Record<GaugeBand, string> = {
  stable: "STABLE",
  watchlist: "WATCHLIST",
  critical: "CRITICAL",
};

const SIZES = { sm: 56, md: 84, lg: 128 } as const;
const STROKE = { sm: 4, md: 6, lg: 8 } as const;

export function RiskGauge({
  score,
  size = "md",
  label,
  showBand = true,
}: {
  score: number;
  size?: keyof typeof SIZES;
  /** Small caption under the band label, e.g. "TIME-TO-DECAY" */
  label?: string;
  showBand?: boolean;
}) {
  const px = SIZES[size];
  const stroke = STROKE[size];
  const r = (px - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const band = bandOf(clamped);
  const color = BAND_COLOR[band];

  // Animate the ring fill from 0 to the target on mount.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const offset = ready ? c * (1 - clamped / 100) : c;
  const fontSize = size === "lg" ? 30 : size === "md" ? 20 : 14;

  return (
    <div
      className="inline-flex flex-col items-center gap-1"
      role="img"
      aria-label={`Time-to-Decay index ${Math.round(clamped)} of 100 — ${BAND_LABEL[band]}`}
    >
      <div className="relative" style={{ width: px, height: px }}>
        <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden="true" className="-rotate-90">
          {/* faint track */}
          <circle cx={px / 2} cy={px / 2} r={r} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth={stroke} />
          {/* neon fill */}
          <circle
            cx={px / 2}
            cy={px / 2}
            r={r}
            fill="none"
            stroke={color.ring}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1), stroke 0.6s",
              filter: `drop-shadow(0 0 5px ${color.glow})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono font-semibold leading-none tabular-nums ${color.text}`} style={{ fontSize }}>
            {Math.round(clamped)}
          </span>
        </div>
      </div>
      {(showBand || label) && (
        <div className="text-center leading-tight">
          {showBand && (
            <p className={`font-mono text-[10px] font-semibold tracking-[0.18em] ${color.text}`}>{BAND_LABEL[band]}</p>
          )}
          {label && <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>}
        </div>
      )}
    </div>
  );
}
