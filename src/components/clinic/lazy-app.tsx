"use client";

import dynamic from "next/dynamic";

const ClinicApp = dynamic(
  () => import("./clinic-app").then((m) => m.ClinicApp),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-screen place-items-center bg-[oklch(0.985_0.006_95)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    ),
  }
);

export function LazyClinicApp() {
  return <ClinicApp />;
}
