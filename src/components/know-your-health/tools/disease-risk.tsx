"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, ShieldAlert, Droplet, Activity, Sparkles } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import { ToolHeader, RunButton, LoadingResult, ResultCard, SeverityBadge, Disclaimer, ResetButton, showError } from "@/components/know-your-health/ui";

interface RiskBlock { score: number; level: "low"|"moderate"|"high"; explanation: string; recommendations: string[]; }
interface DiseaseResult {
  diabetesRisk: RiskBlock; cvdRisk: RiskBlock; ckdRisk: RiskBlock;
  overallSummary: string; topRecommendations: string[];
}

const OPTIONS_PHYSICAL = ["Sedentary (desk job, no exercise)", "Light (occasional walks)", "Moderate (30 min most days)", "Active (daily exercise)", "Very active (athlete-level)"];
const OPTIONS_DIET = ["Mostly junk / fried", "Mixed veg / non-veg", "Mostly vegetarian home-cooked", "Balanced with fruits & veg", "Strict healthy / Mediterranean"];
const OPTIONS_SLEEP = ["<5 hrs", "5-6 hrs", "6-7 hrs", "7-8 hrs", ">8 hrs"];
const OPTIONS_STRESS = ["Low", "Moderate", "High", "Very high"];
const OPTIONS_ALCOHOL = ["Never", "Occasional (1-2/week)", "Regular (3-5/week)", "Daily"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "glass-input h-10 w-full rounded-lg px-2.5 text-xs outline-none";

export function DiseaseRisk() {
  const tool = TOOLS_BY_ID["disease-risk"];
  const accent = tool.accent;
  const [f, setF] = useState({
    age: "35", gender: "male", heightCm: "170", weightKg: "70", waistCm: "85",
    familyHistoryDiabetes: false, familyHistoryHeart: false, smoker: false,
    alcohol: "Occasional (1-2/week)", physicalActivity: "Light (occasional walks)",
    diet: "Mixed veg / non-veg", sleep: "6-7 hrs", stress: "Moderate",
    bpSystolic: "120", bpDiastolic: "80", cholesterol: "", fastingSugar: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiseaseResult | null>(null);

  const set = (k: keyof typeof f, v: string|boolean) => setF({ ...f, [k]: v });

  const run = async () => {
    const payload = {
      ...f,
      age: Number(f.age), heightCm: Number(f.heightCm), weightKg: Number(f.weightKg), waistCm: Number(f.waistCm),
      bpSystolic: Number(f.bpSystolic), bpDiastolic: Number(f.bpDiastolic),
      cholesterol: f.cholesterol ? Number(f.cholesterol) : undefined,
      fastingSugar: f.fastingSugar ? Number(f.fastingSugar) : undefined,
    };
    if (!payload.age || !payload.heightCm || !payload.weightKg) { showError("Please fill age, height and weight"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/disease-risk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(75_000),
        body: JSON.stringify(payload),
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
          <div className="grid grid-cols-2 gap-3 rounded-2xl glass-soft p-4 shadow-depth sm:grid-cols-4">
            <Field label="Age"><input type="number" value={f.age} onChange={(e)=>set("age", e.target.value)} className={inputCls} /></Field>
            <Field label="Gender">
              <select value={f.gender} onChange={(e)=>set("gender", e.target.value)} className={inputCls}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </Field>
            <Field label="Height (cm)"><input type="number" value={f.heightCm} onChange={(e)=>set("heightCm", e.target.value)} className={inputCls} /></Field>
            <Field label="Weight (kg)"><input type="number" value={f.weightKg} onChange={(e)=>set("weightKg", e.target.value)} className={inputCls} /></Field>
            <Field label="Waist (cm)"><input type="number" value={f.waistCm} onChange={(e)=>set("waistCm", e.target.value)} className={inputCls} /></Field>
            <Field label="BP Systolic"><input type="number" value={f.bpSystolic} onChange={(e)=>set("bpSystolic", e.target.value)} className={inputCls} /></Field>
            <Field label="BP Diastolic"><input type="number" value={f.bpDiastolic} onChange={(e)=>set("bpDiastolic", e.target.value)} className={inputCls} /></Field>
            <Field label="Total Cholesterol (mg/dL)"><input type="number" value={f.cholesterol} onChange={(e)=>set("cholesterol", e.target.value)} placeholder="optional" className={inputCls} /></Field>
            <Field label="Fasting Sugar (mg/dL)"><input type="number" value={f.fastingSugar} onChange={(e)=>set("fastingSugar", e.target.value)} placeholder="optional" className={inputCls} /></Field>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl glass-soft p-4 shadow-depth sm:grid-cols-2">
            <Field label="Physical Activity">
              <select value={f.physicalActivity} onChange={(e)=>set("physicalActivity", e.target.value)} className={inputCls}>{OPTIONS_PHYSICAL.map(o=><option key={o}>{o}</option>)}</select>
            </Field>
            <Field label="Diet Pattern">
              <select value={f.diet} onChange={(e)=>set("diet", e.target.value)} className={inputCls}>{OPTIONS_DIET.map(o=><option key={o}>{o}</option>)}</select>
            </Field>
            <Field label="Sleep">
              <select value={f.sleep} onChange={(e)=>set("sleep", e.target.value)} className={inputCls}>{OPTIONS_SLEEP.map(o=><option key={o}>{o}</option>)}</select>
            </Field>
            <Field label="Stress Level">
              <select value={f.stress} onChange={(e)=>set("stress", e.target.value)} className={inputCls}>{OPTIONS_STRESS.map(o=><option key={o}>{o}</option>)}</select>
            </Field>
            <Field label="Alcohol">
              <select value={f.alcohol} onChange={(e)=>set("alcohol", e.target.value)} className={inputCls}>{OPTIONS_ALCOHOL.map(o=><option key={o}>{o}</option>)}</select>
            </Field>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-xs text-[#1F1B17]"><input type="checkbox" checked={f.smoker} onChange={(e)=>set("smoker", e.target.checked)} className="accent-[#B8860B]" /> Smoker</label>
              <label className="flex items-center gap-2 text-xs text-[#1F1B17]"><input type="checkbox" checked={f.familyHistoryDiabetes} onChange={(e)=>set("familyHistoryDiabetes", e.target.checked)} className="accent-[#B8860B]" /> Family history of diabetes</label>
              <label className="flex items-center gap-2 text-xs text-[#1F1B17]"><input type="checkbox" checked={f.familyHistoryHeart} onChange={(e)=>set("familyHistoryHeart", e.target.checked)} className="accent-[#B8860B]" /> Family history of heart disease</label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={loading} accent={accent} label="Estimate 10-year risk" />
            <span className="text-[0.65rem] text-[#9A8F84]">ICMR-INDIAB · ASCVD · KFRE · Indian context</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
            <ResultCard accent={accent} title="Overall Risk Picture">
              <p className="text-sm leading-relaxed text-[#1F1B17]">{result.overallSummary}</p>
            </ResultCard>

            <div className="grid gap-3 sm:grid-cols-3">
              <RiskCard label="Type 2 Diabetes" risk={result.diabetesRisk} accent="#B8860B" icon={<Droplet className="h-4 w-4" />} />
              <RiskCard label="Cardiovascular (CVD)" risk={result.cvdRisk} accent="#A16207" icon={<HeartPulse className="h-4 w-4" />} />
              <RiskCard label="Chronic Kidney" risk={result.ckdRisk} accent="#9DB89E" icon={<ShieldAlert className="h-4 w-4" />} />
            </div>

            {result.topRecommendations?.length > 0 && (
              <ResultCard accent="#5A7A5B" title="Top Recommendations">
                <ul className="space-y-2">
                  {result.topRecommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><Activity className="h-3 w-3" /> Risk estimate, not a diagnosis</span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RiskCard({ label, risk, accent, icon }: { label: string; risk: RiskBlock; accent: string; icon: React.ReactNode; }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(risk.score) || 0)));
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="overflow-hidden rounded-2xl glass-soft shadow-depth">
      <div className="flex items-center gap-2 px-4 py-2.5 text-white" style={{ background:`linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="font-serif text-3xl font-bold text-[#1F1B17]">{pct}%</p>
            <p className="text-[0.65rem] text-[#9A8F84]">10-year risk</p>
          </div>
          <SeverityBadge level={risk.level === "low" ? "low" : risk.level === "moderate" ? "moderate" : "high"} />
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#EFE9E0]">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full" style={{ background:`linear-gradient(90deg, ${accent}, ${accent}cc)` }} />
        </div>
        <p className="text-xs leading-relaxed text-[#5C544D]">{risk.explanation}</p>
      </div>
    </motion.div>
  );
}
