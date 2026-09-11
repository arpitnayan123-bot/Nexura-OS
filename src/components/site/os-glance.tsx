"use client";

/* ============================================================
 * OS AT A GLANCE — the honest proof band. Every number here is
 * read from the actual codebase inventory (registry, routes,
 * Prisma models, KYH tools, foresight engine facts). No
 * fabricated metrics: what you see is what ships.
 * ============================================================ */

import Link from "next/link";
import { ArrowRight, Boxes, Database, Network, Sparkles } from "lucide-react";
import { Reveal } from "./ambient";
import { AnimatedNumber } from "./animated-number";

const FACTS = [
  { icon: Boxes, value: 22, suffix: "", label: "Apps, one OS", href: "#products" },
  { icon: Network, value: 172, suffix: "", label: "API endpoints", href: null },
  { icon: Database, value: 145, suffix: "", label: "Typed data models", href: null },
  { icon: Sparkles, value: 15, suffix: "", label: "AI health tools", href: "/know-your-health" },
];

export function OsGlance() {
  return (
    <section id="os-glance" aria-label="Nexura OS at a glance" className="border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary/80">
                The whole picture
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Nexura OS at a glance
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                One operating system for Indian healthcare — every number below is
                the real shipped inventory, from the app registry to the foresight
                engine that maps twelve risk domains from 40 symptom patterns and
                130+ weighted factors.
              </p>
            </div>
            <Link
              href="/predictive"
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-4 py-2 text-xs font-semibold transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              See the foresight engine
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FACTS.map((f, i) => (
            <Reveal key={f.label} delay={0.08 * i}>
              <LinkOrDiv href={f.href}>
                <f.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="mt-3 font-display text-3xl font-bold text-gradient-warm">
                  <AnimatedNumber value={f.value} suffix={f.suffix} />
                </p>
                <p className="mt-1 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {f.label}
                </p>
              </LinkOrDiv>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LinkOrDiv({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (href && href.startsWith("/")) {
    return (
      <Link
        href={href}
        className="glass-premium block h-full rounded-[1.5rem] p-5 transition-transform hover:-translate-y-0.5"
      >
        {children}
      </Link>
    );
  }
  return <div className="glass-premium h-full rounded-[1.5rem] p-5">{children}</div>;
}
