"use client";

/* ============================================================
 * NEXURA LINEN — GLOBAL GLOBE CARD · "THE WORLD AT FIRST LIGHT"
 * Matched pair with the AI strip's morning-by-the-sea: the same
 * dawn gradient canvas, hairline border, radius family and
 * warm-ink copy. The cobe globe is re-tuned for daylight —
 * cream sphere, espresso dotted continents, deep terracotta
 * markers — and carries terracotta flight arcs converging on
 * Mumbai from the patient cities the desk actually serves. A
 * soft sun halo rises behind the sphere; gulls, clouds, a sage
 * horizon with a tiny sailboat and drifting petals echo the
 * strip one card up. Facts stay real: the coordinator desk,
 * cost calculator and hospital partners ship today.
 * ============================================================ */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, CalendarClock, Languages } from "lucide-react";
import createGlobe from "cobe";
import { Reveal } from "./ambient";

/* Nexura Global desk — Indian centres of care + patient origins
   the coordinator desk is actually built for (currency factors
   exist in the calculator for these regions). */
const MUMBAI: [number, number] = [19.076, 72.8777];

const MARKERS: { location: [number, number]; size: number }[] = [
  { location: MUMBAI, size: 0.09 }, // Mumbai — home
  { location: [28.6139, 77.209], size: 0.06 }, // Delhi NCR
  { location: [12.9716, 77.5946], size: 0.055 }, // Bengaluru
  { location: [13.0827, 80.2707], size: 0.055 }, // Chennai
  { location: [17.385, 78.4867], size: 0.05 }, // Hyderabad
  { location: [22.5726, 88.3639], size: 0.05 }, // Kolkata
  { location: [9.9312, 76.2673], size: 0.05 }, // Kochi
  { location: [25.2048, 55.2708], size: 0.06 }, // Dubai
  { location: [51.5072, -0.1276], size: 0.05 }, // London
  { location: [1.3521, 103.8198], size: 0.05 }, // Singapore
  { location: [40.7128, -74.006], size: 0.05 }, // New York
  { location: [-1.2921, 36.8219], size: 0.045 }, // Nairobi
  { location: [23.8103, 90.4125], size: 0.045 }, // Dhaka
];

/* Flight corridors the coordinator desk actually serves —
   arcs converge on Mumbai from the international cities. */
const ARCS: { from: [number, number]; to: [number, number] }[] = [
  { from: [25.2048, 55.2708], to: MUMBAI }, // Dubai → Mumbai
  { from: [51.5072, -0.1276], to: MUMBAI }, // London → Mumbai
  { from: [1.3521, 103.8198], to: MUMBAI }, // Singapore → Mumbai
  { from: [40.7128, -74.006], to: MUMBAI }, // New York → Mumbai
  { from: [-1.2921, 36.8219], to: MUMBAI }, // Nairobi → Mumbai
  { from: [23.8103, 90.4125], to: MUMBAI }, // Dhaka → Mumbai
];

/* Gulls — warm-ink silhouettes gliding in the dawn sky */
const BIRDS = [
  { left: "24%", top: "18px", w: 20, dur: "16s", delay: "0s", op: 0.5 },
  { left: "33%", top: "34px", w: 14, dur: "13s", delay: "2.6s", op: 0.38 },
  { left: "58%", top: "12px", w: 17, dur: "18s", delay: "4.8s", op: 0.45 },
];

/* Petals loosed on the morning breeze, drifting toward the sea */
const PETALS = [
  { left: "13%", bottom: "52px", dur: "9.5s", delay: "1.2s", color: "#D9B87C" },
  { left: "19%", bottom: "34px", dur: "11s", delay: "4.1s", color: "#D9A05B" },
];

