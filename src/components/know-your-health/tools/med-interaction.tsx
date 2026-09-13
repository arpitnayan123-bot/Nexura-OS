"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pill, Plus, Trash2, AlertTriangle, ShieldCheck, Activity, Sparkles, X } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import { ToolHeader, RunButton, LoadingResult, ResultCard, SeverityBadge, Disclaimer, ResetButton, showError } from "@/components/know-your-health/ui";

interface Interaction {
  drug1: string; drug2: string;
  severity: "mild"|"moderate"|"severe"|"contraindicated";
  mechanism: string; clinicalEffect: string; recommendation: string;
}
interface MedResult {
  interactions: Interaction[];
  conditionWarnings: string[];
  safeSummary: string;
  topRisks: string[];
  alternatives: string[];
  requiresPharmacistConsult: boolean;
  disclaimer: string;
}

const INDIAN_BRANDS = ["Crocin", "Dolo 650", "Glycomet", "Amlong", "Telma", "Cardace", "Ecosprin", "Azithral", "Augmentin", "Pan", "Cetzine", "Rosuvas", "Shelcal", "Becosules", "Brufen", "Metformin", "Atorvastatin", "Ramipril", "Pantoprazole", "Levothyroxine", "Amoxicillin", "Paracetamol", "Ibuprofen", "Aspirin", "Omeprazole", "Metoprolol", "Amlodipine", "Telmisartan", "Rosuvastatin", "Cetirizine"];

const SEV_COLOR: Record<string, string> = {
  mild: "#9DB89E",
  moderate: "#C9962E",
  severe: "#B8860B",
  contraindicated: "#7A4A3A",
};

const SEV_BADGE: Record<string, "low"|"moderate"|"high"|"emergency"> = {
  mild: "low",
  moderate: "moderate",
  severe: "high",
  contraindicated: "emergency",
};

const inputCls = "glass-input h-10 w-full rounded-lg px-3 text-xs outline-none";

