"use client";

import dynamic from "next/dynamic";

const PharmaciaApp = dynamic(
  () => import("./pharmacia-app").then((m) => m.PharmaciaApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0F12]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E2228] border-t-[#F59E0B]" />
          <p className="text-xs text-[#6B7280]">Loading Nexura Pharmacia…</p>
        </div>
      </div>
    ),
  }
);

export function LazyPharmacia() {
  return <PharmaciaApp />;
}
