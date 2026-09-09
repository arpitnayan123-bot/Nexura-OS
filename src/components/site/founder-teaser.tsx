"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

/* ============================================================
   FOUNDER TEASER — Compact premium section on homepage
   that links to the full /founder experience.
   ============================================================ */

export function FounderTeaser() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative bg-[#08080A] overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full" style={{ background: "radial-gradient(circle, #C8A55B08 0%, transparent 70%)" }} />
      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(#EDE8DE 1px, transparent 1px), linear-gradient(90deg, #EDE8DE 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
        >
          {/* Eyebrow */}
          <p className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.3em] mb-4" style={{ color: "#C8A55Bcc" }}>
            The Founder
          </p>

          {/* Headline */}
          <h2 className="font-display text-center text-2xl sm:text-3xl lg:text-4xl font-semibold leading-[1.2] tracking-tight mb-3" style={{ color: "#EDE8DE" }}>
            Meet the person building
            <br />
            the healthcare <span style={{ color: "#C8A55B" }}>operating system.</span>
          </h2>

          {/* Sub */}
          <p className="text-center text-sm sm:text-base mb-10" style={{ color: "rgba(237,232,222,0.5)" }}>
            A student from Bihar. Three months in hospital corridors. One decision that changed everything.
          </p>

          {/* Split layout: portrait + story teaser */}
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-center">
            {/* Portrait */}
            <div className="lg:col-span-2 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-6 rounded-full" style={{ background: "radial-gradient(circle, #C8A55B12 0%, transparent 70%)" }} />
                <div className="relative overflow-hidden rounded-2xl" style={{ width: "clamp(180px, 30vw, 260px)", height: "clamp(240px, 40vw, 340px)" }}>
                  <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to bottom, transparent 50%, #08080A 100%), linear-gradient(to right, #08080A 0%, transparent 12%, transparent 88%, #08080A 100%)" }}
                  />
                  <img
                    src="/founder-arpit-white-warm.jpg"
                    alt="Arpit Nayan — Founder & CEO, Nexura OS"
                    className="h-full w-full object-cover"
                    style={{ filter: "brightness(0.85) contrast(1.05)" }}
                  />
                </div>
              </div>
            </div>

            {/* Story + CTA */}
            <div className="lg:col-span-3 space-y-5">
              {/* Name */}
              <div>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: "#EDE8DE" }}>
                  Arpit Nayan
                </h3>
                <p className="text-sm sm:text-base" style={{ color: "#C8A55Bcc" }}>Founder & CEO · Nexura OS</p>
                <p className="text-xs sm:text-sm mt-1" style={{ color: "rgba(237,232,222,0.4)" }}>
                  Bihar, India · Student · Self-taught Builder · 7 products built
                </p>
              </div>

              {/* Pull quote */}
              <p className="font-display text-base sm:text-lg italic leading-relaxed" style={{ color: "rgba(237,232,222,0.8)" }}>
                "I walked into a hospital in Bihar and saw a system failing — not because people
                didn't care, but because the tools were from another century."
              </p>

              {/* Belief line */}
              <p className="text-sm leading-relaxed" style={{ color: "rgba(237,232,222,0.5)" }}>
                So he decided to build an operating system — not another app, but the connective
                tissue between every hospital, clinic, pharmacy, patient, and doctor in India.
              </p>

              {/* CTA */}
              <a
                href="/founder"
                className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold transition-all hover:scale-105"
                style={{ background: "#EDE8DE", color: "#08080A" }}
              >
                Read the full story <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-12 pt-8 border-t flex items-center justify-center gap-8 sm:gap-12" style={{ borderColor: "rgba(237,232,222,0.06)" }}>
            <div className="text-center">
              <div className="font-display text-2xl sm:text-3xl font-bold" style={{ color: "#C8A55B" }}>7</div>
              <p className="text-[0.6rem] uppercase tracking-wider mt-0.5" style={{ color: "rgba(237,232,222,0.4)" }}>Products built</p>
            </div>
            <div className="text-center">
              <div className="font-display text-2xl sm:text-3xl font-bold" style={{ color: "#C8A55B" }}>1.4B</div>
              <p className="text-[0.6rem] uppercase tracking-wider mt-0.5" style={{ color: "rgba(237,232,222,0.4)" }}>Building for</p>
            </div>
            <div className="text-center">
              <div className="font-display text-2xl sm:text-3xl font-bold" style={{ color: "#C8A55B" }}>1</div>
              <p className="text-[0.6rem] uppercase tracking-wider mt-0.5" style={{ color: "rgba(237,232,222,0.4)" }}>Ecosystem</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
