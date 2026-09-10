"use client";

/* ============================================================
 * PIE UI — TwinSimulator
 * The Counterfactual "What-If" widget: pick interventions, run
 * them on the Living Twin, see projected outcomes (HbA1c, BP,
 * kidney protection, chronic decay delta) with shared-decision
 * caveats. Used in the clinician deep-dive and patient forecast.
 * ============================================================ */

import { useState } from "react";
import { FlaskConical, Loader2, TrendingDown, TrendingUp } from "lucide-react";

interface CatalogItem {
  id: string;
  label: string;
  kind: "medication" | "lifestyle";
}

interface OutcomeLine {
  label: string;
  delta: string;
  direction: "better" | "worse" | "neutral";
}

interface Outcome {
  intervention: CatalogItem & { horizonDays: number };
  baselineRisk: number;
  projectedRisk: number;
  riskDelta: number;
  outcomeLines: OutcomeLine[];
  caveats: string[];
}

export function TwinSimulator({
  patientId,
  catalog,
  onSimulated,
}: {
  patientId: string;
  catalog: CatalogItem[];
  onSimulated?: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(catalog.length ? [catalog[0].id] : []);
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.slice(-3), id]));
  }

  async function run() {
    if (!selected.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/nx/predict/twin/${patientId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interventionIds: selected }),
      });
      const json = await res.json();
      if (res.ok && json?.data?.outcomes) {
        setOutcomes(json.data.outcomes);
        onSimulated?.();
      } else {
        setError("Simulation unavailable for this patient");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-violet-200/60 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        <h4 className="text-sm font-semibold">What-If Simulator</h4>
        <span className="text-[10px] text-muted-foreground">· runs on the Living Twin</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {catalog.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              selected.includes(c.id)
                ? "border-violet-500 bg-violet-600 text-white dark:bg-violet-600"
                : "border-black/10 bg-white/70 hover:border-violet-400 dark:border-white/15 dark:bg-white/5"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <button
        onClick={run}
        disabled={busy || !selected.length}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
        Simulate {selected.length ? `(${selected.length})` : ""}
      </button>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {outcomes && (
        <div className="mt-3 space-y-2.5">
          {outcomes.map((o) => (
            <div key={o.intervention.id} className="rounded-xl border border-black/8 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">{o.intervention.label}</p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    o.riskDelta < -0.05
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : o.riskDelta > 0.05
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                        : "bg-black/5 text-muted-foreground dark:bg-white/10"
                  }`}
                >
                  {o.riskDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {o.riskDelta > 0 ? "+" : ""}
                  {o.riskDelta} pts
                </span>
              </div>
              <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                {o.outcomeLines.map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-muted-foreground">{l.label}</span>
                    <span
                      className={`font-semibold ${
                        l.direction === "better" ? "text-emerald-600 dark:text-emerald-400" : l.direction === "worse" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                      }`}
                    >
                      {l.delta}
                    </span>
                  </li>
                ))}
              </ul>
              {o.caveats.length > 0 && (
                <p className="mt-1.5 border-t border-dashed border-black/10 pt-1.5 text-[10px] leading-relaxed text-muted-foreground dark:border-white/10">
                  {o.caveats[0]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
