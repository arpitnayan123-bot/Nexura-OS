"use client";

/* ============================================================
 * WORKSPACE HEADER — the analysis command bar.
 * Breadcrumb, title, live status, data currency, forecast
 * horizon selector, executive exports, refresh & configure.
 * Every control does something real (no decorative buttons).
 * ============================================================ */

import { useEffect, useState } from "react";
import { Check, Copy, FileJson, RefreshCw, SlidersHorizontal } from "lucide-react";
import type { ForesightReport } from "@/modules/foresight/types";
import { HORIZONS, type HorizonYears } from "@/modules/foresight/workspace";
import { Eyebrow } from "../ui";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function WorkspaceHeader({
  report,
  horizon,
  onHorizon,
  simActive,
  briefText,
  onRefresh,
  onConfigure,
}: {
  report: ForesightReport;
  horizon: HorizonYears;
  onHorizon: (h: HorizonYears) => void;
  simActive: boolean;
  briefText: string;
  onRefresh: () => void;
  onConfigure: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [jsonSaved, setJsonSaved] = useState(false);
  const [updated, setUpdated] = useState("");

  /* data-currency stamp resolves client-side only (SSR-safe) */
  useEffect(() => {
    const t = window.setTimeout(() => setUpdated(relativeTime(report.generatedAt)), 0);
    return () => window.clearTimeout(t);
  }, [report.generatedAt]);

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(briefText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  const downloadJson = () => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), report }, null, 2)],
      {
        type: "application/json",
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexura-foresight-${report.generatedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setJsonSaved(true);
    window.setTimeout(() => setJsonSaved(false), 2400);
  };

  return (
    <section aria-label="Predictive Analysis workspace header" className="pt-1">
      <p className="text-[11px] font-medium tracking-wide nxf-mute">
        <span>Hospital OS</span>
        <span aria-hidden="true" className="mx-1.5 nxf-gold">
          /
        </span>
        <span>Predictive</span>
        <span aria-hidden="true" className="mx-1.5 nxf-gold">
          /
        </span>
        <span className="nxf-body">Foresight Map</span>
      </p>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <Eyebrow className="mb-1.5">Health Foresight · engine {report.engineVersion}</Eyebrow>
          <h1 className="font-display text-3xl font-semibold tracking-tight nxf-hi sm:text-4xl">
            Predictive Analysis
          </h1>
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed nxf-dim">
            What your signals say about the next five years — forecast, confidence, drivers, risks
            and the actions that bend the curve.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* live status */}
          <span
            role="status"
            aria-live="polite"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]",
              simActive
                ? "border-amber-300/60 bg-amber-300/[0.14] nxf-gold"
                : "border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                simActive ? "bg-amber-300 nxf-pulse-dot" : "bg-emerald-300",
              )}
            />
            {simActive ? "simulation live" : "current"}
          </span>
          <span className="text-[11.5px] nxf-mute">
            updated <span className="nxf-mono nxf-dim">{updated || "…"}</span>
          </span>
        </div>
      </div>

      {/* control rail */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-white/[0.09] bg-white/[0.03] px-4 py-3">
        <div role="group" aria-label="Forecast horizon" className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] nxf-mute">
            Horizon
          </span>
          <div className="nxf-seg" role="radiogroup" aria-label="Forecast horizon in years">
            {HORIZONS.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={horizon === h}
                onClick={() => onHorizon(h)}
                className={cn("nxf-seg-btn", horizon === h && "nxf-seg-on")}
              >
                +{h}y
              </button>
            ))}
          </div>
        </div>

        <span aria-hidden="true" className="hidden h-5 w-px bg-white/10 sm:block" />

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="nxf-pill !py-2" onClick={() => void copyBrief()}>
            {copied ? (
              <Check className="h-3.5 w-3.5 nxf-teal" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5 nxf-mute" aria-hidden="true" />
            )}
            <span>{copied ? "Brief copied" : "Copy executive brief"}</span>
          </button>
          <button type="button" className="nxf-pill !py-2" onClick={downloadJson}>
            <FileJson className="h-3.5 w-3.5 nxf-mute" aria-hidden="true" />
            <span>{jsonSaved ? "Saved ✓" : "Download data"}</span>
          </button>
        </div>

        <span aria-hidden="true" className="hidden h-5 w-px bg-white/10 sm:block" />

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="nxf-pill !py-2" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5 nxf-mute" aria-hidden="true" />
            <span>Re-run check-in</span>
          </button>
          <button type="button" className="nxf-pill !py-2" onClick={onConfigure}>
            <SlidersHorizontal className="h-3.5 w-3.5 nxf-mute" aria-hidden="true" />
            <span>Edit inputs</span>
          </button>
        </div>
      </div>
    </section>
  );
}
