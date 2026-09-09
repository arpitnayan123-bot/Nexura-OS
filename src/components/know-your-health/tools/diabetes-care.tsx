"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, AlertCircle, Sparkles, Utensils } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import { ToolHeader, RunButton, LoadingResult, ResultCard, SeverityBadge, Disclaimer, ResetButton, showError } from "@/components/know-your-health/ui";

interface DiabetesResult {
  status: "controlled"|"borderline"|"uncontrolled";
  fastingAssessment: string;
  postMealAssessment: string;
  hba1cAssessment: string;
  trendAnalysis: string;
  recommendations: string[];
  alertFlags: string[];
  indianDietTips: string[];
}

const STATUS_MAP = {
  controlled: { bg: "#9DB89E15", text: "#5A7A5B", label: "Controlled", accent: "#9DB89E" },
  borderline: { bg: "#E0B08015", text: "#B8893D", label: "Borderline", accent: "#E0B080" },
  uncontrolled: { bg: "#C98A7A20", text: "#7A4A3A", label: "Uncontrolled", accent: "#C98A7A" },
};

const inputCls = "glass-input h-10 w-full rounded-lg px-3 text-xs outline-none";

export function DiabetesCare() {
  const tool = TOOLS_BY_ID["diabetes-care"];
  const accent = tool.accent;
  const [f, setF] = useState({ fastingSugar: "", postMealSugar: "", hba1c: "", lastMeal: "", medications: "", activity: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiabetesResult | null>(null);
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  const run = async () => {
    if (!f.fastingSugar && !f.postMealSugar && !f.hba1c) { showError("Enter at least one sugar value or HbA1c"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/diabetes-care", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, fastingSugar: Number(f.fastingSugar) || 0, postMealSugar: Number(f.postMealSugar) || 0, hba1c: f.hba1c ? Number(f.hba1c) : undefined }),
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

  const reset = () => setResult(null);

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {!result && !loading && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-2xl glass-soft p-4 shadow-depth sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Fasting Sugar (mg/dL)</label>
              <input type="number" value={f.fastingSugar} onChange={(e)=>set("fastingSugar", e.target.value)} className={inputCls} placeholder="80-130" />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Post-Meal Sugar (mg/dL)</label>
              <input type="number" value={f.postMealSugar} onChange={(e)=>set("postMealSugar", e.target.value)} className={inputCls} placeholder="<180" />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">HbA1c (%)</label>
              <input type="number" step="0.1" value={f.hba1c} onChange={(e)=>set("hba1c", e.target.value)} className={inputCls} placeholder="optional" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-2xl glass-soft p-4 shadow-depth sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Last meal</label>
              <input value={f.lastMeal} onChange={(e)=>set("lastMeal", e.target.value)} className={inputCls} placeholder="2 roti, dal, sabzi" />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Current medications</label>
              <input value={f.medications} onChange={(e)=>set("medications", e.target.value)} className={inputCls} placeholder="Metformin 500mg" />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Activity today</label>
              <input value={f.activity} onChange={(e)=>set("activity", e.target.value)} className={inputCls} placeholder="30 min walk" />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Notes</label>
              <input value={f.notes} onChange={(e)=>set("notes", e.target.value)} className={inputCls} placeholder="felt shaky in afternoon" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={loading} accent={accent} label="Analyze my diabetes log" />
            <span className="text-[0.65rem] text-[#9A8F84]">ICMR-INDIAB targets</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
            <ResultCard accent={accent} title="Diabetes Status">
              <div className="flex flex-col items-center gap-3 py-3">
                <div className="relative grid h-24 w-24 place-items-center rounded-full shadow-depth" style={{ background:`linear-gradient(135deg, ${STATUS_MAP[result.status].accent}, ${STATUS_MAP[result.status].accent}cc)` }}>
                  <HeartPulse className="h-9 w-9 text-white" />
                </div>
                <div className="text-center">
                  <p className="font-serif text-2xl font-bold text-[#1F1B17]">{STATUS_MAP[result.status].label}</p>
                  <p className="text-[0.65rem] text-[#9A8F84]">Glycemic control interpretation</p>
                </div>
              </div>
            </ResultCard>

            <div className="grid gap-3 sm:grid-cols-3">
              <AssessCard label="Fasting" text={result.fastingAssessment} accent="#9DB89E" />
              <AssessCard label="Post-Meal" text={result.postMealAssessment} accent="#D98B6E" />
              <AssessCard label="HbA1c" text={result.hba1cAssessment} accent="#E0B080" />
            </div>

            <ResultCard accent="#7A9A7B" title="Trend Analysis">
              <p className="text-sm leading-relaxed text-[#1F1B17]">{result.trendAnalysis}</p>
            </ResultCard>

            {result.alertFlags?.length > 0 && (
              <ResultCard accent="#C98A7A" title="Alert Flags">
                <ul className="space-y-2">
                  {result.alertFlags.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#9A6A5A]"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{a}</span></li>
                  ))}
                </ul>
              </ResultCard>
            )}

            {result.recommendations?.length > 0 && (
              <ResultCard accent="#5A7A5B" title="Recommendations">
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" /><span>{r}</span></li>
                  ))}
                </ul>
              </ResultCard>
            )}

            {result.indianDietTips?.length > 0 && (
              <ResultCard accent="#D98B6E" title="Indian Diet Tips">
                <ul className="space-y-2">
                  {result.indianDietTips.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]"><Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D98B6E]" /><span>{r}</span></li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AssessCard({ label, text, accent }: { label: string; text: string; accent: string; }) {
  return (
    <div className="overflow-hidden rounded-2xl glass-soft shadow-depth">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white" style={{ background:`linear-gradient(135deg, ${accent}, ${accent}cc)` }}>{label}</div>
      <p className="p-3 text-xs leading-relaxed text-[#1F1B17]">{text}</p>
    </div>
  );
}
