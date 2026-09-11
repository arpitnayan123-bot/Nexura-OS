"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Phone, Heart, Wind, AlertTriangle, Activity, Moon, Sun, MessageCircle } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import { ToolHeader, RunButton, LoadingResult, ResultCard, SeverityBadge, Disclaimer, ResetButton, showError } from "@/components/know-your-health/ui";

interface ScoreBlock { score: number; level: string; interpretation: string; }
interface Crisis { name: string; phone: string; hours: string; }
interface MentalResult {
  phq9: ScoreBlock;
  gad7: ScoreBlock;
  summary: string;
  groundingExercises: string[];
  recommendations: string[];
  crisisResources: Crisis[];
  whenToSeekHelp: string;
}

const PHQ9_Q = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling/staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — that you are a failure",
  "Trouble concentrating on things (e.g. reading, TV)",
  "Moving or speaking slowly — or being fidgety/restless",
  "Thoughts that you'd be better off not alive",
];

const GAD7_Q = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it's hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen",
];

const OPTIONS = [
  { v: 0, label: "Not at all" },
  { v: 1, label: "Several days" },
  { v: 2, label: "More than half the days" },
  { v: 3, label: "Nearly every day" },
];

const levelToBadge = (level: string): "low"|"moderate"|"high"|"emergency" => {
  const l = (level || "").toLowerCase();
  if (l.includes("severe")) return "emergency";
  if (l.includes("moderate")) return "high";
  if (l.includes("mild")) return "moderate";
  return "low";
};

