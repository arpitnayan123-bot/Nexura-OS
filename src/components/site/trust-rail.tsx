/* ============================================================
 * NEXURA LINEN — TRUST RAIL
 * The audit-log anatomy from the 21st.dev research (rail →
 * icon circle → title + description → outline chips), applied
 * to Nexura's regulatory posture. Wording mirrors the
 * Compliance page exactly: "alignment tracked", never
 * self-certified "compliant" (loop-23 honesty rules).
 * ============================================================ */

import Link from "next/link";
import {
  ArrowRight,
  FileCheck2,
  Fingerprint,
  Landmark,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./ambient";

type TrustRow = {
  icon: LucideIcon;
  title: string;
  desc: string;
  chips: string[];
  meta: string;
  accent: string;
  accent2: string;
};

const ROWS: TrustRow[] = [
  {
    icon: Fingerprint,
    title: "DPDP 2023 — privacy by structure",
    desc: "Consent artifacts, purpose limitation and data-rights flows mapped across every product that touches patient data.",
    chips: ["alignment tracked", "since launch"],
    meta: "Digital Personal Data Protection Act",
    accent: "#0F766E",
    accent2: "#14B8A6",
  },
  {
    icon: FileCheck2,
    title: "ABDM milestone architecture",
    desc: "ABHA-linked record flows are designed to the ABDM milestone structure, with integration wording kept honest per surface.",
    chips: ["sandbox aligned", "ABHA-ready"],
    meta: "Ayushman Bharat Digital Mission",
    accent: "#A16207",
    accent2: "#C88A1F",
  },
  {
    icon: ShieldCheck,
    title: "CDSCO — drugs & cosmetics rules",
    desc: "Schedule H register, near-expiry returns and prescription guardrails follow the Drugs & Cosmetics Rules 1945 structure.",
    chips: ["Schedule H live", "e-register"],
    meta: "Central Drugs Standard Control Org.",
    accent: "#6D28D9",
    accent2: "#8B5CF6",
  },
  {
    icon: Landmark,
    title: "IRDAI · NABH · GST structures",
    desc: "Insurance claim shapes, NABH-aligned clinical workflows and GST e-invoice structure live in the typed data model.",
    chips: ["typed models", "145 tables"],
    meta: "Insurance & clinical governance",
    accent: "#B45309",
    accent2: "#D97706",
  },
];

export function TrustRail() {
  return (
    <section aria-label="Regulatory alignment" className="relative py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-xl">
              <p className="nx-micro">Trust, tracked in the open</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                Alignment you can audit.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5E5A52]">
                We don&apos;t self-certify compliance. We track alignment in
                the open and show our work — the same trail your team can
                verify on the Compliance page.
              </p>
            </div>
            <Link
              href="/compliance"
              className="group inline-flex items-center gap-1.5 rounded-full border border-[#E3DAD0] px-4 py-2 text-xs font-semibold text-[#2E2A26] transition-colors hover:bg-[#F4EFE4]"
            >
              See the full compliance trail
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>

        {/* Audit-log rail */}
        <div className="relative mt-8">
          {/* the vertical rail */}
          <div
            aria-hidden="true"
            className="absolute bottom-5 left-[1.4rem] top-5 w-px bg-[#EFE9E0] sm:left-[1.65rem]"
          />
          <ol className="space-y-3">
            {ROWS.map((row, i) => {
              const Icon = row.icon;
              return (
                <li key={row.title}>
                  <Reveal delay={0.06 * i}>
                    <div className="relative flex gap-4">
                      {/* icon circle riding the rail — glass disc, per-row neon hue */}
                      <span
                        className="relative z-10 mt-4 grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-white/70 shadow-sm backdrop-blur"
                        style={{
                          color: row.accent,
                          borderColor: `color-mix(in srgb, ${row.accent} 30%, transparent)`,
                          boxShadow: `0 0 14px -5px color-mix(in srgb, ${row.accent} 55%, transparent), inset 0 1px 1px color-mix(in srgb, white 70%, transparent)`,
                        }}
                        aria-hidden="true"
                      >
                        <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={2} />
                      </span>

                      <div
                        className="flex-1 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 sm:p-5"
                        style={{
                          background: "color-mix(in srgb, white 62%, transparent)",
                          backdropFilter: "blur(14px) saturate(140%)",
                          WebkitBackdropFilter: "blur(14px) saturate(140%)",
                          border: `1px solid color-mix(in srgb, ${row.accent} 16%, #EFE9E0 84%)`,
                          boxShadow: `inset 0 1px 0 color-mix(in srgb, white 65%, transparent), 0 6px 20px -12px color-mix(in srgb, ${row.accent} 26%, transparent)`,
                        }}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <h3
                            className="text-[0.95rem] font-semibold"
                            style={{
                              background: `linear-gradient(100deg, #2E2A26 30%, ${row.accent})`,
                              WebkitBackgroundClip: "text",
                              backgroundClip: "text",
                              color: "transparent",
                            }}
                          >
                            {row.title}
                          </h3>
                          <span className="text-xs text-[#8A8479]">{row.meta}</span>
                        </div>
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#5E5A52]">
                          {row.desc}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {row.chips.map((chip) => (
                            <span
                              key={chip}
                              className="inline-flex items-center rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em]"
                              style={{
                                color: `color-mix(in srgb, ${row.accent} 88%, black 12%)`,
                                background: `color-mix(in srgb, ${row.accent} 8%, white 92%)`,
                                border: `1px solid color-mix(in srgb, ${row.accent} 24%, transparent)`,
                              }}
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
