"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flower2, Sparkles, Calendar, Heart, Stethoscope } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import {
  ToolHeader,
  RunButton,
  LoadingResult,
  ResultCard,
  Disclaimer,
  ResetButton,
  showError,
} from "@/components/know-your-health/ui";

interface Condition {
  name: string;
  note: string;
}
interface WomensResult {
  assessment: string;
  possibleConditions: Condition[];
  recommendations: string[];
  lifestyleTips: string[];
  whenToSeeDoctor: string;
  pcosRiskScore?: number;
}

const CONCERN_CHIPS = [
  "Irregular periods",
  "Heavy bleeding",
  "Painful cramps",
  "PCOS symptoms",
  "Trying to conceive",
  "Pregnancy question",
  "Menopause symptoms",
  "Vaginal discharge",
];

const inputCls = "glass-input h-10 w-full rounded-lg px-3 text-xs outline-none";

export function WomensCare() {
  const tool = TOOLS_BY_ID["womens-care"];
  const accent = tool.accent;
  const [f, setF] = useState({
    concern: "",
    age: "",
    cycleInfo: "",
    symptoms: "",
    pregnancyStatus: "Not pregnant",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WomensResult | null>(null);
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  const run = async () => {
    if (!f.concern.trim() && !f.symptoms.trim()) {
      showError("Please describe your concern or symptoms");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/know-your-health/womens-care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(75_000),
        body: JSON.stringify({ ...f, age: Number(f.age) || 0 }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.detail || e?.error || "request_failed");
      }
      setResult(await res.json());
    } catch (e) {
      showError(e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setResult(null);

  return (
    <div className="space-y-5">
      <ToolHeader
        title={tool.name}
        tagline={tool.tagline}
        icon={tool.icon}
        accent={accent}
        inspiration={tool.inspiration}
      />

      {!result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="rounded-2xl glass-soft p-4 shadow-depth space-y-3">
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                What's your concern?
              </label>
              <input
                value={f.concern}
                onChange={(e) => set("concern", e.target.value)}
                className={inputCls}
                placeholder="Irregular periods for 3 months"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CONCERN_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => set("concern", c)}
                  className="rounded-full glass-chip px-2.5 py-1 text-[0.65rem] text-[#5C544D] hover:scale-105"
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                  Age
                </label>
                <input
                  type="number"
                  value={f.age}
                  onChange={(e) => set("age", e.target.value)}
                  className={inputCls}
                  placeholder="28"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                  Pregnancy status
                </label>
                <select
                  value={f.pregnancyStatus}
                  onChange={(e) => set("pregnancyStatus", e.target.value)}
                  className={inputCls}
                >
                  <option>Not pregnant</option>
                  <option>Trying to conceive</option>
                  <option>First trimester</option>
                  <option>Second trimester</option>
                  <option>Third trimester</option>
                  <option>Postpartum</option>
                  <option>Perimenopause</option>
                  <option>Menopause</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                Cycle info (last period, regularity)
              </label>
              <input
                value={f.cycleInfo}
                onChange={(e) => set("cycleInfo", e.target.value)}
                className={inputCls}
                placeholder="cycle 28-32 days, last period 2 weeks ago"
              />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                Other symptoms
              </label>
              <textarea
                value={f.symptoms}
                onChange={(e) => set("symptoms", e.target.value)}
                rows={3}
                className="glass-input w-full resize-none rounded-lg px-3 py-2 text-xs outline-none"
                placeholder="acne, hair growth, weight gain, mood changes…"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RunButton
              onClick={run}
              loading={loading}
              disabled={loading}
              accent={accent}
              label="Get AI guidance"
            />
            <span className="text-[0.65rem] text-[#9A8F84]">
              Warm, evidence-based, Indian context
            </span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <ResultCard accent={accent} title="Assessment">
              <p className="text-sm leading-relaxed text-[#1F1B17]">{result.assessment}</p>
              {typeof result.pcosRiskScore === "number" && result.pcosRiskScore > 0 && (
                <div className="mt-3 rounded-xl bg-[#FAF7F2]/60 p-2.5">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#5C544D]">PCOS risk indicator</span>
                    <span className="font-bold text-[#1F1B17]">
                      {Math.round(result.pcosRiskScore)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#EFE9E0]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, result.pcosRiskScore)}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}
                    />
                  </div>
                </div>
              )}
            </ResultCard>

            {result.possibleConditions?.length > 0 && (
              <ResultCard accent="#C9962E" title="Possible Conditions">
                <div className="space-y-2.5">
                  {result.possibleConditions.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl bg-[#FAF7F2]/60 p-2.5"
                    >
                      <span
                        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                        style={{ background: `${accent}15`, color: accent }}
                      >
                        <Flower2 className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#1F1B17]">{c.name}</p>
                        <p className="mt-0.5 text-xs text-[#5C544D]">{c.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ResultCard>
            )}

            {result.recommendations?.length > 0 && (
              <ResultCard accent="#5A7A5B" title="Recommendations">
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>
            )}

            {result.lifestyleTips?.length > 0 && (
              <ResultCard accent="#9DB89E" title="Lifestyle Tips">
                <ul className="space-y-2">
                  {result.lifestyleTips.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]">
                      <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9DB89E]" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <ResultCard accent="#B8860B" title="When to See a Doctor">
              <div className="flex items-start gap-3">
                <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-[#8A5A04]" />
                <p className="text-sm leading-relaxed text-[#1F1B17]">{result.whenToSeeDoctor}</p>
              </div>
            </ResultCard>

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]">
                <Calendar className="h-3 w-3" /> Track your cycle regularly
              </span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
