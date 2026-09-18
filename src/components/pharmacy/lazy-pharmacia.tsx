"use client";

import dynamic from "next/dynamic";
import { Pill } from "lucide-react";

const SPLASH_CSS = `
@keyframes nxshimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
.nx-shimmer-bar { animation: nxshimmer 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .nx-shimmer-bar, .anim-breathe { animation: none !important; }
}
`;

const PharmaciaApp = dynamic(() => import("./pharmacia-app").then((m) => m.PharmaciaApp), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0F12]">
      <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
      <div className="flex flex-col items-center gap-5">
        {/* breathing champagne orb */}
        <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#E8B04B] via-[#D99A2B] to-[#B87A10] shadow-[0_0_40px_rgba(232,176,75,0.35)] ring-1 ring-inset ring-white/20 anim-breathe">
          <Pill className="h-7 w-7 text-white" strokeWidth={2.4} aria-hidden="true" />
        </span>
        <div className="flex flex-col items-center gap-2">
          <p className="font-serif text-lg font-semibold tracking-tight text-white">
            Nexura Pharmacia
          </p>
          <p className="text-[0.6rem] uppercase tracking-[0.25em] text-[#828894]">
            Preparing your counter
          </p>
        </div>
        {/* fine gold shimmer bar */}
        <div className="h-px w-40 overflow-hidden rounded-full bg-[#1E2228]" aria-hidden="true">
          <div className="nx-shimmer-bar h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#E8B04B] to-transparent" />
        </div>
      </div>
    </div>
  ),
});

export function LazyPharmacia() {
  return <PharmaciaApp />;
}
