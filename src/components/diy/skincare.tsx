"use client";

/* ============================================================
 * NEXURA DIY — SKINCARE CENTER
 * Three honest levels (minimal / core / full), patch-test gate,
 * pregnancy-safe scrubbing, and irritation escalation-pause.
 * ============================================================ */

import { useState } from "react";
import { Sparkles, ShieldAlert, Check } from "lucide-react";
import { diyFetch } from "./client-types";
import { Scenery } from "./scenery";

interface Routine {
  name: string;
  level: string;
  steps: { slot: string; title: string; detail: string }[];
  patchTestRule: string;
  stopRule: string;
  sources: string[];
}

const LEVELS = [
  { key: "minimal", label: "Minimal", blurb: "Barrier only — cleanse, moisturize, sunscreen." },
  { key: "core", label: "Core", blurb: "Barrier + one patch-tested active (niacinamide)." },
  { key: "full", label: "Full", blurb: "Structured ladder with two actives on alternate nights." },
] as const;

export function Skincare() {
  const [level, setLevel] = useState<string>("core");
  const [sensitive, setSensitive] = useState(false);
  const [pregnant, setPregnant] = useState(false);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [busy, setBusy] = useState(false);
  const [eventMsg, setEventMsg] = useState<string | null>(null);
  const [eventSeverity, setEventSeverity] = useState("mild");
  const [eventType, setEventType] = useState("irritation");

  const start = async () => {
    setBusy(true);
    try {
      const res = await diyFetch<{ routine: Routine }>("/api/diy/skincare", {
        method: "POST",
        body: JSON.stringify({ level, sensitiveSkin: sensitive, pregnantOrBreastfeeding: pregnant }),
      });
      setRoutine(res.routine);
      setEventMsg(null);
    } finally {
      setBusy(false);
    }
  };

  const report = async () => {
    setBusy(true);
    try {
      const res = await diyFetch<{ paused: boolean; message: string }>("/api/diy/skincare", {
        method: "PUT",
        body: JSON.stringify({ eventType, severity: eventSeverity, detail: "reported from skincare center" }),
      });
      setEventMsg(res.message);
      if (res.paused) setRoutine((r) => (r ? { ...r, name: `${r.name} — PAUSED` } : r));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-28">
      <section className="relative h-36 overflow-hidden">
        <Scenery className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-0 bottom-4 z-10 mx-auto w-[min(94%,680px)]">
          <div className="nx-glass-deep rounded-2xl px-5 py-3.5">
            <p className="text-sm font-semibold text-[#2E2A26]">Skincare center</p>
            <p className="text-xs text-[#6B5D4E]">Barrier first, patch tests always, actives never stacked.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-[min(94%,680px)] space-y-5 pt-6">
        <section className="nx-glass-deep rounded-3xl p-5">
          <p className="mb-3 text-sm font-semibold text-[#2E2A26]">Choose your level</p>
          <div className="space-y-2.5">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLevel(l.key)}
                aria-pressed={level === l.key}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${level === l.key ? "border-[#C96F45] bg-[#FDF3E7]" : "border-[#EADDC7] bg-[#FFFDF8] hover:border-[#D9C8AC]"}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${level === l.key ? "border-[#C96F45] bg-[#C96F45] text-white" : "border-[#D9C8AC]"}`}>
                  {level === l.key && <Check size={12} aria-hidden />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-[#2E2A26]">{l.label}</span>
                  <span className="block text-xs text-[#6B5D4E]">{l.blurb}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-xs text-[#6B5D4E]">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} className="accent-[#B05A34]" />
              Sensitive skin (reacts easily)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} className="accent-[#B05A34]" />
              Pregnant or breastfeeding (actives are removed — obstetrician-guided only)
            </label>
          </div>
          <button onClick={start} disabled={busy} className="diy-btn-primary mt-5 w-full text-sm">
            <Sparkles size={15} aria-hidden /> {busy ? "Preparing…" : "Get my routine"}
          </button>
        </section>

        {routine && (
          <section className="rounded-3xl border border-[#EADDC7] bg-[#FFFDF8] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#2E2A26]">{routine.name}</p>
              <span className="rounded-full bg-[#F1E6D4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#8A7454]">{routine.level}</span>
            </div>
            <ol className="mt-4 space-y-2.5">
              {routine.steps.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-2xl bg-[#FBF5EA] p-3.5">
                  <span className="mt-0.5 h-fit rounded-full bg-[#7A9A7B]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4E6845]">{s.slot}</span>
                  <div>
                    <p className="text-sm font-medium text-[#2E2A26]">{s.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#6B5D4E]">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 space-y-1.5 border-t border-[#F0E4CE] pt-3 text-[11px] leading-relaxed text-[#8A7454]">
              <p><strong>Patch test:</strong> {routine.patchTestRule}</p>
              <p><strong>Stop rule:</strong> {routine.stopRule}</p>
              <p><strong>Sources:</strong> {routine.sources.join(", ")}</p>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-[#E8CFC6] bg-[#FDF1EC] p-5">
          <div className="flex items-center gap-2 text-[#A93226]">
            <ShieldAlert size={16} aria-hidden />
            <p className="text-sm font-semibold">Something feel wrong?</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[#7B3A30]">Burning, peeling, spreading redness or a patch-test reaction — report it. Moderate or severe reactions pause your skincare tasks for your protection.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} aria-label="Event type" className="h-10 rounded-full border border-[#E0C4B8] bg-white px-3 text-xs">
              <option value="irritation">Irritation</option>
              <option value="patch_reaction">Patch reaction</option>
              <option value="breakout_spike">Breakout spike</option>
              <option value="other">Other</option>
            </select>
            <select value={eventSeverity} onChange={(e) => setEventSeverity(e.target.value)} aria-label="Severity" className="h-10 rounded-full border border-[#E0C4B8] bg-white px-3 text-xs">
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
            <button onClick={report} disabled={busy} className="diy-btn-primary px-5 text-xs">Report</button>
          </div>
          {eventMsg && <p className="mt-3 rounded-xl bg-white/80 p-3 text-xs leading-relaxed text-[#7B3A30]">{eventMsg}</p>}
        </section>
      </div>
    </div>
  );
}
