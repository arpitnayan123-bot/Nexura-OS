"use client";

/* ============================================================
 * WHAT THIS MEANS — the plain-language analysis summary.
 * Every line is composed deterministically from the report
 * (no unexplained AI text): what changed, why, the direction,
 * what to keep, and how much to trust the read.
 * ============================================================ */

import { motion } from "framer-motion";
import { Eye, Gauge, History, ShieldCheck, Target, TrendingUp } from "lucide-react";
import type { Insight } from "@/modules/foresight/workspace";
import { GlassCard, SectionHead, fadeUp } from "../ui";
import { cn } from "@/lib/utils";

const KIND_META: Record<Insight["kind"], { chip: string; icon: typeof History; ring: string }> = {
  change: { chip: "What changed", icon: History, ring: "border-l-amber-300/60" },
  driver: { chip: "Why", icon: Target, ring: "border-l-rose-300/60" },
  trend: { chip: "Direction", icon: TrendingUp, ring: "border-l-teal-300/60" },
  monitor: { chip: "Keep", icon: ShieldCheck, ring: "border-l-emerald-300/60" },
  confidence: { chip: "Confidence", icon: Gauge, ring: "border-l-violet-300/60" },
};

export function WhatThisMeans({
  insights,
  watchList,
  coverageNote,
}: {
  insights: Insight[];
  watchList: string[];
  coverageNote: string;
}) {
  return (
    <motion.section {...fadeUp} aria-labelledby="nxf-why-title">
      <SectionHead
        eyebrow="What this means"
        title="The read, in plain language"
        sub="Every statement below points at a number on this page — nothing is generated without a receipt."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {insights.map((ins, i) => {
            const meta = KIND_META[ins.kind];
            const Icon = meta.icon;
            return (
              <motion.article
                key={ins.key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={cn("nxf-glass rounded-2xl border-l-2 p-4 sm:p-5", meta.ring)}
              >
                <p className="flex flex-wrap items-center gap-2">
                  <Icon aria-hidden="true" className="h-4 w-4 nxf-gold" />
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] nxf-mute">
                    {meta.chip}
                  </span>
                  <span className="text-[14.5px] font-semibold nxf-hi">{ins.title}</span>
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed nxf-body">{ins.body}</p>
              </motion.article>
            );
          })}
        </div>

        <GlassCard className="h-fit p-5" hover={false}>
          <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] nxf-teal">
            <Eye aria-hidden="true" className="h-4 w-4" /> Monitor until the next check-in
          </p>
          <ul className="mt-3 space-y-2.5">
            {watchList.length > 0 ? (
              watchList.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed nxf-body">
                  <span
                    aria-hidden="true"
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300"
                  />
                  {w}
                </li>
              ))
            ) : (
              <li className="text-[13px] nxf-dim">
                Nothing elevated to watch — keep the protective patterns running and re-check in
                after any big life change.
              </li>
            )}
          </ul>
          <p className="mt-4 border-t border-white/[0.08] pt-3 text-[11.5px] leading-relaxed nxf-mute">
            {coverageNote}
          </p>
        </GlassCard>
      </div>
    </motion.section>
  );
}
