"use client";

/* ============================================================
 * NEXURA LINEN — AI STRIP · "NIGHT GARDEN" (minimal redesign)
 * The intelligence moment sits directly above the warm Cobe
 * globe and now wears the globe's own language: same warm-dark
 * canvas, sand + terracotta + ember glow — so the two cards
 * read as a matched pair (a dusk garden above the dotted earth).
 * The scene: layered sage hills, swaying stems, drifting
 * fireflies, one small moon-orb. Roughly half the height of the
 * old band — one compact row on desktop.
 * Facts stay real (12 domains / 40 patterns / 130+ factors);
 * everything decorative is aria-hidden and freezes under
 * prefers-reduced-motion (loop-13 a11y preserved).
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

/* Fireflies — sand & terracotta glows echoing the globe's pulses */
const FLIES: {
  left: string;
  bottom: string;
  size: number;
  color: string;
  dur: string;
  delay: string;
}[] = [
  { left: "11%", bottom: "20px", size: 4, color: "#D9C7AE", dur: "9s", delay: "0s" },
  { left: "24%", bottom: "34px", size: 3, color: "#D98B6E", dur: "11s", delay: "1.2s" },
  { left: "37%", bottom: "12px", size: 3, color: "#D9C7AE", dur: "8.5s", delay: "2.4s" },
  { left: "52%", bottom: "26px", size: 3, color: "#E0B080", dur: "10.5s", delay: "4s" },
  { left: "66%", bottom: "16px", size: 4, color: "#D98B6E", dur: "10s", delay: "0.6s" },
  { left: "79%", bottom: "32px", size: 3, color: "#D9C7AE", dur: "9.5s", delay: "3.1s" },
  { left: "90%", bottom: "18px", size: 4, color: "#D98B6E", dur: "12s", delay: "1.8s" },
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
    <section aria-label="Nexura AI intelligence" className="relative py-8 lg:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1F1B17] px-6 py-9 sm:px-10 lg:px-12 lg:py-10">
            {/* ---- night-garden scene (decorative) ---- */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {/* soft embers: warm glow like the globe's, a sage moon-rise */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(36% 55% at 80% 8%, rgba(217,139,110,0.13), transparent 70%), radial-gradient(26% 42% at 12% 6%, rgba(122,154,123,0.10), transparent 70%)",
                }}
              />

              {/* dusk hills — three sage layers, same family as the globe's sand */}
              <svg
                className="absolute bottom-0 left-0 h-[104px] w-full sm:h-[124px]"
                viewBox="0 0 1440 150"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M0 96 C 180 58, 340 50, 520 76 C 700 102, 860 118, 1040 102 C 1200 88, 1330 68, 1440 80 L1440 150 L0 150 Z"
                  fill="rgba(122,154,123,0.10)"
                />
                <path
                  d="M0 118 C 200 90, 380 86, 560 106 C 740 126, 920 132, 1100 116 C 1260 102, 1370 94, 1440 100 L1440 150 L0 150 Z"
                  fill="rgba(122,154,123,0.14)"
                />
                <path
                  d="M0 136 C 240 114, 480 110, 720 124 C 960 138, 1200 140, 1440 126 L1440 150 L0 150 Z"
                  fill="rgba(74,106,75,0.22)"
                />
              </svg>

              {/* swaying stems — each rocks gently on its own rhythm */}
              <div className="nx-stem" style={{ left: "7%", animationDuration: "8s" }}>
                <svg width="60" height="100" viewBox="0 0 60 100" fill="none">
                  <path d="M32 100 C30 72 33 48 30 20" stroke="rgba(157,184,158,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M31 52 C21 49 14 41 13 30 C24 33 30 41 31 50 Z" fill="rgba(122,154,123,0.42)" />
                  <path d="M31 74 C41 71 48 63 49 52 C38 55 32 63 31 72 Z" fill="rgba(122,154,123,0.34)" />
                </svg>
              </div>
              <div className="nx-stem" style={{ left: "14%", animationDuration: "6.6s", animationDelay: "0.9s" }}>
                <svg width="44" height="64" viewBox="0 0 44 64" fill="none">
                  <path d="M22 64 C21 46 23 32 22 14" stroke="rgba(157,184,158,0.42)" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M22 34 C31 31 36 24 37 15 C28 18 23 25 22 32 Z" fill="rgba(122,154,123,0.36)" />
                </svg>
              </div>
              <div className="nx-stem hidden sm:block" style={{ right: "22%", animationDuration: "7.2s", animationDelay: "1.6s" }}>
                <svg width="54" height="46" viewBox="0 0 54 46" fill="none">
                  <path d="M14 46 C13 32 10 22 6 14" stroke="rgba(157,184,158,0.4)" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M27 46 C27 30 27 18 27 8" stroke="rgba(157,184,158,0.5)" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M40 46 C41 32 44 22 48 14" stroke="rgba(157,184,158,0.4)" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="nx-stem" style={{ right: "8%", animationDuration: "8.6s", animationDelay: "0.4s" }}>
                <svg width="60" height="88" viewBox="0 0 60 88" fill="none">
                  <path d="M28 88 C26 62 30 42 27 16" stroke="rgba(157,184,158,0.46)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M28 44 C18 41 12 33 11 22 C22 25 28 33 28 42 Z" fill="rgba(122,154,123,0.4)" />
                  <path d="M28 66 C38 63 44 55 45 44 C34 47 29 55 28 64 Z" fill="rgba(122,154,123,0.3)" />
                </svg>
              </div>

              {/* fireflies drifting up through the garden */}
              {FLIES.map((fly, idx) => (
                <span
                  key={idx}
                  className="nx-fly"
                  style={{
                    left: fly.left,
                    bottom: fly.bottom,
                    width: fly.size,
                    height: fly.size,
                    backgroundColor: fly.color,
                    boxShadow: `0 0 8px 2px ${fly.color}59`,
                    ["--fly-dur" as string]: fly.dur,
                    ["--fly-delay" as string]: fly.delay,
                  }}
                />
              ))}
            </div>

            {/* ---- compact content row ---- */}
            <div className="relative grid items-center gap-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-8">
              {/* the moon — small thinking orb, dotted rings like the globe's dots */}
              <div className="nx-orb nx-orb-sm mx-auto shrink-0 lg:mx-0" aria-hidden="true">
                <i />
                <i />
                <i />
                <span className="nx-orb-core" />
              </div>

              {/* copy — min-w-0: the nowrap prompt inside must never floor this grid item wider than the track */}
              <div className="min-w-0 text-center lg:text-left">
                <p className="nx-micro" style={{ color: "#D9C7AE" }}>
                  Nexura Intelligence
                </p>
                <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.02em] text-[#FFF8F3] sm:text-3xl">
                  Ask, and it thinks. Quietly, with you.
                </h2>

                {/* slim prompt bar — the old beam card, distilled */}
                <div
                  className="mx-auto mt-3.5 flex h-10 max-w-xl items-center gap-2.5 rounded-full border border-[#D9C7AE]/15 bg-white/[0.04] pl-4 pr-1.5 sm:mx-0 sm:inline-flex"
                  aria-hidden="true"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#D98B6E]" />
                  <p key={promptIndex} className="nx-fade min-w-0 flex-1 truncate text-[0.85rem] text-[#FFF8F3]/85 sm:flex-none sm:max-w-[280px]">
                    {PROMPTS[promptIndex]}
                    <span className="ml-0.5 inline-block h-3.5 w-px translate-y-[3px] animate-pulse bg-[#D98B6E]" />
                  </p>
                  <span
                    className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold"
                    style={{ backgroundColor: "rgba(217,139,110,0.16)", color: "#D98B6E" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D98B6E]" />
                    thinking
                  </span>
                </div>

                <p className="mt-2.5 text-[0.7rem] tracking-wide text-[#D9C7AE]/60">
                  12 risk domains · 40 symptom patterns · 130+ weighted factors
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col items-center gap-2 lg:items-end">
                <Link
                  href="/know-your-health"
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-[0.95rem] font-medium text-[#1F1B17] transition-colors hover:brightness-105"
                  style={{ backgroundColor: "#D98B6E" }}
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Try the 15 live AI tools
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <p className="text-[0.65rem] text-[#D9C7AE]/55">
                  Free in beta · educational guidance, not a diagnosis
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
