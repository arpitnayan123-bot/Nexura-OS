"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Sparkles, Utensils, Sun, Activity } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import { ToolHeader, RunButton, LoadingResult, ResultCard, Disclaimer, ResetButton, showError } from "@/components/know-your-health/ui";

interface AyurvedaResult {
  dominantDosha: string;
  secondaryDosha: string;
  scores: { vata: number; pitta: number; kapha: number; };
  bodyType: string;
  digestionType: string;
  personalityTraits: string[];
  recommendedFoods: string[];
  foodsToAvoid: string[];
  lifestyleRecommendations: string[];
  dinacharya: string[];
}

// 20 questions — each has 3 options (a=Vata, b=Pitta, c=Kapha)
const QUESTIONS: { q: string; opts: [string, string, string] }[] = [
  { q: "Body frame", opts: ["Thin, lean, hard to gain weight", "Medium, muscular, athletic", "Heavy, broad, easy to gain weight"] },
  { q: "Skin type", opts: ["Dry, rough, thin", "Warm, reddish, sensitive", "Cool, oily, thick, smooth"] },
  { q: "Hair texture", opts: ["Dry, frizzy, thin", "Fine, early greying, balding", "Thick, lustrous, oily"] },
  { q: "Appetite", opts: ["Irregular, varies daily", "Sharp, must eat on time", "Steady but slow"] },
  { q: "Digestion", opts: ["Gas, bloating, constipation", "Strong, acid reflux when delayed", "Slow but comfortable, heavy feeling"] },
  { q: "Energy pattern", opts: ["Bursts of energy, tires quickly", "Strong, steady, competitive", "Steady, slow to start, enduring"] },
  { q: "Sleep", opts: ["Light, interrupted, vivid dreams", "Sound, moderate, wake fresh", "Deep, long, hard to wake up"] },
  { q: "Body temperature", opts: ["Cold hands/feet, dislikes cold", "Warm, sweats easily", "Cool, comfortable, dislikes damp"] },
  { q: "Speech", opts: ["Fast, talkative, jumps topics", "Sharp, articulate, convincing", "Slow, measured, melodious"] },
  { q: "Memory", opts: ["Quick to learn, quick to forget", "Sharp, organised, focused", "Slow to learn, never forget"] },
  { q: "Emotions under stress", opts: ["Anxious, fearful, worried", "Irritable, angry, critical", "Calm, attached, withdrawn"] },
  { q: "Temperament", opts: ["Enthusiastic, creative, restless", "Ambitious, driven, perfectionist", "Calm, content, steady"] },
  { q: "Sweat", opts: ["Scanty, little odour", "Profuse, strong odour", "Moderate, pleasant"] },
  { q: "Joints", opts: ["Crackly, stiff, dry", "Flexible, medium", "Well-lubricated, sturdy"] },
  { q: "Pulse", opts: ["Fast, irregular, thready", "Strong, jumping", "Slow, steady, deep"] },
  { q: "Decision making", opts: ["Quick but changes mind", "Decisive, sharp, firm", "Slow, deliberate, steady"] },
  { q: "Weather preference", opts: ["Loves warm, humid", "Loves cool, dislikes heat", "Loves warm, dry, dislikes cold/damp"] },
  { q: "Spending habits", opts: ["Impulsive, on small things", "Calculated, on quality items", "Saves, buys for the long term"] },
  { q: "Friendship style", opts: ["Many friends, brief bonds", "Loyal to few, demanding", "Long-lasting, slow to make friends"] },
  { q: "Reaction to change", opts: ["Adapts fast but anxious", "Plans and pushes through", "Resists, prefers routine"] },
];

const DOSHA_COLOR: Record<string, string> = { Vata: "#9DB89E", Pitta: "#D98B6E", Kapha: "#7A9A7B" };