export function MentalWellness() {
  const tool = TOOLS_BY_ID["mental-wellness"];
  const accent = tool.accent;
  const [phq9, setPhq9] = useState<number[]>(Array(9).fill(0));
  const [gad7, setGad7] = useState<number[]>(Array(7).fill(0));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MentalResult | null>(null);

  const setP = (i: number, v: number) => { const n = [...phq9]; n[i] = v; setPhq9(n); };
  const setG = (i: number, v: number) => { const n = [...gad7]; n[i] = v; setGad7(n); };

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/mental-wellness", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(75_000),
        body: JSON.stringify({ phq9, gad7, notes }),
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

  const reset = () => { setResult(null); setPhq9(Array(9).fill(0)); setGad7(Array(7).fill(0)); setNotes(""); };

  const phq9Total = phq9.reduce((a, b) => a + b, 0);
  const gad7Total = gad7.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {!result && !loading && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="rounded-2xl glass-soft p-4 shadow-depth">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5C544D]"><Heart className="h-3.5 w-3.5" aria-hidden="true" /> PHQ-9 · Depression screen</p>
              <span className="rounded-full glass-chip px-2.5 py-0.5 text-[0.65rem] font-medium text-[#5A7A5B]">Score: {phq9Total}/27</span>
            </div>
            <div className="space-y-3">
              {PHQ9_Q.map((q, i) => (
                <div key={i} className="rounded-xl bg-[#FAF7F2]/60 p-2.5">
                  <p className="mb-2 text-xs text-[#1F1B17]">{i + 1}. {q}</p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {OPTIONS.map((o) => (
                      <button key={o.v} onClick={() => setP(i, o.v)} className={`rounded-lg px-2 py-1.5 text-[0.65rem] font-medium transition-all ${phq9[i] === o.v ? "text-white shadow-depth" : "glass-chip text-[#5C544D] hover:scale-[1.02]"}`} style={phq9[i] === o.v ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)` } : {}}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl glass-soft p-4 shadow-depth">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5C544D]"><Wind className="h-3.5 w-3.5" /> GAD-7 · Anxiety screen</p>
              <span className="rounded-full glass-chip px-2.5 py-0.5 text-[0.65rem] font-medium text-[#5A7A5B]">Score: {gad7Total}/21</span>
            </div>
            <div className="space-y-3">
              {GAD7_Q.map((q, i) => (
                <div key={i} className="rounded-xl bg-[#FAF7F2]/60 p-2.5">
                  <p className="mb-2 text-xs text-[#1F1B17]">{i + 1}. {q}</p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {OPTIONS.map((o) => (
                      <button key={o.v} onClick={() => setG(i, o.v)} className={`rounded-lg px-2 py-1.5 text-[0.65rem] font-medium transition-all ${gad7[i] === o.v ? "text-white shadow-depth" : "glass-chip text-[#5C544D] hover:scale-[1.02]"}`} style={gad7[i] === o.v ? { background: `linear-gradient(135deg, #7A9A7B, #7A9A7Bcc)` } : {}}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl glass-soft p-4 shadow-depth">
            <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Anything you'd like to share (optional)</label>
            <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={2} className="glass-input w-full resize-none rounded-lg px-3 py-2 text-xs outline-none" placeholder="Anything on your mind, recent events, what you're feeling…" />
          </div>

          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={loading} accent={accent} label="Get my reflection" />
            <span className="text-[0.65rem] text-[#9A8F84]">Over the last 2 weeks</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ScoreCard label="PHQ-9" subtitle="Depression" score={result.phq9} accent="#7A9A7B" />
              <ScoreCard label="GAD-7" subtitle="Anxiety" score={result.gad7} accent="#9DB89E" />
            </div>

            <ResultCard accent={accent} title="AI Reflection">
              <p className="text-sm leading-relaxed text-[#1F1B17]">{result.summary}</p>
            </ResultCard>

            {result.groundingExercises?.length > 0 && (
              <ResultCard accent="#9DB89E" title="Grounding Exercises">
                <ul className="space-y-2">
                  {result.groundingExercises.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]"><Wind className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9DB89E]" /><span>{g}</span></li>
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

            <ResultCard accent="#7A9A7B" title="What helps next">
              <p className="mb-3 text-[0.65rem] text-[#9A8F84]">Small, evidence-informed starters — pick one and keep it easy.</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-[#1F1B17]"><Moon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" /><span>Keep a <strong>regular sleep window</strong> — same bedtime and wake-up time, even on weekends. Sleep is the fastest lever on mood and worry.</span></li>
                <li className="flex items-start gap-2 text-sm text-[#1F1B17]"><Sun className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" /><span>Get <strong>20–30 minutes of movement</strong> each day — a brisk walk in morning light counts. Daylight plus movement reliably lifts mood.</span></li>
                <li className="flex items-start gap-2 text-sm text-[#1F1B17]"><MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" /><span><strong>Tell one trusted person</strong> how you've been feeling — a friend, family member, or a counsellor (Tele-MANAS 14416 is free and 24×7).</span></li>
              </ul>
              <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-[#C98A7A15] p-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9A6A5A]" />
                <p className="text-xs leading-relaxed text-[#1F1B17]"><strong className="text-[#7A4A3A]">When to reach out now:</strong> if you have thoughts of harming yourself or feel unsafe, call <a href="tel:14416" className="font-semibold text-[#9A6A5A] underline underline-offset-2">Tele-MANAS 14416</a> (also 1-800-891-4416) right away (free, 24×7) or dial <a href="tel:108" className="font-semibold text-[#9A6A5A] underline underline-offset-2">108</a> in an emergency. Reaching out early is a strength — you don't have to wait.</p>
              </div>
            </ResultCard>

            <ResultCard accent="#C98A7A" title="When to Seek Help">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9A6A5A]" />
                <p className="text-sm leading-relaxed text-[#1F1B17]">{result.whenToSeekHelp}</p>
              </div>
            </ResultCard>

            <ResultCard accent="#C98A7A" title="Crisis Resources — Available Now">
              <div className="grid gap-2 sm:grid-cols-3">
                {(result.crisisResources?.length ? result.crisisResources : [
                  { name: "Tele-MANAS (Govt of India)", phone: "14416", hours: "24x7 · Free · All Indian languages" },
                  { name: "iCall", phone: "9152987821", hours: "Mon-Sat 8am-10pm" },
                  { name: "Vandrevala Foundation", phone: "1860-2662-345", hours: "24x7" },
                  { name: "AASRA", phone: "9820466726", hours: "24x7" },
                ]).map((c, i) => (
                  <a key={i} href={`tel:${c.phone}`} className="block rounded-xl bg-[#FAF7F2]/60 p-3 transition-all hover:scale-[1.02]">
                    <p className="flex items-center gap-1 text-xs font-semibold text-[#1F1B17]"><Phone className="h-3 w-3 text-[#9A6A5A]" /> {c.name}</p>
                    <p className="mt-1 font-serif text-lg font-bold text-[#9A6A5A]">{c.phone}</p>
                    <p className="text-[0.6rem] text-[#9A8F84]">{c.hours}</p>
                  </a>
                ))}
              </div>
              <p className="mt-2 text-[0.65rem] text-[#9A8F84]">If you're in immediate danger, please call Tele-MANAS 14416 (free, 24×7) or 112 (India emergency), or go to your nearest hospital.</p>
            </ResultCard>

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><Activity className="h-3 w-3" /> Not a diagnosis — please consult a mental health professional</span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScoreCard({ label, subtitle, score, accent }: { label: string; subtitle: string; score: ScoreBlock; accent: string; }) {
  const pct = Math.min(100, (Number(score?.score) || 0) / (label === "PHQ-9" ? 27 : 21) * 100);
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="overflow-hidden rounded-2xl glass-soft shadow-depth">
      <div className="flex items-center justify-between px-3 py-2 text-white" style={{ background:`linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
        <div><p className="text-[0.6rem] font-semibold uppercase tracking-wider">{label}</p><p className="text-[0.55rem] opacity-90">{subtitle}</p></div>
        <SeverityBadge level={levelToBadge(score.level)} />
      </div>
      <div className="p-3">
        <p className="font-serif text-2xl font-bold text-[#1F1B17]">{score?.score || 0}<span className="ml-1 text-[0.6rem] text-[#9A8F84]">/ {label === "PHQ-9" ? 27 : 21}</span></p>
        <p className="text-[0.65rem] uppercase tracking-wider" style={{ color: accent }}>{score?.level || "—"}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EFE9E0]">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background:`linear-gradient(90deg, ${accent}, ${accent}cc)` }} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#5C544D]">{score?.interpretation || ""}</p>
      </div>
    </motion.div>
  );
}
