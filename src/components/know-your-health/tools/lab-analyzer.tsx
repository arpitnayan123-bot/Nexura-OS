"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, FlaskConical, Activity, AlertCircle, ShieldCheck, Camera, Keyboard } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import { ToolHeader, ImageUploader, RunButton, LoadingResult, ResultCard, SeverityBadge, Disclaimer, ResetButton, showError } from "@/components/know-your-health/ui";

interface LabTest { name: string; value: string; unit: string; }
interface InterpTest {
  name: string; value: string; unit: string;
  status: "LOW"|"HIGH"|"NORMAL";
  referenceRange: string; meaning: string;
  severity: "low"|"moderate"|"high"|"normal";
}
interface LabResult {
  tests: InterpTest[];
  overallSummary: string;
  abnormalCount: number;
  recommendations: string[];
  requiresDoctorFollowUp: boolean;
  extractedFromImage?: boolean;
}

const COMMON_TESTS = [
  { name: "Hemoglobin", unit: "g/dL" },
  { name: "Fasting Blood Sugar", unit: "mg/dL" },
  { name: "Post Prandial Sugar", unit: "mg/dL" },
  { name: "HbA1c", unit: "%" },
  { name: "Total Cholesterol", unit: "mg/dL" },
  { name: "LDL Cholesterol", unit: "mg/dL" },
  { name: "HDL Cholesterol", unit: "mg/dL" },
  { name: "Triglycerides", unit: "mg/dL" },
  { name: "TSH", unit: "mIU/L" },
  { name: "Creatinine", unit: "mg/dL" },
  { name: "Urea", unit: "mg/dL" },
  { name: "Uric Acid", unit: "mg/dL" },
  { name: "Vitamin D", unit: "ng/mL" },
  { name: "Vitamin B12", unit: "pg/mL" },
  { name: "Platelet Count", unit: "10^3/μL" },
  { name: "WBC Count", unit: "10^3/μL" },
  { name: "RBC Count", unit: "10^6/μL" },
];

const statusColor: Record<string, string> = { LOW: "#9DB89E", HIGH: "#B8860B", NORMAL: "#5A7A5B" };

const QUICK_RANGES: { test: string; range: string }[] = [
  { test: "HbA1c", range: "<5.7 normal · 5.7-6.5 prediabetes range · >6.5 diabetes range" },
  { test: "Fasting sugar", range: "70-100 normal · 100-125 prediabetes · ≥126 diabetes range" },
  { test: "BP", range: "<120/80 ideal · 130/85+ watch · ≥140/90 high" },
  { test: "TSH", range: "0.4-5.5 broad screening band" },
  { test: "Vitamin D", range: "<12 deficient · 12-20 insufficient" },
  { test: "B12", range: "<150 pg/mL low" },
  { test: "Haemoglobin", range: "<13 men / <12 women (ICMR)" },
];

