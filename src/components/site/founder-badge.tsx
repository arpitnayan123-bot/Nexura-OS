"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* ============================================================
   FOUNDER SECTION — Compact premium section below products
   Circular photo + name + short quote + CTA → /founder
   ============================================================ */

export function FounderBadge() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="relative overflow-hidden border-t border-border bg-card/30">
      {/* Subtle warm glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(50%_100%_at_50%_0%,oklch(0.75_0.08_55/0.08),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8"
        >
          {/* Circular founder photo */}
          <div className="relative shrink-0">
            {/* Subtle ring glow */}
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-[#C8A55B]/25 to-[#D98B6E]/15 opacity-60 blur-[3px]" />
            <img
              src="/founder-arpit-circle-white.jpg"
              alt="Arpit Nayan — Founder & CEO, Nexura OS"
              loading="lazy"
              className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover ring-2 ring-[#C8A55B]/20"
            />
          </div>

          {/* Text */}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#C8A55B]/70 mb-1">
              Founder's Story
            </p>
            <h3 className="font-display text-lg sm:text-xl font-semibold tracking-tight text-foreground">
              Arpit Nayan
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Founder & CEO · Nexura OS · Bihar, India
            </p>
            <p className="mt-2 text-xs sm:text-sm italic text-muted-foreground/80 leading-relaxed max-w-md">
              "I walked into a hospital in Bihar and saw a system failing — not because people didn't care, but because the tools were from another century."
            </p>
          </div>

          {/* CTA */}
          <Link
            href="/founder"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-4 py-2 text-xs font-semibold text-foreground transition-all hover:border-[#C8A55B]/40 hover:bg-[#C8A55B]/5 hover:scale-105"
          >
            Read story <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
