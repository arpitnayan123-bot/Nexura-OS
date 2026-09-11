"use client";

/* ============================================================
 * NEXURA LINEN — GLOBAL GLOBE CARD
 * Warm Cobe globe (the ~5KB WebGL dotted sphere from the
 * 21st.dev research): sand continents, terracotta pulses for
 * the international patient desk. Rotates slowly; rotation
 * stops under prefers-reduced-motion. Facts are real: the
 * coordinator desk, cost calculator and city list ship today.
 * ============================================================ */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, CalendarClock, Languages } from "lucide-react";
import createGlobe from "cobe";
import { Reveal } from "./ambient";

/* Nexura Global desk — Indian centres of care + patient origins
   the coordinator desk is actually built for (currency factors
   exist in the calculator for these regions). */
const MARKERS: { location: [number, number]; size: number }[] = [
  { location: [19.076, 72.8777], size: 0.09 }, // Mumbai — home
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
      dark: 1,
      diffuse: 1.35,
      mapSamples: 16000,
      mapBrightness: 5.6,
      baseColor: [0.85, 0.78, 0.68], // sand #D9C7AE
      markerColor: [0.85, 0.55, 0.43], // terracotta #D98B6E
      glowColor: [0.14, 0.12, 0.1], // warm ember glow, not sci-fi blue
      markers: MARKERS,
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
    <section aria-label="Nexura Global — international patients" className="relative py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1F1B17]">
            <div className="grid items-center gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-14 lg:py-12">
              {/* Left: copy */}
              <div className="order-2 lg:order-1">
                <p className="nx-micro" style={{ color: "#D9C7AE" }}>
                  Nexura Global
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-[#FFF8F3] sm:text-4xl">
                  Built in India.
                  <br />
                  Booked from everywhere.
                </h2>
                <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-[#D9C7AE]">
                  A coordinator desk for patients abroad considering Indian
                  care — discover procedures, compare honest cost estimates in
                  your own currency, and plan the journey with a real human.
                </p>

                <ul className="mt-5 space-y-2.5 text-sm text-[#FFF8F3]/85">
                  <li className="flex items-center gap-2.5">
                    <Calculator className="h-4 w-4 shrink-0 text-[#D98B6E]" aria-hidden="true" />
                    Cost calculator with country-wise currency factors
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CalendarClock className="h-4 w-4 shrink-0 text-[#D98B6E]" aria-hidden="true" />
                    Coordinator dashboard — inquiry to treatment plan
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Languages className="h-4 w-4 shrink-0 text-[#D98B6E]" aria-hidden="true" />
                    Real hospital partners, transparent inclusions
                  </li>
                </ul>

                <div className="mt-7">
                  <Link
                    href="/global"
                    className="group inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.95rem] font-medium text-[#1F1B17] transition-colors"
                    style={{ backgroundColor: "#D98B6E" }}
                  >
                    Open the Global desk
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>

              {/* Right: the globe */}
              <div className="order-1 lg:order-2">
                <div className="relative mx-auto aspect-square w-full max-w-[420px]">
                  <canvas
                    ref={canvasRef}
                    className="h-full w-full"
                    style={{ contain: "layout paint size" }}
                    aria-label="Dotted globe with Nexura care centres in India and patient cities worldwide"
                    role="img"
                  />
                </div>
                <p className="mt-1 text-center text-xs text-[#D9C7AE]/60">
                  Mumbai · Delhi · Bengaluru · Chennai · Hyderabad · Kochi —
                  serving families from Dubai to London to Singapore
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
