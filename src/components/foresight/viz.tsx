"use client";

/* ============================================================
 * FORESIGHT VIZ — Health Halo + Trajectory
 *
 * The Halo is the signature view: a 12-axis radial map where
 * each axis is a condition domain. A glowing polygon expands
 * toward domains carrying more risk-burden — the shape IS the
 * diagnosis-free story. Center: the Foresight Score.
 * ============================================================ */

import { motion } from "framer-motion";
import type { DomainId, DomainResult } from "@/modules/foresight/types";

export const DOMAIN_META: Record<DomainId, { label: string; glyph: string }> = {
  metabolic: { label: "Metabolic", glyph: "◉" },
  bp: { label: "Blood Pressure", glyph: "◐" },
  heart: { label: "Heart", glyph: "♥" },
  hemoglobin: { label: "Haemoglobin", glyph: "◈" },
  vitamin_d: { label: "Vitamin D", glyph: "☀" },
  b12: { label: "B12 · Nerve", glyph: "✦" },
  thyroid: { label: "Thyroid", glyph: "❋" },
  pcos: { label: "PCOS", glyph: "◍" },
  sleep: { label: "Sleep", glyph: "☾" },
  lungs: { label: "Lungs", glyph: "◌" },
  liver: { label: "Liver", glyph: "◇" },
  mind: { label: "Mind", glyph: "☯" },
};

const LEVEL_COLOR: Record<string, string> = {
  LOW: "#34D399",
  WATCH: "#FBBF24",
  ELEVATED: "#FB923C",
  HIGH: "#FB7185",
};

export function HealthHalo({
  domains, score, band, size = 460,
}: {
  domains: DomainResult[];
  score: number;
  band: string;
  size?: number;
}) {
  const n = domains.length || 12;
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.36;
  const rMin = size * 0.13;

  // Axis order: keep stable engine order for recognisability.
  const pt = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
  };

  const polyPoints = domains.map((d, i) => {
    const radius = rMin + (rMax - rMin) * Math.min(1, d.burden / 78);
    return pt(i, radius);
  });
  const polyStr = polyPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const rings = [0.25, 0.5, 0.75, 1];
  const bandInk = LEVEL_COLOR[domains.some((d) => d.level === "HIGH") ? "HIGH" : "LOW"];

  return (
    <div className="relative mx-auto" style={{ width: size, maxWidth: "100%" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="mx-auto block max-w-full"
        role="img"
        aria-label={`Health Halo: foresight score ${score} of 100, band ${band}`}
      >
        <defs>
          <radialGradient id="haloFill" cx="50%" cy="50%" r="66%">
            <stop offset="0%" stopColor="rgba(45,212,191,0.30)" />
            <stop offset="70%" stopColor="rgba(45,212,191,0.10)" />
            <stop offset="100%" stopColor="rgba(45,212,191,0.03)" />
          </radialGradient>
          <linearGradient id="haloStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <filter id="haloGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* rings */}
        {rings.map((k, ri) => {
          const [x0, y0] = pt(0, rMin + (rMax - rMin) * k);
          const r = rMin + (rMax - rMin) * k;
          return (
            <circle
              key={ri}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
          );
        })}
        {/* axes */}
        {domains.map((_, i) => {
          const [x, y] = pt(i, rMax + 8);
          const [xg, yg] = pt(i, rMin - 6);
          return (
            <g key={i}>
              <line x1={xg} y1={yg} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            </g>
          );
        })}

        {/* the polygon — the story */}
        <motion.polygon
          points={polyStr}
          fill="url(#haloFill)"
          stroke="url(#haloStroke)"
          strokeWidth="2"
          className="nxf-halo-poly"
          filter="url(#haloGlow)"
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.2, 0.7, 0.2, 1], delay: 0.25 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* vertex dots colored by level */}
        {polyPoints.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x} cy={y}
            r={domains[i]?.level === "LOW" ? 3.4 : 5}
            fill={LEVEL_COLOR[domains[i]?.level ?? "LOW"]}
            stroke="rgba(7,13,26,0.9)"
            strokeWidth="1.5"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + i * 0.05, duration: 0.4 }}
          />
        ))}

        {/* axis labels */}
        {domains.map((d, i) => {
          const [x, y] = pt(i, rMax + 30);
          return (
            <text
              key={i}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.028}
              fill={d.level === "LOW" ? "#D8D2C0" : LEVEL_COLOR[d.level]}
              style={{ fontWeight: 600, letterSpacing: "0.04em" }}
            >
              {DOMAIN_META[d.id]?.label ?? d.id}
            </text>
          );
        })}

        {/* center score */}
        <text
          x={cx} y={cy - 8}
          textAnchor="middle"
          fontSize={size * 0.13}
          fontWeight="700"
          fill="#FFFEFA"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          {score}
        </text>
        <text
          x={cx} y={cy + 18}
          textAnchor="middle"
          fontSize={size * 0.026}
          fill="#FDE68A"
          style={{ letterSpacing: "0.22em", textTransform: "uppercase" }}
        >
          {band}
        </text>
      </svg>
      <span aria-hidden="true" className="sr-only">{bandInk}</span>
    </div>
  );
}