export function MedInteraction() {
  const tool = TOOLS_BY_ID["med-interaction"];
  const accent = tool.accent;
  const [meds, setMeds] = useState<string[]>([""]);
  const [conditions, setConditions] = useState<string[]>([""]);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [kidney, setKidney] = useState("Normal");
  const [liver, setLiver] = useState("Normal");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MedResult | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const updateMed = (i: number, v: string) => { const n = [...meds]; n[i] = v; setMeds(n); };
  const addMed = () => setMeds([...meds, ""]);
  const removeMed = (i: number) => setMeds(meds.filter((_, idx) => idx !== i));
  const updateCond = (i: number, v: string) => { const n = [...conditions]; n[i] = v; setConditions(n); };
  const addCond = () => setConditions([...conditions, ""]);
  const removeCond = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i));

  const suggestions = useMemo(() => {
    if (activeIdx === null) return [];
    const q = (meds[activeIdx] || "").toLowerCase();
    if (!q) return INDIAN_BRANDS.slice(0, 8);
    return INDIAN_BRANDS.filter((b) => b.toLowerCase().includes(q) && !meds.includes(b)).slice(0, 8);
  }, [activeIdx, meds]);

  const run = async () => {
    const cleanMeds = meds.map((m) => m.trim()).filter(Boolean);
    if (cleanMeds.length < 2) { showError("Add at least 2 medications to check interactions"); return; }
    const cleanConds = conditions.map((c) => c.trim()).filter(Boolean);
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/med-interaction", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(75_000),
        body: JSON.stringify({ medications: cleanMeds, conditions: cleanConds, age: Number(age) || 0, gender, kidneyFunction: kidney, liverFunction: liver }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.detail || e?.error || "request_failed");
      }
      setResult(await res.json());
    } catch (e) {
      showError(e instanceof Error ? e.message : undefined);
    } finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setMeds([""]); setConditions([""]); };

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {!result && !loading && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="rounded-2xl glass-soft p-4 shadow-depth">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Medications ({meds.filter((m) => m.trim()).length})</p>
              <button onClick={addMed} className="flex items-center gap-1 rounded-full glass-chip px-2.5 py-1 text-[0.65rem] font-medium text-[#5A7A5B] hover:scale-105"><Plus className="h-3 w-3" /> Add medicine</button>
            </div>
            <div className="space-y-2">
              {meds.map((m, i) => (
                <div key={i} className="relative">
                  <div className="flex items-center gap-2">
                    <span className="grid h-10 w-9 shrink-0 place-items-center rounded-lg glass-chip"><Pill className="h-3.5 w-3.5" style={{ color: accent }} /></span>
                    <input
                      value={m}
                      onChange={(e) => { updateMed(i, e.target.value); setActiveIdx(i); }}
                      onFocus={() => setActiveIdx(i)}
                      onBlur={() => setTimeout(() => setActiveIdx(null), 200)}
                      placeholder="e.g. Crocin 650, Glycomet 500"
                      className={inputCls}
                    />
                    <button onClick={() => removeMed(i)} disabled={meds.length === 1} className="grid h-10 w-9 shrink-0 place-items-center rounded-lg glass-chip text-[#8A5A04] disabled:opacity-30 hover:bg-[#B8860B]/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  {activeIdx === i && suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl glass-soft p-2 shadow-depth-lg">
                      <div className="flex flex-wrap gap-1">
                        {suggestions.map((s) => (
                          <button key={s} onMouseDown={() => { updateMed(i, s); setActiveIdx(null); }} className="rounded-full glass-chip px-2.5 py-1 text-[0.65rem] text-[#5C544D] hover:scale-105">{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl glass-soft p-4 shadow-depth">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Conditions (optional)</p>
              <button onClick={addCond} className="flex items-center gap-1 rounded-full glass-chip px-2.5 py-1 text-[0.65rem] font-medium text-[#5A7A5B] hover:scale-105"><Plus className="h-3 w-3" /> Add condition</button>
            </div>
            <div className="space-y-2">
              {conditions.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={c} onChange={(e)=>updateCond(i, e.target.value)} placeholder="e.g. Diabetes, Hypertension, Asthma" className={inputCls} />
                  <button onClick={() => removeCond(i)} disabled={conditions.length === 1} className="grid h-10 w-9 shrink-0 place-items-center rounded-lg glass-chip text-[#8A5A04] disabled:opacity-30 hover:bg-[#B8860B]/10"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl glass-soft p-4 shadow-depth sm:grid-cols-4">
            <div><label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Age</label><input type="number" value={age} onChange={(e)=>setAge(e.target.value)} className={inputCls} placeholder="45" /></div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Gender</label>
              <select value={gender} onChange={(e)=>setGender(e.target.value)} className={inputCls}><option>male</option><option>female</option><option>other</option></select>
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Kidney function</label>
              <select value={kidney} onChange={(e)=>setKidney(e.target.value)} className={inputCls}><option>Normal</option><option>Mild impairment</option><option>Moderate</option><option>Severe</option></select>
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Liver function</label>
              <select value={liver} onChange={(e)=>setLiver(e.target.value)} className={inputCls}><option>Normal</option><option>Mild impairment</option><option>Moderate</option><option>Severe</option></select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={meds.filter((m) => m.trim()).length < 2} accent={accent} label="Check interactions" />
            <span className="text-[0.65rem] text-[#9A8F84]">Indian brand-aware · drug-drug & drug-condition</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
            <ResultCard accent={accent} title="Safety Summary">
              <div className="flex items-center gap-2">
                {result.requiresPharmacistConsult ? (
                  <span className="rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ background:"#A1620715", color:"#8A5A04" }}>⚠️ Pharmacist consult advised</span>
                ) : (
                  <span className="rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ background:"#9DB89E15", color:"#5A7A5B" }}><ShieldCheck className="mr-1 inline h-3 w-3" /> No major concerns</span>
                )}
                <span className="rounded-full glass-chip px-2.5 py-0.5 text-[0.65rem] font-medium text-[#5C544D]">{result.interactions?.length || 0} interactions found</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#1F1B17]">{result.safeSummary}</p>
            </ResultCard>

            {result.interactions?.length > 0 ? (
              <div className="space-y-2.5">
                {[...result.interactions].sort((a, b) => {
                  const order = { contraindicated: 0, severe: 1, moderate: 2, mild: 3 };
                  return (order[a.severity as keyof typeof order] ?? 4) - (order[b.severity as keyof typeof order] ?? 4);
                }).map((it, i) => (
                  <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className="overflow-hidden rounded-2xl glass-soft shadow-depth">
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background:`linear-gradient(135deg, ${SEV_COLOR[it.severity]}15, ${SEV_COLOR[it.severity]}08)` }}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" style={{ color: SEV_COLOR[it.severity] }} />
                        <p className="text-sm font-semibold text-[#1F1B17]">{it.drug1} <span className="text-[#9A8F84]">+</span> {it.drug2}</p>
                      </div>
                      <SeverityBadge level={SEV_BADGE[it.severity]} />
                    </div>
                    <div className="space-y-1.5 px-4 py-2.5">
                      <p className="text-xs"><span className="font-medium text-[#5C544D]">Mechanism:</span> <span className="text-[#1F1B17]">{it.mechanism}</span></p>
                      <p className="text-xs"><span className="font-medium text-[#5C544D]">Effect:</span> <span className="text-[#1F1B17]">{it.clinicalEffect}</span></p>
                      <p className="text-xs"><span className="font-medium text-[#5C544D]">Action:</span> <span className="text-[#1F1B17]">{it.recommendation}</span></p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <ResultCard accent="#9DB89E" title="No Interactions Found">
                <p className="text-sm text-[#1F1B17]">No clinically significant drug-drug interactions detected for the medicines you listed. Continue as prescribed and consult your doctor if you notice side effects.</p>
              </ResultCard>
            )}

            {result.conditionWarnings?.length > 0 && (
              <ResultCard accent="#C9962E" title="Condition Warnings">
                <ul className="space-y-2">
                  {result.conditionWarnings.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C9962E]" /><span>{c}</span></li>
                  ))}
                </ul>
              </ResultCard>
            )}

            {result.topRisks?.length > 0 && (
              <ResultCard accent="#B8860B" title="Top Risks">
                <ul className="space-y-2">
                  {result.topRisks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#8A5A04]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{r}</span></li>
                  ))}
                </ul>
              </ResultCard>
            )}

            {result.alternatives?.length > 0 && (
              <ResultCard accent="#5A7A5B" title="Safer Alternatives">
                <ul className="space-y-2">
                  {result.alternatives.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" /><span>{r}</span></li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><Activity className="h-3 w-3" /> Never stop prescribed medication without your doctor's advice</span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
