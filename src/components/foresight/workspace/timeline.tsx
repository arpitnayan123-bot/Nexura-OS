"use client";

/* ============================================================
 * FORECAST TIMELINE — upcoming milestones worth calendarizing.
 * Screening cadence from the plan, the 8-12-week rescan
 * ritual, and the engine trajectory's band crossings (always
 * labelled illustrative). Scannable, connected, honest.
 * ============================================================ */

import { motion } from "framer-motion";
import { Activity, CalendarClock, Stethoscope, TrendingDown } from "lucide-react";
import type { Milestone } from "@/modules/foresight/workspace";
import { SectionHead, fadeUp } from "../ui";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<
  Milestone["kind"],
  { icon: typeof Activity; rail: string; dot: string; label: string }
> = {
  screening: {
    icon: Stethoscope,
    rail: "border-violet-300/30",
    dot: "border-violet-300/60 bg-violet-300/15 text-violet-200",
    label: "screening",
  },
  rescan: {
    icon: Activity,
    rail: "border-teal-300/30",
    dot: "border-teal-300/60 bg-teal-300/15 text-teal-200",
    label: "re-scan",
  },
  threshold: {
    icon: TrendingDown,
    rail: "border-amber-300/30",
    dot: "border-amber-300/60 bg-amber-300/15 text-amber-200",
    label: "projection",
  },
  protective: {
    icon: CalendarClock,
    rail: "border-emerald-300/30",
    dot: "border-emerald-300/60 bg-emerald-300/15 text-emerald-200",
    label: "protective",
  },
};

export function TimelinePanel({ milestones }: { milestones: Milestone[] }) {
  return (
    <motion.section {...fadeUp} aria-labelledby="nxf-timeline-title">
      <SectionHead
        eyebrow="Forecast timeline"
        title="What happens next, and when"
        sub="Screening worth calendarizing, the re-scan ritual, and where the current course crosses a band edge — each item carries its own certainty."
      />
      {milestones.length === 0 ? (
        <div className="nxf-glass rounded-3xl p-8 text-center">
          <CalendarClock aria-hidden="true" className="mx-auto h-8 w-8 nxf-mute" />
          <p className="mt-2 text-[15px] font-semibold nxf-hi">No milestones pending</p>
          <p className="mt-1 text-[13px] nxf-dim">Run a fresh check-in to rebuild your timeline.</p>
        </div>
      ) : (
        <ol
          className="nxf-glass relative space-y-0 rounded-3xl p-5 sm:p-6"
          aria-label="Upcoming milestones"
        >
          {milestones.map((m, i) => {
            const style = KIND_STYLE[m.kind];
            const Icon = style.icon;
            const last = i === milestones.length - 1;
            return (
              <motion.li
                key={m.key}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="relative grid grid-cols-[34px_minmax(0,1fr)] gap-x-3.5 pb-5 last:pb-0 sm:grid-cols-[34px_112px_minmax(0,1fr)]"
              >
                {/* rail + dot */}
                <div className="relative flex flex-col items-center">
                  <span
                    className={cn(
                      "z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border",
                      style.dot,
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  {!last && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-8 bottom-0 w-px border-l border-dashed",
                        style.rail,
                      )}
                    />
                  )}
                </div>

                {/* when */}
                <div className="pt-1 max-sm:row-start-1 max-sm:col-start-2 sm:pt-0.5">
                  <p className="nxf-mono text-[11.5px] font-bold nxf-gold">{m.horizon}</p>
                  <p className="text-[11px] nxf-mute">{m.when}</p>
                </div>

                {/* what */}
                <div className="mt-1.5 sm:mt-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-semibold leading-snug nxf-hi">
                    {m.title}
                    <span
                      className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
                        m.certainty === "illustrative"
                          ? "border-amber-300/40 text-amber-200"
                          : "border-teal-300/40 text-teal-200",
                      )}
                    >
                      {m.certainty}
                    </span>
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed nxf-dim">{m.detail}</p>
                  <p className="mt-1 text-[10.5px] uppercase tracking-[0.12em] nxf-mute">
                    {style.label}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </motion.section>
  );
}