function QuickReference() {
  return (
    <div className="rounded-2xl glass-soft p-3 shadow-depth">
      <div className="mb-2 flex items-center gap-1.5">
        <FlaskConical className="h-3.5 w-3.5 text-[#5A7A5B]" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Quick reference — common Indian lab ranges</p>
      </div>
      <div className="space-y-1.5">
        {QUICK_RANGES.map((r) => (
          <div key={r.test} className="flex items-start gap-2 rounded-lg bg-[#FAF7F2]/60 p-2">
            <span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ background: "#9DB89E15", color: "#5A7A5B" }}>{r.test}</span>
            <p className="text-xs leading-relaxed text-[#5C544D]">{r.range}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[0.65rem] italic text-[#9A8F84]">Ranges vary by lab and context — always compare with your report's own reference column.</p>
    </div>
  );
}

export function LabAnalyzer() {
  const tool = TOOLS_BY_ID["lab-analyzer"];
  const accent = tool.accent;
  const [tests, setTests] = useState<LabTest[]>([{ name: "Hemoglobin", value: "", unit: "g/dL" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LabResult | null>(null);
  const [mode, setMode] = useState<"manual" | "photo">("photo");
  const [image, setImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);

  const addRow = () => setTests([...tests, { name: "", value: "", unit: "" }]);
  const removeRow = (i: number) => setTests(tests.filter((_, idx) => idx !== i));
  const update = (i: number, k: keyof LabTest, v: string) => setTests(tests.map((t, idx) => idx === i ? { ...t, [k]: v } : t));

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const payload = mode === "photo"
        ? image
          ? { image: { base64: image.base64, mimeType: image.mimeType } }
          : null
        : (() => { const clean = tests.filter((t) => t.name.trim() && t.value.trim()); return clean.length ? { tests: clean } : null; })();
      if (!payload) { showError(mode === "photo" ? "Upload a photo of your lab report first" : "Add at least one test with name and value"); setLoading(false); return; }
      const res = await fetch("/api/know-your-health/lab-analyzer", {
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

  const reset = () => { setResult(null); setTests([{ name: "Hemoglobin", value: "", unit: "g/dL" }]); setImage(null); };

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {!result && !loading && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="flex gap-2">
            {(["photo", "manual"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${mode === m ? "bg-[#1F1B17] text-white shadow-depth" : "glass-chip text-[#5C544D]"}`}>
                {m === "photo" ? <Camera className="h-3.5 w-3.5" /> : <Keyboard className="h-3.5 w-3.5" />}
                {m === "photo" ? "Upload report" : "Type values"}
              </button>
            ))}
          </div>
          {mode === "photo" ? (
            <ImageUploader image={image} onPick={setImage} onClear={() => setImage(null)} accent={accent} label="Snap or upload your lab report" />
          ) : (
          <div className="rounded-2xl glass-soft p-3 shadow-depth">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Enter your test results</p>
              <button onClick={addRow} className="flex items-center gap-1 rounded-full glass-chip px-2.5 py-1 text-[0.65rem] font-medium text-[#5A7A5B] hover:scale-105"><Plus className="h-3 w-3" /> Add test</button>
            </div>
            <div className="space-y-2">
              {tests.map((t, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_1fr_0.8fr_auto]">
                  <select value={t.name} onChange={(e) => update(i, "name", e.target.value)} className="glass-input h-10 w-full rounded-lg px-2 text-xs outline-none">
                    <option value="">Select test…</option>
                    {COMMON_TESTS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    {t.name && !COMMON_TESTS.find((c) => c.name === t.name) && <option value={t.name}>{t.name}</option>}
                  </select>
                  <input value={t.value} onChange={(e) => update(i, "value", e.target.value)} placeholder="Value" type="text" inputMode="decimal" className="glass-input h-10 w-full rounded-lg px-2 text-xs outline-none" />
                  <input value={t.unit} onChange={(e) => update(i, "unit", e.target.value)} placeholder="Unit" className="glass-input h-10 w-full rounded-lg px-2 text-xs outline-none" />
                  <button onClick={() => removeRow(i)} disabled={tests.length === 1} className="grid h-10 w-10 place-items-center rounded-lg glass-chip text-[#8A5A04] disabled:opacity-30 hover:bg-[#B8860B]/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
          )}
          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={mode === "photo" ? !image : !tests.some((t) => t.name && t.value)} accent={accent} label={mode === "photo" ? "Read report & interpret" : "Interpret against ICMR ranges"} />
            <span className="text-[0.65rem] text-[#9A8F84]">Powered by Gemini · Indian reference ranges</span>
          </div>
          <QuickReference />
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
            <ResultCard accent={accent} title="Overall Summary">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full glass-chip px-2.5 py-0.5 text-[0.65rem] font-semibold text-[#5C544D]">{result.tests.length} tests</span>
                <span className="rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider" style={{ background: result.abnormalCount > 0 ? "#A1620715" : "#9DB89E15", color: result.abnormalCount > 0 ? "#8A5A04" : "#5A7A5B" }}>{result.abnormalCount} abnormal</span>
                {result.extractedFromImage && <span className="rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold" style={{ background:"#C9962E15", color:"#B8893D" }}>Read from photo — verify values</span>}
                {result.requiresDoctorFollowUp && <span className="rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider" style={{ background:"#A1620720", color:"#7A4A3A" }}>Doctor follow-up advised</span>}
              </div>
              <p className="text-sm leading-relaxed text-[#1F1B17]">{result.overallSummary}</p>
            </ResultCard>

            <div className="space-y-2.5">
              {result.tests.map((t, i) => (
                <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}} className="overflow-hidden rounded-2xl glass-soft shadow-depth">
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ background:`linear-gradient(135deg, ${statusColor[t.status]}15, ${statusColor[t.status]}08)` }}>
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-3.5 w-3.5" style={{ color: statusColor[t.status] }} />
                      <p className="text-sm font-semibold text-[#1F1B17]">{t.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1F1B17]">{t.value} {t.unit}</span>
                      <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider" style={{ background:`${statusColor[t.status]}15`, color: statusColor[t.status] }}>{t.status}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 px-4 py-2.5">
                    <p className="text-[0.7rem] text-[#9A8F84]"><span className="font-medium text-[#5C544D]">Reference:</span> {t.referenceRange}</p>
                    <p className="text-xs text-[#1F1B17]">{t.meaning}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {result.recommendations?.length > 0 && (
              <ResultCard accent="#9DB89E" title="Recommendations">
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]">
                      <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              {result.requiresDoctorFollowUp && <span className="flex items-center gap-1 text-[0.65rem] text-[#8A5A04]"><AlertCircle className="h-3 w-3" /> Please consult a physician</span>}
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