/* ---------------- Trajectory ---------------- */

export function TrajectoryChart({
  unchangedScore, withActionsScore, currentScore, height = 190,
}: {
  unchangedScore: number;
  withActionsScore: number;
  currentScore: number;
  height?: number;
}) {
  const w = 640;
  const h = height;
  const padX = 44;
  const padY = 26;
  const years = [0, 1, 2, 3, 4, 5];
  const y = (v: number) => padY + (1 - v / 100) * (h - padY * 2);
  const x = (i: number) => padX + (i / 5) * (w - padX * 2);

  const path = (end: number) => {
    // Gentle, decelerating drift from current to end (illustrative).
    const drift = end - currentScore;
    return years
      .map((yr, i) => {
        const t = i / 5;
        const eased = 1 - Math.pow(1 - t, 1.8);
        const v = currentScore + drift * eased;
        return `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      })
      .join(" ");
  };

  const areaPath = (end: number) => `${path(end)} L${x(5)},${y(0)} L${x(0)},${y(0)} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img"
      aria-label={`Five-year illustrative trajectory: ${unchangedScore} if nothing changes, ${withActionsScore} with actions`}>
      <defs>
        <linearGradient id="trajRose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(251,113,133,0.22)" />
          <stop offset="100%" stopColor="rgba(251,113,133,0)" />
        </linearGradient>
        <linearGradient id="trajTeal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(45,212,191,0.25)" />
          <stop offset="100%" stopColor="rgba(45,212,191,0)" />
        </linearGradient>
      </defs>

      {/* gridlines */}
      {[25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={padX} y1={y(v)} x2={w - padX} y2={y(v)} stroke="rgba(255,255,255,0.05)" />
          <text x={padX - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#C0BAA9">{v}</text>
        </g>
      ))}
      {years.map((yr) => (
        <text key={yr} x={x(yr)} y={h - 6} textAnchor="middle" fontSize="10" fill="#C0BAA9">
          {yr === 0 ? "today" : `+${yr}y`}
        </text>
      ))}

      <path d={areaPath(unchangedScore)} fill="url(#trajRose)" />
      <motion.path
        d={path(unchangedScore)}
        fill="none" stroke="#FB7185" strokeWidth="2.2" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeOut", delay: 0.3 }}
      />
      <path d={areaPath(withActionsScore)} fill="url(#trajTeal)" />
      <motion.path
        d={path(withActionsScore)}
        fill="none" stroke="#2DD4BF" strokeWidth="2.2" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeOut", delay: 0.55 }}
      />
      <circle cx={x(0)} cy={y(currentScore)} r="4.5" fill="#F4F9FF" stroke="rgba(7,13,26,0.9)" strokeWidth="2" />
      <text x={x(5)} y={y(unchangedScore) - 10} textAnchor="end" fontSize="11" fontWeight="700" fill="#FDA4AF">{unchangedScore}</text>
      <text x={x(5)} y={y(withActionsScore) - 10} textAnchor="end" fontSize="11" fontWeight="700" fill="#5EEAD4">{withActionsScore}</text>
    </svg>
  );
}
