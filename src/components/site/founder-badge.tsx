"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, Sparkles } from "lucide-react";

/* ============================================================
   FOUNDER STORY — premium homepage showpiece
   A full clickable story card wearing the Material Atelier:
   aurora gold ambience + clay depth + mineral CTA. Built to
   make the story irresistible to open → /founder
   ============================================================ */

const CREDS = [
  { icon: Sparkles, label: "13 products, one founder" },
  { icon: MapPin, label: "From Bihar, for the world" },
  { icon: BadgeCheck, label: "Physician-grade, founder-led" },
];

export function FounderBadge() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="relative overflow-hidden border-t border-border">
      {/* aurora ambience behind the card */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-x-0 top-8 bottom-8 opacity-60 anim-aurora [mask-image:radial-gradient(70%_70%_at_50%_50%,black,transparent)]"
          style={{
            background:
              "radial-gradient(at 14% 30%, color-mix(in srgb, #C88A1F 14%, transparent) 0%, transparent 46%), radial-gradient(at 86% 22%, color-mix(in srgb, #A16207 12%, transparent) 0%, transparent 44%), radial-gradient(at 74% 82%, color-mix(in srgb, #E0A93E 10%, transparent) 0%, transparent 44%), radial-gradient(at 22% 78%, color-mix(in srgb, #9F5B6B 8%, transparent) 0%, transparent 40%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="nx-micro mb-6 text-center"
        >
          The human behind the OS
        </motion.p>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
        >
          <Link
            href="/founder"
            aria-label="Read the Founder's story — Arpit Nayan, Founder & CEO of Nexura OS"
            className="group relative block rounded-[2rem] outline-none focus-visible:ring-2 focus-visible:ring-[#A16207]/50 focus-visible:ring-offset-4 focus-visible:ring-offset-[#FAF7F2]"
          >
            {/* claymorphic story card */}
            <div
              className="mat-card mat-card--clay relative overflow-hidden rounded-[2rem] transition-all duration-300 group-hover:-translate-y-1.5"
              style={{ "--mat-accent": "#A16207", "--mat-accent-2": "#C88A1F" } as React.CSSProperties}
            >
              {/* inner aurora wash — deepens on hover */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(at 12% 18%, color-mix(in srgb, #C88A1F 16%, transparent) 0%, transparent 42%), radial-gradient(at 88% 12%, color-mix(in srgb, #A16207 13%, transparent) 0%, transparent 40%), radial-gradient(at 80% 88%, color-mix(in srgb, #E0A93E 12%, transparent) 0%, transparent 42%), radial-gradient(at 16% 84%, color-mix(in srgb, #9F5B6B 9%, transparent) 0%, transparent 38%)",
                }}
              />
              {/* mineral grain */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-soft-light"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23g)'/%3E%3C/svg%3E\")",
                  backgroundSize: "140px 140px",
                }}
              />
              {/* top specular sheen */}
              <div aria-hidden className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

              <div className="relative flex flex-col items-center gap-8 p-8 sm:p-10 lg:flex-row lg:gap-12 lg:p-14">
                {/* portrait — layered gold rings + hover bloom */}
                <div className="relative shrink-0">
                  <div
                    aria-hidden
                    className="absolute -inset-4 rounded-full opacity-70 blur-xl transition-all duration-500 group-hover:-inset-6 group-hover:opacity-100"
                    style={{ background: "radial-gradient(circle, color-mix(in srgb, #C88A1F 45%, transparent), transparent 68%)" }}
                  />
                  <div aria-hidden className="absolute -inset-2.5 rounded-full border border-[#C8A55B]/40" />
                  <div aria-hidden className="absolute -inset-1 rounded-full border border-white/60" />
                  <img
                    src="/founder-arpit-circle-white.jpg"
                    alt="Arpit Nayan — Founder & CEO, Nexura OS"
                    loading="lazy"
                    className="relative h-32 w-32 rounded-full object-cover shadow-[0_18px_44px_-16px_rgba(146,106,14,0.55)] ring-2 ring-white/70 transition-transform duration-500 group-hover:scale-[1.04] sm:h-36 sm:w-36 lg:h-40 lg:w-40"
                  />
                  {/* floating credential chip on the portrait */}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#C8A55B]/35 bg-white/85 px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-[#8A5A04] shadow-[0_6px_18px_-6px_rgba(146,106,14,0.4)] backdrop-blur">
                    Founder &amp; CEO
                  </span>
                </div>

                {/* story content */}
                <div className="min-w-0 flex-1 text-center lg:text-left">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-[#A16207]">
                    Founder&rsquo;s Story
                  </p>
                  <h3 className="font-display mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Built by someone who{" "}
                    <span className="text-gold-gradient">walked the ward.</span>
                  </h3>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    Arpit Nayan · Founder &amp; CEO · Nexura OS
                  </p>

                  <blockquote className="relative mt-5 max-w-xl max-lg:mx-auto">
                    <span
                      aria-hidden
                      className="font-display pointer-events-none absolute -left-1 -top-5 select-none text-6xl leading-none text-[#C8A55B]/35 transition-colors duration-500 group-hover:text-[#C8A55B]/60"
                    >
                      &ldquo;
                    </span>
                    <p className="relative text-sm italic leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                      I walked into a hospital in Bihar and saw a system failing —
                      not because people didn&rsquo;t care, but because the tools were
                      from another century.
                    </p>
                  </blockquote>

                  {/* credibility chips */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                    {CREDS.map((c) => (
                      <span
                        key={c.label}
                        className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.65rem] font-medium text-foreground/85"
                      >
                        <c.icon className="h-3 w-3 text-[#A16207]" aria-hidden="true" />
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA — mineral-textured gold, full-height rail on desktop */}
                <div className="shrink-0 max-lg:w-full max-lg:text-center lg:self-stretch lg:border-l lg:border-[#C8A55B]/25 lg:pl-10">
                  <div className="flex flex-col items-center justify-center gap-3 lg:h-full">
                    <span
                      aria-hidden
                      className="mat-btn mat-btn--textured pointer-events-none transition-transform duration-300 group-hover:scale-[1.03]"
                      style={{ "--mat-accent": "#A16207", "--mat-accent-2": "#C88A1F" } as React.CSSProperties}
                    >
                      Read the story
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </span>
                    <span className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/50">
                      5 min read · the why behind Nexura
                    </span>
                  </div>
                </div>
              </div>

              {/* bottom gold hairline — draws on hover */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-[#A16207] via-[#C88A1F] to-[#E0A93E] transition-transform duration-700 ease-out group-hover:scale-x-100"
              />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
