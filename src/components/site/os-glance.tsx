"use client";

/* ============================================================
 * OS AT A GLANCE — the honest proof band, in Nexura Linen.
 * Stats anatomy from the 21st.dev research pass:
 * label → big number → sage qualifier pill → hairline → baseline.
 * Every number is read from the actual codebase inventory
 * (registry, routes, Prisma models, KYH tools). Pills carry
 * honest qualifiers, never fabricated growth metrics.
 * ============================================================ */

import Link from "next/link";
import { ArrowRight, Boxes, Database, Network, Sparkles } from "lucide-react";
import { Reveal } from "./ambient";
import { AnimatedNumber } from "./animated-number";

const FACTS = [
  {
    icon: Boxes,
    value: 22,
    label: "Apps, one OS",
    pill: "one registry",
    baseline: "Every app ships from a single product registry",
    href: "#products",
  },
  {
    icon: Network,
    value: 172,
    label: "API endpoints",
    pill: "typed end-to-end",
    baseline: "Route handlers under /api — request to Prisma",
    href: null,
  },
  {
    icon: Database,
    value: 145,
    label: "Typed data models",
    pill: "live schema",
    baseline: "Generated from the shipped Prisma schema",
    href: null,
  },
  {
    icon: Sparkles,
    value: 15,
    label: "AI health tools",
    pill: "live now",
    baseline: "Try them in Know Your Health — no signup",
    href: "/know-your-health",
  },
];

export function OsGlance() {
  return (
    <section
      id="os-glance"
      aria-label="Nexura OS at a glance"
      className="border-t border-[#EFE9E0] bg-[#F4EFE4]/40"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="nx-micro">The whole picture</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-[#2E2A26] sm:text-3xl">
                Nexura OS at a glance
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[#5E5A52]">
                One operating system for Indian healthcare: every number below
                is the real shipped inventory, from the app registry to the
                foresight engine that maps twelve risk domains from 40 symptom
                patterns and 130+ weighted factors.
              </p>
            </div>
            <Link
              href="/predictive"
              className="group inline-flex items-center gap-1.5 rounded-full border border-[#E3DAD0] bg-white/60 px-4 py-2 text-xs font-semibold text-[#2E2A26] transition-colors hover:bg-[#F4EFE4]"
            >
              See the foresight engine
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FACTS.map((f, i) => (
            <Reveal key={f.label} delay={0.08 * i}>
              <LinkOrDiv href={f.href}>
                <div className="flex items-center gap-2">
                  <f.icon className="h-4 w-4 shrink-0 text-[#AC5335]" aria-hidden="true" />
                  <p className="nx-micro">{f.label}</p>
                </div>
                <p className="tabular mt-3 font-display text-[2.15rem] font-semibold leading-none text-[#2E2A26]">
                  <AnimatedNumber value={f.value} />
                </p>
                <span className="nx-pill-sage mt-2.5">{f.pill}</span>
                <div className="my-3 h-px bg-[#EFE9E0]" aria-hidden="true" />
                <p className="text-[0.7rem] leading-relaxed text-[#8A8479]">
                  {f.baseline}
                </p>
              </LinkOrDiv>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LinkOrDiv({
  href,
  children,
}: {
  href: string | null;
  children: React.ReactNode;
}) {
  if (href && href.startsWith("/")) {
    return (
      <Link
        href={href}
        className="nx-inset-glass block h-full rounded-[1.5rem] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-24px_rgba(46,42,38,0.25)]"
      >
        {children}
      </Link>
    );
  }
  return (
    <div className="nx-inset-glass h-full rounded-[1.5rem] p-5">{children}</div>
  );
}
