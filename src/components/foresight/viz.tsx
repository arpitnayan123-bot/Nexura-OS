"use client";

/* ============================================================
 * FORESIGHT VIZ — Health Halo + Trajectory
 *
 * The Halo is the signature view: a 12-axis radial map where
 * each axis is a condition domain. A glowing polygon expands
 * toward domains carrying more risk-burden — the shape IS the
 * diagnosis-free story. Center: the Foresight Score.
 *
 * INTERACTIVE: vertices and labels are clickable (domain
 * drill-down), the polygon morphs smoothly when the What-if
 * studio replays the engine, and the score counts up.
 * ============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
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

/* ---------------- motion helpers ---------------- */

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Tweens an array of numbers toward `target` with rAF + easeOutCubic.
    First render counts up from zeros; later changes morph from the
    currently displayed values (the halo "breathes" between states). */
function useTweenedArray(target: number[], duration = 800): number[] {
  const [display, setDisplay] = useState<number[]>(() => target.map(() => 0));
  const fromRef = useRef<number[]>(target.map(() => 0));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    /* every setState is deferred into a frame callback — never
       synchronous inside the effect body (react-hooks rule) */
    const jump = () => {
      fromRef.current = target;
      rafRef.current = requestAnimationFrame(() => {
        if (!cancelled) setDisplay(target);
      });
    };
    const from = fromRef.current;
    if (from.length !== target.length || prefersReducedMotion()) {
      jump();
      return () => {
        cancelled = true;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
    if (from.every((v, i) => v === target[i])) return;

    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const next = target.map((v, i) => from[i] + (v - from[i]) * e);
      fromRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setDisplay(target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

/* ---------------- Health Halo ---------------- */

export function HealthHalo({
  domains, score, band, size = 460, onSelectDomain, activeId, live = false,
}: {
  domains: DomainResult[];
  score: number;
  band: string;
  size?: number;
  /** present => vertices/labels clickable for drill-down */
  onSelectDomain?: (id: DomainId) => void;
  activeId?: DomainId | null;
  /** true while a What-if simulation drives this halo */
  live?: boolean;
}) {
  const n = domains.length || 12;
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.36;
  const rMin = size * 0.13;
  const [hovered, setHovered] = useState<number | null>(null);

  const burdens = useMemo(() => domains.map((d) => d.burden), [domains]);
  const tweened = useTweenedArray(burdens);
  const scoreTarget = useMemo(() => [score], [score]);
  const scoreTween = useTweenedArray(scoreTarget);
  const displayScore = Math.round(scoreTween[0] ?? score);

  // Axis order: keep stable engine order for recognisability.
  const pt = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
  };

  const polyPoints = domains.map((_, i) => {
    const burden = tweened[i] ?? 0;
    const radius = rMin + (rMax - rMin) * Math.min(1, burden / 78);
    return pt(i, radius);
  });
  const polyStr = polyPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const rings = [0.25, 0.5, 0.75, 1];
  const bandInk = LEVEL_COLOR[domains.some((d) => d.level === "HIGH") ? "HIGH" : "LOW"];
  const interactive = typeof onSelectDomain === "function";

  const tooltip = hovered != null ? domains[hovered] : null;
  const [tx, ty] = hovered != null ? pt(hovered, rMax + 2) : [0, 0];

  return (
    <div className="relative mx-auto" style={{ width: size, maxWidth: "100%" }}>
      <svg
        /* viewBox is padded so long edge labels ("Haemoglobin",
           "Blood Pressure") never clip at smaller halo sizes */
        viewBox={`${-size * 0.075} ${-size * 0.02} ${size * 1.15} ${size * 1.04}`}
        width={size}
        height={size}
        className="mx-auto block max-w-full"
        role="img"
        aria-label={`Health Halo: foresight score ${score} of 100, band ${band}${live ? ", showing a live simulation" : ""}`}
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
          const r = rMin + (rMax - rMin) * k;
          return (
            <circle key={ri} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          );
        })}
        {/* axes */}
        {domains.map((_, i) => {
          const [x, y] = pt(i, rMax + 8);
          const [xg, yg] = pt(i, rMin - 6);
          return <line key={i} x1={xg} y1={yg} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
        })}

        {/* observatory orbit — faint dotted satellite ring, slowly
            rotating behind the polygon for depth */}
        <circle
          className="nxf-orbit"
          cx={cx} cy={cy}
          r={rMax + 13}
          fill="none"
          stroke="rgba(255,255,255,0.13)"
          strokeWidth="1"
          strokeDasharray="2 9"
          strokeLinecap="round"
        />

        {/* the polygon — the story (morphs with the studio) */}
        <motion.polygon
          points={polyStr}
          fill="url(#haloFill)"
          stroke="url(#haloStroke)"
          strokeWidth="2"
          className="nxf-halo-poly"
          filter="url(#haloGlow)"
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1, stroke: live ? "#FCD34D" : undefined }}
          transition={{ duration: 1.5, ease: [0.2, 0.7, 0.2, 1], delay: 0.25 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* vertex dots — clickable, morph with the tween */}
        {polyPoints.map(([x, y], i) => {
          const d = domains[i];
          if (!d) return null;
          const isActive = activeId === d.id;
          const isHover = hovered === i;
          return (
            <g
              key={d.id}
              onClick={interactive ? () => onSelectDomain?.(d.id) : undefined}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${DOMAIN_META[d.id]?.label ?? d.id}: ${d.level.toLowerCase()} signal, burden ${d.burden} of 100 — open details` : undefined}
              onKeyDown={interactive ? (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectDomain?.(d.id); }
              } : undefined}
              style={{ cursor: interactive ? "pointer" : "default" }}
            >
              {/* generous hit area */}
              <circle cx={x} cy={y} r="16" fill="transparent" />
              <motion.circle
                cx={x} cy={y}
                r={d.level === "LOW" ? 3.4 : 5}
                fill={LEVEL_COLOR[d.level]}
                stroke={isActive ? "#FCD34D" : "rgba(7,13,26,0.9)"}
                strokeWidth={isActive ? 2.5 : 1.5}
                animate={{ scale: isHover || isActive ? 1.6 : 1 }}
                transition={{ duration: 0.18 }}
                style={{ transformOrigin: `${x}px ${y}px` }}
              />
            </g>
          );
        })}

        {/* axis labels — clickable too */}
        {domains.map((d, i) => {
          const [x, y] = pt(i, rMax + 30);
          const isActive = activeId === d.id;
          return (
            <text
              key={i}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.028}
              fill={isActive ? "#FCD34D" : d.level === "LOW" ? "#D8D2C0" : LEVEL_COLOR[d.level]}
              onClick={interactive ? () => onSelectDomain?.(d.id) : undefined}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              style={{
                fontWeight: 600,
                letterSpacing: "0.04em",
                cursor: interactive ? "pointer" : "default",
                textDecoration: isActive ? "underline" : "none",
                textUnderlineOffset: 3,
              }}
            >
              {DOMAIN_META[d.id]?.label ?? d.id}
            </text>
          );
        })}

        {/* hover tooltip */}
        {tooltip && (
          <g pointerEvents="none">
            {(() => {
              const label = DOMAIN_META[tooltip.id]?.label ?? tooltip.id;
              const tw = Math.max(label.length, 16) * 7.2 + 34;
              const fx = Math.min(Math.max(tx - tw / 2, 6), size - tw - 6);
              const fy = ty > cy ? ty - 58 : ty + 22;
              return (
                <>
                  <rect x={fx} y={fy} rx="9" width={tw} height={36}
                    fill="rgba(7,13,26,0.92)" stroke="rgba(252,211,77,0.5)" strokeWidth="1" />
                  <text x={fx + 12} y={fy + 15} fontSize="11.5" fontWeight="700" fill="#FFFEFA">
                    {label}
                  </text>
                  <text x={fx + 12} y={fy + 28} fontSize="10" fill="#DED9CA">
                    {tooltip.level.toLowerCase()} · burden {Math.round(tweened[hovered ?? 0] ?? tooltip.burden)}/100
                  </text>
                </>
              );
            })()}
          </g>
        )}

        {/* center score — counts up, drifts with the simulation */}
        <text
          x={cx} y={cy - 8}
          textAnchor="middle"
          fontSize={size * 0.13}
          fontWeight="700"
          fill={live ? "#FDE68A" : "#FFFEFA"}
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          {displayScore}
        </text>
        <text
          x={cx} y={cy + 18}
          textAnchor="middle"
          fontSize={size * 0.026}
          fill={live ? "#FDE68A" : "#FDE68A"}
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
