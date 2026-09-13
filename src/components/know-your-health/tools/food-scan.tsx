"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Apple, Sparkles, Flame, Beef, Wheat, Droplet, Leaf, HeartPulse, Utensils } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import {
  ToolHeader, ImageUploader, RunButton, LoadingResult,
  ResultCard, Disclaimer, ResetButton, showError,
} from "@/components/know-your-health/ui";

interface UploadedImage { base64: string; mimeType: string; previewUrl: string; }
interface Ingredient { name: string; estimated_amount: string; }
interface Macros {
  protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; sugar_g: number;
}
interface FoodResult {
  identifiedFood: string;
  mealType: string;
  portionEstimate: string;
  calories: number;
  macros: Macros;
  ingredients: Ingredient[];
  healthScore: number;
  healthNotes: string[];
  healthierSwaps: string[];
  indianDish: boolean;
  disclaimer: string;
}

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

function MacroStat({ icon: Icon, label, value, unit, accent }: { icon: any; label: string; value: number; unit: string; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl glass-soft p-3 text-center shadow-depth">
      <span className="mx-auto mb-1.5 grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${accent}15`, color: accent }}><Icon className="h-4 w-4" /></span>
      <p className="text-lg font-bold leading-none text-[#1F1B17]">{value}<span className="ml-0.5 text-[0.6rem] font-medium text-[#9A8F84]">{unit}</span></p>
      <p className="mt-1 text-[0.6rem] uppercase tracking-wider text-[#9A8F84]">{label}</p>
    </motion.div>
  );
}

function scoreColor(score: number): { bg: string; text: string } {
  if (score >= 8) return { bg: "#5A7A5B15", text: "#5A7A5B" };
  if (score >= 6) return { bg: "#9DB89E15", text: "#5A7A5B" };
  if (score >= 4) return { bg: "#C9962E15", text: "#B8893D" };
  return { bg: "#A1620715", text: "#8A5A04" };
}

export function FoodScan() {
  const tool = TOOLS_BY_ID["food-scan"];
  const accent = tool.accent;
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [mealType, setMealType] = useState<string>("Lunch");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FoodResult | null>(null);

  const run = async () => {
    if (!image) { showError("Please upload a photo of your meal first"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/food-scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(75_000),
        body: JSON.stringify({ image: { base64: image.base64, mimeType: image.mimeType }, mealType }),
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

  const reset = () => { setResult(null); setImage(null); setMealType("Lunch"); };

  const score = result?.healthScore ?? 0;
  const sc = scoreColor(score);

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {!result && !loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Upload a photo of your meal</label>
            <ImageUploader image={image} onPick={setImage} onClear={() => setImage(null)} accent={accent} label="Drop or click to upload food photo" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Meal type</label>
            <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="glass-input h-11 w-full rounded-xl px-3.5 text-sm outline-none">
              {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={!image} accent={accent} label="Identify & analyze macros" />
            <span className="text-[0.65rem] text-[#9A8F84]">Powered by Gemini Vision · Indian dish aware</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            <ResultCard accent={accent} title="Identified Food">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full glass-chip px-2.5 py-0.5 text-[0.65rem] font-semibold text-[#5C544D]">{result.mealType}</span>
                    {result.indianDish && <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider" style={{ background: `${accent}15`, color: accent }}>Indian dish</span>}
                  </div>
                  <p className="font-serif text-xl font-semibold text-[#1F1B17]">{result.identifiedFood}</p>
                  {result.portionEstimate && <p className="mt-1 text-xs text-[#5C544D]"><Utensils className="mr-1 inline h-3 w-3" />{result.portionEstimate}</p>}
                </div>
                <div className="rounded-2xl px-4 py-3 text-center shadow-depth" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
                  <p className="text-[0.6rem] uppercase tracking-wider text-white/80">Calories</p>
                  <p className="text-3xl font-bold leading-none text-white">{result.calories}</p>
                  <p className="mt-0.5 text-[0.55rem] text-white/80">kcal (est.)</p>
                </div>
              </div>
            </ResultCard>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <MacroStat icon={Beef} label="Protein" value={result.macros?.protein_g ?? 0} unit="g" accent="#B8860B" />
              <MacroStat icon={Wheat} label="Carbs" value={result.macros?.carbs_g ?? 0} unit="g" accent="#C9962E" />
              <MacroStat icon={Droplet} label="Fat" value={result.macros?.fat_g ?? 0} unit="g" accent="#7A9A7B" />
              <MacroStat icon={Leaf} label="Fibre" value={result.macros?.fiber_g ?? 0} unit="g" accent="#5A7A5B" />
            </div>
            {typeof result.macros?.sugar_g === "number" && (
              <div className="flex items-center gap-2 rounded-xl glass-chip px-3 py-2 text-xs text-[#5C544D]">
                <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} />
                <span>Estimated sugar: <strong className="font-semibold text-[#1F1B17]">{result.macros.sugar_g} g</strong></span>
              </div>
            )}

            {result.ingredients?.length > 0 && (
              <ResultCard accent={accent} title="Estimated Ingredients">
                <ul className="space-y-1.5">
                  {result.ingredients.map((ing, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center justify-between gap-2 rounded-lg bg-[#FAF7F2]/60 px-3 py-2">
                      <span className="flex items-center gap-2 text-sm text-[#1F1B17]"><Apple className="h-3 w-3" style={{ color: accent }} />{ing.name}</span>
                      <span className="text-[0.7rem] font-medium text-[#9A8F84]">{ing.estimated_amount}</span>
                    </motion.li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <ResultCard accent={accent} title="Health Score">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full shadow-depth" style={{ background: `linear-gradient(135deg, ${sc.bg}, ${sc.bg})`, border: `2px solid ${sc.text}` }}>
                  <div className="text-center">
                    <p className="text-xl font-bold leading-none" style={{ color: sc.text }}>{score}</p>
                    <p className="text-[0.5rem] uppercase tracking-wider" style={{ color: sc.text }}>of 10</p>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-[#EFE9E0]">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${score * 10}%` }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${sc.text}, ${sc.text}cc)` }} />
                  </div>
                  {result.healthNotes?.length > 0 && (
                    <ul className="space-y-1">
                      {result.healthNotes.map((n, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[0.7rem] text-[#5C544D]"><Flame className="mt-0.5 h-3 w-3 shrink-0" style={{ color: sc.text }} /><span>{n}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </ResultCard>

            {result.healthierSwaps?.length > 0 && (
              <ResultCard accent="#9DB89E" title="Healthier Swaps">
                <ul className="space-y-2">
                  {result.healthierSwaps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><HeartPulse className="h-3 w-3" /> {result.disclaimer || "Nutrition values are estimates"}</span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