export function GlobeCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(3.9);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // cobe v2: drive rotation ourselves via update() + rAF.
    // Sized for headless/low-end GPUs: 600px @ DPR 1, rotation
    // capped at ~30fps — visually identical, ~13x cheaper/frame.
    const globe = createGlobe(canvas, {
      devicePixelRatio: 1,
      width: 600,
      height: 600,
      phi: phiRef.current,
      theta: 0.24,
      dark: 0, // daylight mode — cream sphere, espresso dotted continents
      diffuse: 1.35,
      mapSamples: 16000,
      mapBrightness: 6, // saturate land dots to espresso against the cream sphere
      mapBaseBrightness: 0.18, // whisper of an ocean dot grid (p floor)
      opacity: 1, // overall dimmer — 1 keeps the sphere at full light
      baseColor: [0.95, 0.87, 0.75], // warm dawn sand
      markerColor: [0.675, 0.325, 0.208], // deep terracotta #AC5335 — AA-strong on cream
      glowColor: [0.93, 0.8, 0.62], // deeper warm halo — grounds the rim on a light card
      markerElevation: 0.02,
      markers: MARKERS,
      arcs: ARCS,
      arcColor: [0.675, 0.325, 0.208], // terracotta corridors to Mumbai
      arcWidth: 0.42,
      arcHeight: 0.3,
    });

    let raf = 0;
    if (!reduced) {
      let last = 0;
      const tick = (t: number) => {
        // ~30fps rotation cap
        if (t - last >= 32) {
          last = t;
          phiRef.current += 0.0034;
          globe.update({ phi: phiRef.current });
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
    };
  }, []);

  return (
    <section aria-label="Nexura Global — international patients" className="relative py-8 lg:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[2rem] border"
            style={{
              background: "linear-gradient(180deg, #FFFCF6 0%, #FBF0DE 58%, #F6E7CF 100%)",
              borderColor: "#EFE9E0",
              boxShadow:
                "0 1px 2px rgba(46,42,38,0.05), 0 0 0 1px color-mix(in srgb, #0E7490 8%, transparent), 0 18px 44px -24px color-mix(in srgb, #1D4ED8 26%, transparent)",
            }}
          >
            {/* MATERIAL SPECTRUM — dawn aurora sky: teal → blue → violet */}
            <div
              aria-hidden="true"
              className="anim-aurora pointer-events-none absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom,black_0%,transparent_62%)]"
              style={{
                background:
                  "radial-gradient(at 20% 18%, color-mix(in srgb, #0E7490 16%, transparent) 0%, transparent 46%), radial-gradient(at 72% 10%, color-mix(in srgb, #1D4ED8 13%, transparent) 0%, transparent 44%), radial-gradient(at 92% 30%, color-mix(in srgb, #6D28D9 11%, transparent) 0%, transparent 40%)",
              }}
            />
            {/* ---- dawn coast scene (decorative) ---- */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {/* gulls gliding high above the copy */}
              {BIRDS.map((b, idx) => (
                <svg
                  key={idx}
                  className={`nx-bird absolute ${idx === 2 ? "hidden lg:block" : ""}`}
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

              {/* clouds — slow cream drift */}
              <div
                className="nx-cloud absolute left-[6%] top-5 h-4 w-24 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  filter: "blur(5px)",
                  animationDuration: "34s",
                }}
              />
              <div
                className="nx-cloud absolute right-[36%] top-9 hidden h-3.5 w-20 rounded-full sm:block"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  filter: "blur(5px)",
                  animationDuration: "26s",
                  animationDelay: "3s",
                }}
              />

              {/* petals drifting down-wind on the copy side */}
              {PETALS.map((p, idx) => (
                <span
                  key={idx}
                  className="nx-petal absolute hidden sm:block"
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

              {/* the sage horizon — quieter cousin of the strip's sea */}
              <svg
                className="absolute bottom-0 left-0 h-12 w-full sm:h-14"
                viewBox="0 0 1440 64"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M0 26 C 240 18, 480 30, 720 24 C 960 16, 1200 28, 1440 22 L1440 64 L0 64 Z"
                  fill="rgba(150,175,155,0.32)"
                />
                <path
                  d="M0 46 C 300 40, 600 50, 900 45 C 1100 41, 1300 48, 1440 44 L1440 64 L0 64 Z"
                  fill="rgba(107,140,112,0.28)"
                />
                <path
                  d="M0 30 C 240 24, 480 33, 720 27 C 960 21, 1200 32, 1440 26"
                  stroke="rgba(255,252,246,0.45)"
                  strokeWidth="1.2"
                />
                <path
                  d="M0 56 C 360 52, 720 58, 1440 54 L1440 64 L0 64 Z"
                  fill="rgba(233,213,180,0.5)"
                />
              </svg>

              {/* a tiny sailboat crossing the horizon, clear of the copy */}
              <div className="nx-boat absolute bottom-[3px] left-[7%] hidden sm:block">
                <svg width="18" height="20" viewBox="0 0 20 22" fill="none">
                  <path d="M10 2 L10 14 L4 14 Z" fill="rgba(255,248,243,0.92)" />
                  <path d="M11.5 4.5 L11.5 14 L16 14 Z" fill="rgba(239,217,188,0.9)" />
                  <path d="M2 16 L18 16 L15 20 L5 20 Z" fill="#AC5335" />
                </svg>
              </div>
            </div>

            <div className="relative grid items-center gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-14 lg:py-12">
              {/* Left: copy */}
              <div className="order-2 lg:order-1">
                <p className="nx-micro">Nexura Global</p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-[#2E2A26] sm:text-4xl">
                  Built in India.
                  <br />
                  Booked from everywhere.
                </h2>
                <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-[#5E5A52]">
                  A coordinator desk for patients abroad considering Indian care — discover
                  procedures, compare honest cost estimates in your own currency, and plan the
                  journey with a real human.
                </p>

                <ul className="mt-5 space-y-2.5 text-sm text-[#2E2A26]/85">
                  <li className="flex items-center gap-2.5">
                    <Calculator className="h-4 w-4 shrink-0 text-[#AC5335]" aria-hidden="true" />
                    Cost calculator with country-wise currency factors
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CalendarClock className="h-4 w-4 shrink-0 text-[#AC5335]" aria-hidden="true" />
                    Coordinator dashboard — inquiry to treatment plan
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Languages className="h-4 w-4 shrink-0 text-[#AC5335]" aria-hidden="true" />
                    Real hospital partners, transparent inclusions
                  </li>
                </ul>

                <div className="mt-7">
                  <Link href="/global" className="nx-btn-primary">
                    Open the Global desk
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>

              {/* Right: the globe rising like a morning sun */}
              <div className="order-1 lg:order-2">
                <div className="relative mx-auto aspect-square w-full max-w-[420px]">
                  {/* sun halo behind the sphere */}
                  <div
                    aria-hidden="true"
                    className="absolute -inset-6 rounded-full sm:-inset-10"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(240,190,125,0.3), rgba(240,190,125,0.12) 55%, transparent 72%)",
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="relative h-full w-full"
                    style={{ contain: "layout paint size" }}
                    aria-label="Dotted globe with terracotta flight arcs converging on Mumbai from Nexura care centres and patient cities worldwide"
                    role="img"
                  />
                </div>
                <p className="relative mt-1 text-center text-xs text-[#5E5A52]">
                  Mumbai · Delhi · Bengaluru · Chennai · Hyderabad · Kochi — serving families from
                  Dubai to London to Singapore
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
