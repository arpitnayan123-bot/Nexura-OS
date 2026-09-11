"use client";

/* ============================================================
 * NEXURA LINEN — AI STRIP
 * The homepage's single dark moment: a warm-espresso band where
 * the intelligence feels calm, not flashy. Thinking orb (pure
 * CSS, counter-rotating dotted rings) + border-beam prompt card.
 * Decorative motion is aria-hidden and fully disabled under
 * prefers-reduced-motion (loop-13 a11y preserved).
 * Facts on this strip are the real foresight-engine numbers
 * (twelve domains / forty patterns / 130+ factors) — no fiction.
 * ============================================================ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Reveal } from "./ambient";

const PROMPTS = [
  "Analyze my latest blood report…",
  "Is my blood pressure trending okay?",
  "What actually helps my sleep?",
  "Check these symptoms — should I worry?",
];

export function AiStrip() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [animate, setAnimate] = useState(false);

  // Respect prefers-reduced-motion: static placeholder, no cycling.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setAnimate(!mq.matches);
      if (mq.matches) setPromptIndex(0);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(
      () => setPromptIndex((i) => (i + 1) % PROMPTS.length),
      2600
    );
    return () => window.clearInterval(id);
  }, [animate]);

  return (
    <section aria-label="Nexura AI intelligence" className="relative py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1F1B17] px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
            {/* faint warm texture — two soft terracotta coals, no neon */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(38% 46% at 78% 18%, rgba(217,139,110,0.13), transparent 70%), radial-gradient(30% 40% at 12% 88%, rgba(122,154,123,0.10), transparent 70%)",
              }}
            />

            <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              {/* Left: copy */}
              <div>
                <p className="nx-micro" style={{ color: "#D9C7AE" }}>
                  Nexura Intelligence
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-[#FFF8F3] sm:text-4xl">
                  Ask, and it thinks.
                  <br />
                  Quietly, with you.
                </h2>
                <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-[#D9C7AE]">
                  The foresight engine reads patterns, not panic — twelve risk
                  domains from forty symptom patterns and 130+ weighted factors,
                  explained in plain language, calibrated for Indian bodies.
                </p>

                <div className="mt-5 flex flex-wrap gap-2" aria-hidden="true">
                  {["12 risk domains", "40 symptom patterns", "130+ weighted factors"].map(
                    (chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-[#D9C7AE]/25 px-3 py-1 text-xs font-medium text-[#D9C7AE]"
                      >
                        {chip}
                      </span>
                    )
                  )}
                </div>

                <div className="mt-7">
                  <Link
                    href="/know-your-health"
                    className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.95rem] font-medium text-[#1F1B17] transition-colors"
                    style={{ backgroundColor: "#D98B6E" }}
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Try the 15 live AI tools
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                  <p className="mt-2.5 text-xs text-[#D9C7AE]/70">
                    Free in beta · no signup · educational guidance, not a diagnosis
                  </p>
                </div>
              </div>

              {/* Right: thinking orb + border-beam prompt card */}
              <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-end lg:flex-col lg:items-stretch">
                {/* Orb — decorative */}
                <div
                  className="nx-orb shrink-0"
                  aria-hidden="true"
                  style={{ marginLeft: "auto", marginRight: "auto" }}
                >
                  <i />
                  <i />
                  <i />
                  <span className="nx-orb-core" />
                </div>

                {/* Prompt card with travelling beam — decorative demo */}
                <div
                  className="nx-beam nx-spin-border relative w-full rounded-2xl border border-[#D9C7AE]/15 bg-white/[0.04] p-4"
                  aria-hidden="true"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-[#D9C7AE]/70">
                    <Sparkles className="h-3.5 w-3.5" />
                    Ask Nexura AI
                    <span
                      className="ml-auto flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold"
                      style={{ backgroundColor: "rgba(217,139,110,0.16)", color: "#D98B6E" }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D98B6E]" />
                      thinking
                    </span>
                  </div>
                  <p className="mt-3 min-h-6 text-[0.95rem] text-[#FFF8F3]/90">
                    {PROMPTS[promptIndex]}
                    <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-[#D98B6E]" />
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="rounded-full border border-[#D9C7AE]/20 px-2.5 py-1 text-[0.6rem] text-[#D9C7AE]/70">
                      blood report
                    </span>
                    <span className="rounded-full border border-[#D9C7AE]/20 px-2.5 py-1 text-[0.6rem] text-[#D9C7AE]/70">
                      vitals
                    </span>
                    <span className="rounded-full border border-[#D9C7AE]/20 px-2.5 py-1 text-[0.6rem] text-[#D9C7AE]/70">
                      history
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
