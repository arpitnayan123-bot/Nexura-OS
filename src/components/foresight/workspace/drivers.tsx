"use client";

/* ============================================================
 * PREDICTIVE DRIVERS — ranked, merged, signed.
 * The strongest factors moving the forecast, with the domains
 * they load, their relative share, and direction stated in
 * words + glyphs (never color alone).
 * ============================================================ */

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Layers } from "lucide-react";
import type { DriverRow } from "@/modules/foresight/workspace";
import { SectionHead, fadeUp } from "../ui";
import { cn } from "@/lib/utils";

function DriverBar({ row }: { row: DriverRow }) {
  const risk = row.direction === "risk";
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.max(3, row.share)}%` }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        className={cn(
          "nxf-bar-fill h-full rounded-full bg-gradient-to-r",
          risk ? "from-amber-400 to-rose-400" : "from-emerald-400 to-teal-300",
        )}
      />
    </div>
  );
}

export function DriversPanel({ drivers, total }: { drivers: DriverRow[]; total: number }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? drivers : drivers.slice(0, 8);
  const riskCount = drivers.filter((d) => d.direction === "risk").length;

  return (
    <motion.section {...fadeUp} aria-labelledby="nxf-drivers-title">
      <SectionHead
        eyebrow="Primary drivers"
        title="What is moving the forecast — ranked"
        sub="Merged across domains: one real signal (a waist, a lab, a habit) often loads several scores. Weights are ordinal, not probabilities."
      />
      <div className="nxf-glass rounded-3xl p-4 sm:p-6">
        {drivers.length === 0 ? (
          <p className="text-[13px] nxf-dim">
            No weighted factors — share more at your next check-in for a driver read.
          </p>
        ) : (
          <ol className="space-y-3.5">
            {visible.map((d, i) => (
              <li
                key={d.key}
                className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[28px_minmax(0,1fr)_150px]"
              >
                <span className="nxf-mono hidden text-[11px] nxf-mute sm:block">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-semibold leading-snug nxf-hi">
                    {d.direction === "risk" ? (
                      <span className="flex items-center gap-1 text-amber-300">
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                        <span className="sr-only">adds burden</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 nxf-teal">
                        <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5" />
                        <span className="sr-only">protective</span>
                      </span>
                    )}
                    <span className="sm:hidden">{i + 1}. </span>
                    {d.label}
                    <span
                      className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em]",
                        d.direction === "risk"
                          ? "border-amber-300/40 text-amber-200"
                          : "border-emerald-300/40 text-emerald-200",
                      )}
                    >
                      {d.direction === "risk" ? "adds burden" : "protective"}
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] nxf-mute">
                    <Layers aria-hidden="true" className="h-3 w-3" />
                    {d.domains.map((dm) => dm.label).join(" · ")}
                    {d.extraDomains > 0 ? ` +${d.extraDomains} more` : ""}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="mb-1 flex items-center justify-between text-[10.5px] nxf-mute sm:justify-end sm:gap-2">
                    <span className="sm:hidden">
                      {d.direction === "risk" ? "weight" : "credit"}
                    </span>
                    <span className="nxf-mono">{d.share}%</span>
                  </div>
                  <DriverBar row={d} />
                </div>
              </li>
            ))}
          </ol>
        )}

        {total > visible.length && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/15 px-4 text-[12.5px] font-semibold nxf-body transition hover:border-amber-300/50 hover:text-amber-100"
          >
            Show all {total} drivers
          </button>
        )}
        {showAll && total > 8 && (
          <p className="mt-3 text-[11.5px] nxf-mute">
            Showing all {riskCount} burden-adding and {drivers.length - riskCount} protective
            signals the engine weighted on this run.
          </p>
        )}
      </div>
    </motion.section>
  );
}
