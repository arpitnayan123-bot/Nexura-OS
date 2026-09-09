"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplet, Plus, Trash2, Activity, Sparkles, AlertCircle, TrendingUp } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import { ToolHeader, RunButton, LoadingResult, ResultCard, SeverityBadge, Disclaimer, ResetButton, showError } from "@/components/know-your-health/ui";

interface Reading { systolic: string; diastolic: string; date: string; time: string; arm: string; position: string; }
interface BPResult {
  classification: string;
  averageSystolic: number;
  averageDiastolic: number;
  pulsePressure: number;
  trend: string;
  pattern: string;
  whiteCoatSuspected: boolean;
  targetRange: string;
  recommendations: string[];
  whenToSeeDoctor: string;
}

const CLASS_COLOR: Record<string, string> = {
  "Normal": "#5A7A5B",
  "Elevated": "#E0B080",
  "Stage 1 Hypertension": "#D98B6E",
  "Stage 2 Hypertension": "#C98A7A",
  "Hypertensive Crisis": "#7A4A3A",
};

const inputCls = "glass-input h-10 w-full rounded-lg px-2.5 text-xs outline-none";

export function BpAnalyzer() {
  const tool = TOOLS_BY_ID["bp-analyzer"];
  const accent = tool.accent;
  const [readings, setReadings] = useState<Reading[]>([{ systolic: "", diastolic: "", date: "", time: "", arm: "Left", position: "Sitting" }]);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BPResult | null>(null);

  const addRow = () => setReadings([...readings, { systolic: "", diastolic: "", date: "", time: "", arm: "Left", position: "Sitting" }]);
  const removeRow = (i: number) => setReadings(readings.filter((_, idx) => idx !== i));
  const update = (i: number, k: keyof Reading, v: string) => setReadings(readings.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  const run = async () => {
    const clean = readings.filter((r) => r.systolic && r.diastolic).map((r) => ({ ...r, systolic: Number(r.systolic), diastolic: Number(r.diastolic) }));
    if (clean.length === 0) { showError("Add at least one valid BP reading"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/bp-analyzer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readings: clean, age: Number(age) || 0, gender }),
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

  const reset = () => { setResult(null); setReadings([{ systolic: "", diastolic: "", date: "", time: "", arm: "Left", position: "Sitting" }]); };

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {!result && !loading && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-2xl glass-soft p-4 shadow-depth">
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Age</label>
              <input type="number" value={age} onChange={(e)=>setAge(e.target.value)} className={inputCls} placeholder="45" />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Gender</label>
              <select value={gender} onChange={(e)=>setGender(e.target.value)} className={inputCls}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl glass-soft p-4 shadow-depth">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C544D]">BP Readings ({readings.length})</p>
              <button onClick={addRow} className="flex items-center gap-1 rounded-full glass-chip px-2.5 py-1 text-[0.65rem] font-medium text-[#5A7A5B] hover:scale-105"><Plus className="h-3 w-3" /> Add reading</button>
            </div>
            <div className="space-y-2">
              {readings.map((r, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-xl bg-[#FAF7F2]/60 p-2 sm:grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_0.6fr_0.7fr_auto]">
                  <input type="number" value={r.systolic} onChange={(e)=>update(i,"systolic",e.target.value)} placeholder="Sys" className={inputCls} />
                  <input type="number" value={r.diastolic} onChange={(e)=>update(i,"diastolic",e.target.value)} placeholder="Dia" className={inputCls} />
                  <input type="date" value={r.date} onChange={(e)=>update(i,"date",e.target.value)} className={inputCls} />
                  <input type="time" value={r.time} onChange={(e)=>update(i,"time",e.target.value)} className={inputCls} />
                  <select value={r.arm} onChange={(e)=>update(i,"arm",e.target.value)} className={inputCls}>
                    <option>Left</option><option>Right</option>
                  </select>
                  <select value={r.position} onChange={(e)=>update(i,"position",e.target.value)} className={inputCls}>
                    <option>Sitting</option><option>Standing</option><option>Lying</option>
                  </select>
                  <button onClick={() => removeRow(i)} disabled={readings.length === 1} className="grid h-10 w-9 place-items-center rounded-lg glass-chip text-[#9A6A5A] disabled:opacity-30 hover:bg-[#C98A7A]/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={!readings.some((r) => r.systolic && r.diastolic)} accent={accent} label="Classify & analyse" />
            <span className="text-[0.65rem] text-[#9A8F84]">ACC/AHA 2017 + ICMR guidelines</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
            <ResultCard accent={accent} title="BP Classification">
              <div className="flex flex-col items-center py-3">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="grid h-20 w-20 place-items-center rounded-full shadow-depth" style={{ background:`linear-gradient(135deg, ${CLASS_COLOR[result.classification] || accent}, ${CLASS_COLOR[result.classification] || accent}cc)` }}>
                  <Droplet className="h-9 w-9 text-white" />
                </motion.div>
                <p className="mt-2 font-serif text-xl font-bold text-center text-[#1F1B17]">{result.classification}</p>
                <p className="mt-1 font-serif text-3xl font-bold text-[#1F1B17]">{result.averageSystolic}<span className="text-[#9A8F84]">/</span>{result.averageDiastolic}<span className="ml-1 text-sm text-[#9A8F84]">mmHg</span></p>
                <p className="text-[0.65rem] text-[#9A8F84]">Pulse pressure: {result.pulsePressure} mmHg</p>
                {result.whiteCoatSuspected && (
                  <span className="mt-2 rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ background:"#E0B08015", color:"#B8893D" }}>⚠️ White-coat suspected</span>
                )}
              </div>
            </ResultCard>

            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard accent="#9DB89E" title="Pattern & Trend">
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-[#9DB89E]" /><span className="text-xs font-semibold uppercase tracking-wider text-[#5A7A5B]">Trend</span><span className="rounded-full glass-chip px-2 py-0.5 text-[0.6rem] capitalize text-[#5C544D]">{result.trend}</span></div>
                  <p className="text-xs leading-relaxed text-[#1F1B17]">{result.pattern}</p>
                </div>
              </ResultCard>
              <ResultCard accent="#7A9A7B" title="Target Range">
                <p className="text-xs leading-relaxed text-[#1F1B17]">{result.targetRange}</p>
              </ResultCard>
            </div>

            {result.recommendations?.length > 0 && (
              <ResultCard accent="#5A7A5B" title="Recommendations">
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" /><span>{r}</span></li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <ResultCard accent="#C98A7A" title="When to See a Doctor">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#9A6A5A]" />
                <p className="text-sm leading-relaxed text-[#1F1B17]">{result.whenToSeeDoctor}</p>
              </div>
            </ResultCard>

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><Activity className="h-3 w-3" /> Track BP at the same time daily for best results</span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
