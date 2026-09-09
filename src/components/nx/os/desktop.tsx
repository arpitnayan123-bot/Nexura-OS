"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, BedDouble, HeartPulse, Siren } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNx } from "../client";
import { useOs } from "./store";
import { useNow } from "./use-now";

/* ============================================================
   HOSPITAL OS — desktop stage
   Ambient atmosphere + glanceable widgets. Calm when idle.
   ============================================================ */

export function NxDesktop() {
  return (
    <>
      <div className="nx-sky" aria-hidden>
        <div className="nx-blob left-[-10%] top-[-20%] h-[55vh] w-[55vw]" style={{ background: "var(--nx-sky-1)" }} />
        <div className="nx-blob nx-blob-b right-[-15%] top-[10%] h-[50vh] w-[45vw]" style={{ background: "var(--nx-sky-3)" }} />
        <div className="nx-blob nx-blob-c bottom-[-25%] left-[25%] h-[45vh] w-[50vw]" style={{ background: "var(--nx-sky-2)" }} />
      </div>
      <Widgets />
    </>
  );
}

/* ------------------------------------------------------------------ */

function Widgets() {
  const openApp = useOs((s) => s.openApp);
  const { data: overview } = useNx<{
    census?: { total?: number; occupancyPct?: number };
    critical?: { openTasks?: number; openIncidents?: number; pendingResults?: number };
    hospital?: { name?: string; bedCapacity?: number };
  }>("/api/nx/overview", { pollMs: 60000 });

  return (
    <div className="pointer-events-none absolute right-6 top-5 z-0 hidden w-72 flex-col gap-3 lg:flex xl:right-10">
      {/* clock */}
      <ClockWidget />
      {/* hospital vitals */}
      <button
        onClick={() => openApp("command-center")}
        className="nx-widget pointer-events-auto group text-left"
        aria-label="Open Command Center"
      >
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-4">Hospital now</p>
          <ArrowUpRight className="h-3.5 w-3.5 text-ink-4 transition group-hover:text-accent" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Mini label="Census" value={overview?.census?.total ?? "—"} icon={HeartPulse} />
          <Mini label="Beds" value={overview?.census?.occupancyPct != null ? `${overview.census.occupancyPct}%` : "—"} icon={BedDouble} />
          <Mini
            label="Critical"
            value={String((overview?.critical?.openTasks ?? 0) + (overview?.critical?.openIncidents ?? 0))}
            icon={Siren}
            tone={(overview?.critical?.openTasks ?? 0) + (overview?.critical?.openIncidents ?? 0) > 0 ? "crit" : undefined}
          />
        </div>
        {overview?.hospital?.name && <p className="mt-3 truncate text-[11px] text-ink-4">{overview.hospital.name}</p>}
      </button>
      {/* quick actions */}
      <div className="nx-widget pointer-events-auto">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-4">Jump to</p>
        <div className="space-y-1">
          {[
            { key: "tasks", label: "My work queue" },
            { key: "beds", label: "Bed board" },
            { key: "messages", label: "Care messages" },
          ].map((a) => (
            <button
              key={a.key}
              onClick={() => openApp(a.key)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] text-ink-2 transition hover:bg-accent-soft hover:text-ink"
            >
              {a.label}
              <ArrowUpRight className="h-3.5 w-3.5 text-ink-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, icon: Icon, tone }: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; tone?: "crit";
}) {
  return (
    <div className="rounded-xl border border-line bg-inset px-2 py-2.5">
      <Icon className={cn("mx-auto h-3.5 w-3.5", tone === "crit" ? "text-crit" : "text-ink-4")} />
      <p className={cn("mt-1 text-lg font-bold leading-none tabular-nums", tone === "crit" ? "text-crit" : "text-ink")}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-4">{label}</p>
    </div>
  );
}

function ClockWidget() {
  const now = useNow(10_000);
  return (
    <div className="nx-widget">
      <p className="nx-widget-clock nx-display text-[44px] leading-none text-ink">
        {now ? now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-ink-3">
        {now ? now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : "—"}
      </p>
      <p className="mt-0.5 text-[10.5px] text-ink-4">Indian Standard Time</p>
    </div>
  );
}
