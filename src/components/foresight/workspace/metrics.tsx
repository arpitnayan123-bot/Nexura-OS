"use client";

/* ============================================================
 * EXECUTIVE STRIP + KEY PREDICTIVE METRICS
 *
 * The strip answers the five questions that matter at a glance:
 * where you stand, where you're heading, how confident the map
 * is, how much risk is loaded, and what happens next.
 *
 * The metric cards below carry the six primary numbers — each
 * with value, unit, comparison (non-color trend glyphs + words),
 * context line and a sparkline where real history exists.
 * ============================================================ */

import { motion } from "framer-motion";
import { CalendarClock, Gauge, Minus, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import type { ExecStrip, MetricCard } from "@/modules/foresight/workspace";
import { GlassCard, fadeUp } from "../ui";
import { cn } from "@/lib/utils";

/* ---------------- sparkline (real series only) ---------------- */

export function Sparkline({
  data,
  ink = "gold",
  w = 120,
  h = 34,
}: {
  data: number[];
  ink?: "gold" | "teal" | "rose";
  w?: number;
  h?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(1, max - min);
  const pad = 4;
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - pad * 2);
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const stroke = ink === "teal" ? "#2DD4BF" : ink === "rose" ? "#FB7185" : "#FCD34D";
  const last = data[data.length - 1];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx={x(data.length - 1)} cy={y(last)} r="3" fill={stroke} />
    </svg>
  );
}

function TrendGlyph({ trend }: { trend: "up" | "down" | "flat" }) {
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "h-4 w-4 shrink-0",
        trend === "up" ? "nxf-teal" : trend === "down" ? "text-rose-300" : "nxf-mute",
      )}
    />
  );
}

/* ---------------- executive strip ---------------- */

export function ExecStripView({ exec }: { exec: ExecStrip }) {
  const tiles = [
    {
      key: "standing",
      icon: Gauge,
      label: "Standing today",
      value: `${exec.scoreNow}`,
      sub: `${exec.band.toLowerCase()} · foresight score /100`,
      ink: "nxf-hi",
    },
    {
      key: "direction",
      icon:
        exec.direction.kind === "down"
          ? TrendingDown
          : exec.direction.kind === "up"
            ? TrendingUp
            : Minus,
      label: "Forecast direction",
      value:
        exec.direction.delta > 0
          ? `+${exec.direction.delta}`
          : exec.direction.delta < 0
            ? `${exec.direction.delta}`
            : "±0",
      sub: exec.direction.label,
      ink:
        exec.direction.kind === "down"
          ? "text-rose-300"
          : exec.direction.kind === "up"
            ? "nxf-teal"
            : "nxf-hi",
    },
    {
      key: "confidence",
      icon: Gauge,
      label: "Forecast confidence",
      value: exec.confidenceValue,
      sub: `${exec.confidenceText} · category, never a fake percent`,
      ink: "nxf-hi",
    },
    {
      key: "risk",
      icon: ShieldAlert,
      label: "Risk status",
      value: exec.risk.count === 0 ? "clear" : `${exec.risk.count}`,
      sub:
        exec.risk.count === 0 ? "no elevated domains" : `elevated+ · led by ${exec.risk.topLabel}`,
      ink: exec.risk.count === 0 ? "nxf-teal" : "nxf-amber",
    },
    {
      key: "next",
      icon: CalendarClock,
      label: "Next significant event",
      value: exec.nextEvent?.horizon ?? "—",
      sub: exec.nextEvent
        ? `${exec.nextEvent.title} · ${exec.nextEvent.when}`
        : "no milestones pending",
      ink: "nxf-hi",
    },
  ];

  return (
    <GlassCard className="overflow-hidden p-0" hover={false} {...fadeUp}>
      <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.07] lg:grid-cols-5 lg:divide-y-0">
        {tiles.map((t, i) => (
          <motion.div
            key={t.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="min-w-0 p-4 sm:p-5"
          >
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] nxf-mute">
              <t.icon aria-hidden="true" className="h-3.5 w-3.5 nxf-gold" />
              {t.label}
            </p>
            <p
              className={cn(
                "mt-1.5 truncate font-display text-2xl font-semibold tracking-tight sm:text-[1.7rem]",
                t.ink,
              )}
            >
              {t.value}
            </p>
            <p className="mt-1 truncate text-[11.5px] leading-snug nxf-mute" title={t.sub}>
              {t.sub}
            </p>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

/* ---------------- metric cards ---------------- */

export function MetricCards({ cards }: { cards: MetricCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.key}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: (i % 3) * 0.07 }}
          className="nxf-glass nxf-glass-hover rounded-2xl p-4"
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] nxf-mute">
            {c.label}
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="flex items-baseline gap-1.5">
              <span className="font-display text-[2rem] font-semibold leading-none tracking-tight nxf-hi">
                {c.value}
              </span>
              {c.unit ? <span className="text-[12px] nxf-mute">{c.unit}</span> : null}
            </p>
            {c.spark ? <Sparkline data={c.spark} ink={c.sparkInk} w={92} h={28} /> : null}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold">
            <TrendGlyph trend={c.trend} />
            <span
              className={cn(
                c.trend === "up" ? "nxf-teal" : c.trend === "down" ? "text-rose-300" : "nxf-dim",
              )}
            >
              {c.trendText}
            </span>
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed nxf-mute">{c.context}</p>
        </motion.div>
      ))}
    </div>
  );
}
