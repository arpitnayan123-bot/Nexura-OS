"use client";

/* ============================================================
 * RISK REGISTER — decision-oriented risk cards.
 * Severity in words + glyph count (never color alone),
 * evidence receipts, the single best mitigation, and the
 * screening worth discussing. Honest empty state when clear.
 * ============================================================ */

import { motion } from "framer-motion";
import { ShieldCheck, Stethoscope, TriangleAlert } from "lucide-react";
import type { RiskRow } from "@/modules/foresight/workspace";
import { SectionHead, fadeUp } from "../ui";
import { cn } from "@/lib/utils";

const SEVERITY_GLYPHS: Record<RiskRow["level"], { count: number; word: string; ink: string }> = {
  WATCH: { count: 1, word: "watch", ink: "text-amber-300" },
  ELEVATED: { count: 2, word: "elevated", ink: "text-orange-300" },
  HIGH: { count: 3, word: "high", ink: "text-rose-300" },
};

function SeverityGlyphs({ level }: { level: RiskRow["level"] }) {
  const meta = SEVERITY_GLYPHS[level];
  return (
    <span className="flex items-center gap-1.5" role="img" aria-label={`severity: ${meta.word}`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <TriangleAlert
            key={i}
            className={cn("h-3.5 w-3.5", i < meta.count ? meta.ink : "text-white/15")}
            fill={i < meta.count ? "currentColor" : "none"}
          />
        ))}
      </span>
      <span className={cn("text-[10.5px] font-bold uppercase tracking-[0.12em]", meta.ink)}>{meta.word}</span>
    </span>
  );
}

export function RisksPanel({ risks }: { risks: RiskRow[] }) {
  return (
    <motion.section {...fadeUp} aria-labelledby="nxf-risks-title">
      <SectionHead
        eyebrow="Risk register"
        title="What could bend the curve the wrong way"
        sub="Each row is a domain carrying signal burden — with the evidence behind it and the one move that helps most. Confidence stays a category; nothing here is a probability."
      />

      {risks.length === 0 ? (
        <div className="nxf-glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
          <ShieldCheck aria-hidden="true" className="h-8 w-8 nxf-teal" />
          <p className="text-[15px] font-semibold nxf-hi">No significant risks detected</p>
          <p className="max-w-md text-[13px] leading-relaxed nxf-dim">
            All twelve domains read steady on this run. Keep the protective patterns running and re-check in
            after 8–12 weeks or any major change.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {risks.map((r, i) => {
            return (
              <motion.article
                key={r.domainId}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 2) * 0.07 }}
                className="nxf-glass nxf-glass-hover flex flex-col rounded-2xl p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold nxf-hi">{r.label}</p>
                  <div className="flex items-center gap-2">
                    <SeverityGlyphs level={r.level} />
                  </div>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed nxf-body">{r.headline}</p>

                <div className="mt-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] nxf-mute">Evidence on this run</p>
                  <ul className="mt-1.5 space-y-1">
                    {r.evidence.map((e, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-[12.5px] leading-relaxed nxf-dim">
                        <span aria-hidden="true" className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", r.level === "HIGH" ? "bg-rose-300" : r.level === "ELEVATED" ? "bg-orange-300" : "bg-amber-300")} />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto space-y-2 pt-3">
                  {r.mitigation && (
                    <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-3">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] nxf-teal">Strongest mitigation</p>
                      <p className="mt-0.5 text-[12.5px] font-semibold text-teal-100">{r.mitigation}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] nxf-mute">
                    {r.screening ? (
                      <span className="flex items-center gap-1.5">
                        <Stethoscope aria-hidden="true" className="h-3.5 w-3.5 nxf-violet" />
                        discuss: <span className="nxf-dim">{r.screening}</span>
                      </span>
                    ) : <span />}
                    <span className="nxf-mono">burden {r.burden}/100</span>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
