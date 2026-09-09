"use client";

import dynamic from "next/dynamic";

const DashboardPreview = dynamic(
  () =>
    import("@/components/site/dashboard-preview").then(
      (m) => m.DashboardPreview
    ),
  {
    ssr: false,
    loading: () => (
      <div
        id="dashboard"
        className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-coral anim-breathe" />
            Loading live view…
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Your body,{" "}
            <span className="text-gradient-warm">in one calm view.</span>
          </h2>
        </div>
        <div className="mt-12 h-96 animate-pulse rounded-[2rem] border border-border bg-card/40" />
      </div>
    ),
  }
);

export function LazyDashboard() {
  return <DashboardPreview />;
}
