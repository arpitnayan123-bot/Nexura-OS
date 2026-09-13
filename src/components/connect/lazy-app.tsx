"use client";

import dynamic from "next/dynamic";
import { Activity } from "lucide-react";

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

const ConnectApp = dynamic(
  () => import("./connect-app").then((m) => m.ConnectApp),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-screen place-items-center bg-[#1F1B17]">
        <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
        <div className="flex flex-col items-center gap-5">
          {/* breathing warm orb — matches the dashboard logo */}
          <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#E8B04B] via-[#A16207] to-[#8A5A04] shadow-[0_0_40px_rgba(217,139,110,0.35)] ring-1 ring-inset ring-white/25 anim-breathe">
            <Activity className="h-7 w-7 text-white" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <div className="flex flex-col items-center gap-2">
            <p className="font-serif text-lg font-semibold tracking-tight text-white">Nexura Connect</p>
            <p className="text-[0.6rem] uppercase tracking-[0.25em] text-[#D9B87C]/70">Opening your dashboard</p>
          </div>
          {/* fine gold shimmer bar */}
          <div className="h-px w-40 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="nx-shimmer-bar h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#E8B04B] to-transparent" />
          </div>
        </div>
      </div>
    ),
  }
);

export function LazyConnectApp() {
  return <ConnectApp />;
}
