"use client";

/* ============================================================
 * NEXURA LINEN — AI STRIP · "MORNING GARDEN BY THE SEA" (v3)
 * The intelligence moment, now in daylight and slimmer than
 * ever: one compact row on desktop. A warm dawn sky over a
 * sage sea — soft sun, drifting clouds, gliding gulls, a
 * bobbing sailboat, flowers and stems on the sand, a
 * butterfly, falling petals. Every color stays in the warm
 * Linen family (the sea is eucalyptus-sage, never cool blue),
 * so the scene still speaks the globe's sand + terracotta
 * language from one card up.
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

/* Gulls — warm-ink silhouettes drifting across the sky */
const BIRDS = [
  { left: "17%", top: "10px", w: 20, dur: "15s", delay: "0s", op: 0.55 },
  { left: "25%", top: "26px", w: 14, dur: "12s", delay: "2.2s", op: 0.4 },
  { left: "58%", top: "7px", w: 17, dur: "17s", delay: "4.5s", op: 0.48 },
];

/* Petals loosed from the flowers, drifting down-wind */
const PETALS = [
  { left: "30%", bottom: "18px", dur: "8.5s", delay: "0.8s", color: "#D9B87C" },
  { left: "48%", bottom: "12px", dur: "10s", delay: "3.4s", color: "#C4704B" },
  { left: "86%", bottom: "22px", dur: "9s", delay: "1.9s", color: "#D9A05B" },
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
    const id = window.setInterval(() => setPromptIndex((i) => (i + 1) % PROMPTS.length), 2600);
    return () => window.clearInterval(id);
  }, [animate]);

  return (
    <section aria-label="Nexura AI intelligence" className="relative py-6 lg:py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[2rem] border px-5 py-5 sm:px-8 lg:px-10 lg:py-5"
            style={{
              background: "linear-gradient(180deg, #FFFCF6 0%, #FBF0DE 58%, #F6E7CF 100%)",
              borderColor: "#EFE9E0",
              boxShadow: "0 1px 2px rgba(46,42,38,0.05)",
            }}
          >
            {/* MATERIAL SPECTRUM — violet/teal aurora wash over the garden */}
            <div
              aria-hidden
              className="anim-aurora pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(75%_75%_at_50%_20%,black,transparent)]"
              style={{
                background:
                  "radial-gradient(at 14% 24%, color-mix(in srgb, #6D28D9 14%, transparent) 0%, transparent 44%), radial-gradient(at 84% 30%, color-mix(in srgb, #0E7490 13%, transparent) 0%, transparent 42%), radial-gradient(at 52% 8%, color-mix(in srgb, #EC4899 9%, transparent) 0%, transparent 40%)",
              }}
            />
            {/* ---- morning garden by the sea (decorative) ---- */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {/* sun — soft amber, the day's quiet centre */}
              <div
                className="absolute right-[9%] top-0 h-24 w-24 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(240,190,125,0.5), rgba(240,190,125,0.18) 55%, transparent 72%)",
                }}
              />

              {/* clouds — slow cream drift */}
              <div
                className="nx-cloud absolute left-[30%] top-3 h-4 w-28 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.75)",
                  filter: "blur(5px)",
                  animationDuration: "30s",
                }}
              />
              <div
                className="nx-cloud absolute right-[30%] top-8 h-3.5 w-20 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  filter: "blur(5px)",
                  animationDuration: "22s",
                  animationDelay: "3s",
                }}
              />

              {/* gulls gliding */}
              {BIRDS.map((b, idx) => (
                <svg
                  key={idx}
                  className="nx-bird absolute"
                  width={b.w}
                  height={b.w * 0.5}
                  viewBox="0 0 20 10"
                  fill="none"
                  style={{
                    left: b.left,
                    top: b.top,
                    ["--bird-dur" as string]: b.dur,
                    ["--bird-delay" as string]: b.delay,
                  }}
                >
                  <path
                    d="M1 7 Q5.5 1.5 10 6 Q14.5 1.5 19 7"
                    stroke="#5E5A52"
                    strokeOpacity={b.op}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              ))}

              {/* the sage sea — eucalyptus water, cream wave lines, warm sand */}
              <svg
                className="absolute bottom-0 left-0 h-14 w-full sm:h-16"
                viewBox="0 0 1440 64"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M0 22 C 240 14, 480 28, 720 20 C 960 12, 1200 26, 1440 18 L1440 64 L0 64 Z"
                  fill="rgba(150,175,155,0.38)"
                />
                <path
                  d="M0 46 C 300 40, 600 50, 900 45 C 1100 41, 1300 48, 1440 44 L1440 64 L0 64 Z"
                  fill="rgba(107,140,112,0.34)"
                />
                <path
                  d="M0 29 C 240 23, 480 32, 720 26 C 960 20, 1200 31, 1440 24"
                  stroke="rgba(255,252,246,0.5)"
                  strokeWidth="1.2"
                />
                <path
                  d="M0 38 C 300 32, 600 42, 900 37 C 1100 33, 1300 40, 1440 35"
                  stroke="rgba(255,252,246,0.32)"
                  strokeWidth="1"
                />
                <path
                  d="M0 57 C 360 53, 720 59, 1440 55 L1440 64 L0 64 Z"
                  fill="rgba(233,213,180,0.55)"
                />
              </svg>

              {/* little sailboat bobbing on the swell, in the clear water pocket */}
              <div className="nx-boat absolute bottom-[2px] left-[21%]">
                <svg width="18" height="20" viewBox="0 0 20 22" fill="none">
                  <path d="M10 2 L10 14 L4 14 Z" fill="rgba(255,248,243,0.92)" />
                  <path d="M11.5 4.5 L11.5 14 L16 14 Z" fill="rgba(239,217,188,0.9)" />
                  <path d="M2 16 L18 16 L15 20 L5 20 Z" fill="#AC5335" />
                </svg>
              </div>

              {/* the garden on the sand — swaying stems + blooms */}
              <div className="nx-stem" style={{ left: "5%", animationDuration: "7.6s" }}>
                <svg width="58" height="96" viewBox="0 0 58 96" fill="none">
                  <path
                    d="M30 96 C28 70 31 46 30 22"
                    stroke="rgba(90,122,91,0.6)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M30 54 C21 51 15 44 14 34 C24 37 29 44 30 52 Z"
                    fill="rgba(122,154,123,0.55)"
                  />
                  <path
                    d="M30 74 C39 71 45 64 46 54 C36 57 31 64 30 72 Z"
                    fill="rgba(122,154,123,0.45)"
                  />
                  <circle cx="30" cy="18" r="2.6" fill="#C4704B" />
                  <circle cx="30" cy="18" r="1" fill="#FFF8F3" />
                </svg>
              </div>
              <div
                className="nx-stem"
                style={{ left: "12%", animationDuration: "6.4s", animationDelay: "1.1s" }}
              >
                <svg width="46" height="58" viewBox="0 0 46 58" fill="none">
                  <path
                    d="M23 58 C22 42 24 28 23 14"
                    stroke="rgba(90,122,91,0.5)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M23 34 C31 31 36 24 37 16 C29 19 24 26 23 32 Z"
                    fill="rgba(122,154,123,0.5)"
                  />
                  <circle cx="23" cy="10" r="2.2" fill="#D9B87C" />
                </svg>
              </div>
              <div
                className="nx-stem hidden sm:block"
                style={{ left: "44%", animationDuration: "7s", animationDelay: "2s" }}
              >
                <svg width="50" height="38" viewBox="0 0 50 38" fill="none">
                  <path
                    d="M13 38 C12 26 9 18 5 12"
                    stroke="rgba(90,122,91,0.45)"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M25 38 C25 24 25 14 25 6"
                    stroke="rgba(90,122,91,0.55)"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M37 38 C38 26 41 18 45 12"
                    stroke="rgba(90,122,91,0.45)"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div
                className="nx-stem"
                style={{ right: "6%", animationDuration: "8.4s", animationDelay: "0.5s" }}
              >
                <svg width="56" height="84" viewBox="0 0 56 84" fill="none">
                  <path
                    d="M27 84 C25 60 29 42 27 18"
                    stroke="rgba(90,122,91,0.58)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M27 46 C18 43 12 36 11 26 C21 29 27 36 27 44 Z"
                    fill="rgba(122,154,123,0.5)"
                  />
                  <path
                    d="M27 66 C36 63 42 56 43 46 C33 49 28 56 27 64 Z"
                    fill="rgba(122,154,123,0.42)"
                  />
                  <circle cx="27" cy="13" r="2.6" fill="#C4704B" />
                  <circle cx="27" cy="13" r="1" fill="#FFF8F3" />
                </svg>
              </div>

              {/* a butterfly visiting the blooms */}
              <div className="nx-butterfly absolute bottom-[44px] left-[9%]">
                <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                  <path d="M7 5 L7 11" stroke="#8A6A50" strokeWidth="1" strokeLinecap="round" />
                  <path
                    d="M7 5 C3 0.5 0.5 2.5 3 6.5 C4.5 8.5 6.5 7 7 5 Z"
                    fill="rgba(201,130,93,0.85)"
                  />
                  <path
                    d="M7 5 C11 0.5 13.5 2.5 11 6.5 C9.5 8.5 7.5 7 7 5 Z"
                    fill="rgba(217,160,91,0.8)"
                  />
                </svg>
              </div>

              {/* petals loosed on the breeze */}
              {PETALS.map((p, idx) => (
                <span
                  key={idx}
                  className="nx-petal absolute"
                  style={{
                    left: p.left,
                    bottom: p.bottom,
                    width: 5,
                    height: 7,
                    borderRadius: "70% 30% 70% 30%",
                    backgroundColor: p.color,
                    ["--petal-dur" as string]: p.dur,
                    ["--petal-delay" as string]: p.delay,
                  }}
                />
              ))}
            </div>

            {/* ---- slim content row ---- */}
            <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] lg:gap-x-6">
              {/* the intelligence — small orb, dotted rings like the globe */}
              <div className="nx-orb nx-orb-xs shrink-0" aria-hidden="true">
                <i />
                <i />
                <i />
                <span className="nx-orb-core" />
              </div>

              {/* copy — min-w-0: the nowrap prompt below must never floor this wider than its track */}
              <div className="min-w-0">
                <p className="nx-micro">Nexura Intelligence</p>
                <h2 className="mt-1 font-display text-base font-semibold tracking-[-0.02em] text-[#2E2A26] sm:text-lg lg:text-[1.35rem] lg:leading-tight">
                  Ask, and it thinks — quietly.
                </h2>
                <p className="mt-1 hidden text-[0.68rem] font-medium tracking-wide text-[#5E5A52] lg:block">
                  12 risk domains · 40 symptom patterns · 130+ weighted factors
                </p>
              </div>

              {/* slim prompt pill — glass on the morning light */}
              <div
                className="nx-glass col-span-2 flex h-10 min-w-0 items-center gap-2.5 rounded-full pl-4 pr-1.5 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:w-[280px]"
                aria-hidden="true"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#AC5335]" />
                <p
                  key={promptIndex}
                  className="nx-fade min-w-0 flex-1 truncate text-[0.85rem] text-[#2E2A26]"
                >
                  {PROMPTS[promptIndex]}
                  <span className="ml-0.5 inline-block h-3.5 w-px translate-y-[3px] animate-pulse bg-[#AC5335]" />
                </p>
                <span
                  className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold"
                  style={{ backgroundColor: "rgba(217,139,110,0.18)", color: "#AC5335" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#AC5335]" />
                  thinking
                </span>
              </div>

              {/* CTA — Linen primary on the daylight card */}
              <div className="col-span-2 flex flex-col items-center gap-1.5 lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:items-end">
                <Link href="/know-your-health" className="nx-btn-primary shrink-0">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Try the 15 live AI tools
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <p className="text-center text-[0.65rem] font-medium text-[#5E5A52] lg:text-right">
                  Free in beta · educational guidance, not a diagnosis
                </p>
              </div>
            </div>

            {/* facts stay visible on mobile too, tucked under the row */}
            <p className="relative mt-2.5 text-center text-[0.68rem] font-medium tracking-wide text-[#5E5A52] lg:hidden">
              12 risk domains · 40 symptom patterns · 130+ weighted factors
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