export function Ayurveda() {
  const tool = TOOLS_BY_ID["ayurveda"];
  const accent = tool.accent;
  const [answers, setAnswers] = useState<number[]>(Array(20).fill(-1));
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AyurvedaResult | null>(null);

  const pick = (i: number, opt: number) => {
    const next = [...answers]; next[i] = opt; setAnswers(next);
    if (i < 19) setStep(i + 1);
  };

  const run = async () => {
    const cleaned = answers.map((a) => ["a", "b", "c"][a] || "");
    if (cleaned.some((c) => !c)) { showError("Please answer all 20 questions"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/ayurveda", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: cleaned }),
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

  const reset = () => { setResult(null); setAnswers(Array(20).fill(-1)); setStep(0); };

  const answeredCount = answers.filter((a) => a === 0 || a === 1 || a === 2).length;
  const allAnswered = answeredCount === 20;

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {!result && !loading && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="rounded-2xl glass-soft p-4 shadow-depth">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Question {step + 1} of 20</p>
              <span className="rounded-full glass-chip px-2.5 py-0.5 text-[0.65rem] font-medium text-[#5A7A5B]">{answeredCount}/20 answered</span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#EFE9E0]">
              <motion.div animate={{ width: `${(answeredCount / 20) * 100}%` }} className="h-full rounded-full" style={{ background:`linear-gradient(90deg, ${accent}, ${accent}cc)` }} />
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} transition={{duration:0.2}}>
                <p className="mb-3 font-serif text-lg font-semibold text-[#1F1B17]">{QUESTIONS[step].q}</p>
                <div className="space-y-2">
                  {QUESTIONS[step].opts.map((opt, i) => (
                    <button key={i} onClick={() => pick(step, i)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${answers[step] === i ? "glass-input shadow-depth" : "glass-chip hover:scale-[1.01]"}`} style={answers[step] === i ? { borderColor: `${accent}80` } : {}}>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold" style={{ background:`${DOSHA_COLOR[["Vata","Pitta","Kapha"][i]]}20`, color: DOSHA_COLOR[["Vata","Pitta","Kapha"][i]] }}>{["V","P","K"][i]}</span>
                      <span className="text-[#1F1B17]">{opt}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-3 flex items-center justify-between">
              <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="rounded-full glass-chip px-3 py-1.5 text-xs text-[#5C544D] disabled:opacity-30">← Back</button>
              {step < 19 && <button onClick={() => setStep(Math.min(19, step + 1))} className="rounded-full glass-chip px-3 py-1.5 text-xs text-[#5C544D]">Next →</button>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={!allAnswered || loading} accent={accent} label="Reveal my Prakriti" />
            <span className="text-[0.65rem] text-[#9A8F84]">Based on NIIMH Ayurveda principles</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
            <ResultCard accent={accent} title="Your Prakriti">
              <div className="mb-4 flex flex-col items-center">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="grid h-20 w-20 place-items-center rounded-full shadow-depth" style={{ background:`linear-gradient(135deg, ${DOSHA_COLOR[result.dominantDosha] || accent}, ${DOSHA_COLOR[result.dominantDosha] || accent}cc)` }}>
                  <Leaf className="h-9 w-9 text-white" />
                </motion.div>
                <p className="mt-2 font-serif text-2xl font-bold text-[#1F1B17]">{result.dominantDosha} Prakriti</p>
                <p className="text-[0.65rem] text-[#9A8F84]">Secondary: {result.secondaryDosha}</p>
              </div>
              <div className="space-y-2.5">
                {(["vata","pitta","kapha"] as const).map((d) => {
                  const score = Math.max(0, Math.min(20, Number(result.scores?.[d]) || 0));
                  const pct = (score / 20) * 100;
                  const name = d.charAt(0).toUpperCase() + d.slice(1);
                  return (
                    <div key={d}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-[#5C544D]">{name}</span>
                        <span className="font-bold text-[#1F1B17]">{score}/20</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#EFE9E0]">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${DOSHA_COLOR[name]}, ${DOSHA_COLOR[name]}cc)` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ResultCard>

            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard accent="#9DB89E" title="Body Type">
                <p className="text-xs leading-relaxed text-[#1F1B17]">{result.bodyType}</p>
              </ResultCard>
              <ResultCard accent="#D98B6E" title="Digestion">
                <p className="text-xs leading-relaxed text-[#1F1B17]">{result.digestionType}</p>
              </ResultCard>
            </div>

            {result.personalityTraits?.length > 0 && (
              <ResultCard accent="#7A9A7B" title="Personality Traits">
                <div className="flex flex-wrap gap-2">
                  {result.personalityTraits.map((t, i) => (
                    <span key={i} className="rounded-full glass-chip px-2.5 py-1 text-[0.65rem] text-[#5C544D]">{t}</span>
                  ))}
                </div>
              </ResultCard>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard accent="#5A7A5B" title="Recommended Foods">
                <ul className="space-y-1.5">
                  {result.recommendedFoods?.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#1F1B17]"><Utensils className="mt-0.5 h-3 w-3 shrink-0 text-[#5A7A5B]" /><span>{r}</span></li>
                  ))}
                </ul>
              </ResultCard>
              <ResultCard accent="#C98A7A" title="Foods to Avoid">
                <ul className="space-y-1.5">
                  {result.foodsToAvoid?.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#1F1B17]"><span className="mt-0.5 h-3 w-3 shrink-0 text-[#9A6A5A]">✕</span><span>{r}</span></li>
                  ))}
                </ul>
              </ResultCard>
            </div>

            {result.lifestyleRecommendations?.length > 0 && (
              <ResultCard accent="#E0B080" title="Lifestyle Recommendations">
                <ul className="space-y-2">
                  {result.lifestyleRecommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]"><Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E0B080]" /><span>{r}</span></li>
                  ))}
                </ul>
              </ResultCard>
            )}

            {result.dinacharya?.length > 0 && (
              <ResultCard accent="#D98B6E" title="Dinacharya (Daily Routine)">
                <ul className="space-y-2">
                  {result.dinacharya.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]"><Sun className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D98B6E]" /><span>{r}</span></li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><Sparkles className="h-3 w-3" /> Ayurvedic guidance, informational only</span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
