"use client";

import { Reveal } from "./ambient";

const PARTNERS = [
  "Mayo Clinic",
  "Cleveland Health",
  "Karolinska",
  "Singapore General",
  "Charité Berlin",
  "Mount Sinai",
  "Johns Hopkins",
  "King's College",
];

export function TrustBar() {
  // duplicate the list so the marquee loops seamlessly
  const loop = [...PARTNERS, ...PARTNERS];

  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-card/40 py-7">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Trusted by leading care institutions
          </p>
        </Reveal>
      </div>

      {/* marquee */}
      <div className="relative overflow-hidden">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
        <div className="marquee-track gap-12 px-6">
          {loop.map((p, i) => (
            <span
              key={`${p}-${i}`}
              className="flex items-center gap-3 whitespace-nowrap font-display text-base font-medium text-foreground/50 transition-colors hover:text-foreground"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/50 text-[0.6rem] font-bold text-foreground">
                {p
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
