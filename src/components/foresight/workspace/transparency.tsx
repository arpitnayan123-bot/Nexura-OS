"use client";

/* ============================================================
 * MODEL & DATA TRANSPARENCY — the trust drawer.
 * Everything a skeptical reader (or a clinician) wants: which
 * engine, which rules, which calibration, when it ran, how
 * much of the profile it saw, how confidence is expressed, and
 * exactly where the method stops. Expandable, keyboard-safe.
 * ============================================================ */

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Cpu, Database } from "lucide-react";
import type { ForesightReport } from "@/modules/foresight/types";
import { mapConfidence } from "@/modules/foresight/workspace";
import { Ornament, fadeUp } from "../ui";
import { cn } from "@/lib/utils";

function Row({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-white/[0.06] py-2.5 last:border-0 sm:grid-cols-[210px_minmax(0,1fr)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] nxf-mute">{k}</p>
      <p className={cn("text-[13px] leading-relaxed nxf-body", mono && "nxf-mono text-[12px]")}>
        {v}
      </p>
    </div>
  );
}

export function TransparencyPanel({ report }: { report: ForesightReport }) {
  const [open, setOpen] = useState(false);
  const conf = mapConfidence(report);
  const generated = new Date(report.generatedAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <motion.section {...fadeUp} aria-labelledby="nxf-transparency-title">
      <Ornament label="Honest data · versioned engine" className="mb-5" />
      <div className="nxf-glass overflow-hidden rounded-3xl">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="nxf-transparency-body"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-white/[0.03] sm:p-6"
        >
          <span>
            <span className="flex items-center gap-2 text-[15px] font-semibold nxf-hi">
              <Cpu aria-hidden="true" className="h-4.5 w-4.5 nxf-gold" />
              Model &amp; data transparency
            </span>
            <span className="mt-1 block text-[12.5px] nxf-dim">
              Engine {report.engineVersion} · rules {report.rulesetVersion} · calibration{" "}
              {report.calibrationVersion} · ran {generated}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-5 w-5 shrink-0 nxf-gold transition-transform duration-300",
              open && "rotate-180",
            )}
          />
        </button>

        <div
          id="nxf-transparency-body"
          hidden={!open}
          className="border-t border-white/[0.08] px-5 pb-6 pt-2 sm:px-6"
        >
          <div className="grid gap-x-10 lg:grid-cols-2">
            <div>
              <Row
                k="Model"
                v="Health Foresight Engine — deterministic, explainable risk-signal scoring across twelve condition domains."
                mono={false}
              />
              <Row k="Engine version" v={report.engineVersion} mono />
              <Row
                k="Red-flag ruleset"
                v={`${report.rulesetVersion} — emergency + same-day triage runs first and can withhold analysis entirely.`}
                mono={false}
              />
              <Row
                k="Calibration"
                v={`${report.calibrationVersion} — South-Asian thresholds: BMI 23/25/27.5, IDF waist 90/80 cm, ICMR haemoglobin, mg/dL glucose.`}
                mono={false}
              />
              <Row k="Run timestamp" v={generated} mono />
              <Row
                k="Data freshness"
                v="This map was computed from the answers you shared minutes before the run timestamp. Nothing streams in behind your back."
                mono={false}
              />
            </div>
            <div>
              <Row
                k="Input coverage"
                v={`${report.completeness.answered}/${report.completeness.total} critical fields (${report.completeness.pct}%).`}
                mono={false}
              />
              {report.completeness.missing.length > 0 && (
                <Row
                  k="Not shared yet"
                  v={
                    report.completeness.missing.join(", ") +
                    " — sharing these at the next check-in narrows the uncertainty band."
                  }
                  mono={false}
                />
              )}
              <Row
                k="Confidence methodology"
                v={`${conf.category.replaceAll("_", " ").toLowerCase()} for the leading domain. Confidence is always a category (insufficient → higher within screening scope), never a fabricated percentage.`}
                mono={false}
              />
              <Row
                k="Forecast horizon"
                v="Illustrative curves to +5 years, derived from this run's own trajectory endpoints. The uncertainty envelope widens with horizon and with missing coverage — it is a picture of honesty, not a confidence interval from survival analysis."
                mono={false}
              />
              <Row
                k="Known limitations"
                v="Signals, not diagnoses. Ordinal weights, not probabilities. No medication or pregnancy dosing logic. Lifestyle simulations cannot move lab-anchored burden. One snapshot in time — trends need repeated check-ins."
                mono={false}
              />
              <Row
                k="Data quality status"
                v={`${report.completeness.pct >= 70 ? "good" : report.completeness.pct >= 45 ? "usable with gaps" : "thin — treat directions as soft"}. ${conf.text}.`}
                mono={false}
              />
            </div>
          </div>

          <p className="mt-4 flex items-start gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-[12px] leading-relaxed nxf-mute">
            <Database aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 nxf-teal" />
            {report.disclaimer} In an emergency call {report.emergencyLine}. Mental health support:{" "}
            {report.mentalHealthLine} (free, 24×7).
          </p>
        </div>
      </div>
    </motion.section>
  );
}
