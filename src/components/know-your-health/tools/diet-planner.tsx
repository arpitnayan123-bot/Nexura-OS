"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Apple, Droplet, Sparkles, ShoppingCart, Flame } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import { ToolHeader, RunButton, LoadingResult, ResultCard, Disclaimer, ResetButton, showError } from "@/components/know-your-health/ui";

interface Meal { meal: string; calories: number; protein: number; carbs: number; fat: number; recipe: string; }
interface Day { day: string; breakfast: Meal; lunch: Meal; dinner: Meal; snacks: Meal; }
interface DietResult {
  bmi: number; calorieTarget: number;
  macroSplit: { protein: number; carbs: number; fat: number; };
  mealPlan: Day[];
  groceryList: { category: string; items: string[]; }[];
  hydrationTarget: string;
  tips: string[];
}

const inputCls = "glass-input h-10 w-full rounded-lg px-3 text-xs outline-none";

export function DietPlanner() {
  const tool = TOOLS_BY_ID["diet-planner"];
  const accent = tool.accent;
  const [f, setF] = useState({
    goal: "lose", dietaryPreference: "vegetarian", calorieTarget: "1800",
    age: "30", gender: "female", weightKg: "65", heightCm: "165",
    activityLevel: "moderate", allergies: "", medicalConditions: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DietResult | null>(null);
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  const run = async () => {
    if (!f.age || !f.weightKg || !f.heightCm || !f.calorieTarget) { showError("Please fill all required fields"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/diet-planner", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(75_000),
        body: JSON.stringify({
          ...f,
          age: Number(f.age), weightKg: Number(f.weightKg), heightCm: Number(f.heightCm), calorieTarget: Number(f.calorieTarget),
        }),
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
          <div className="grid grid-cols-2 gap-3 rounded-2xl glass-soft p-4 shadow-depth">
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Goal</label>
              <select value={f.goal} onChange={(e)=>set("goal", e.target.value)} className={inputCls}>
                <option value="lose">Lose weight</option>
                <option value="gain">Gain weight</option>
                <option value="maintain">Maintain</option>
                <option value="muscle">Build muscle</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Dietary preference</label>
              <select value={f.dietaryPreference} onChange={(e)=>set("dietaryPreference", e.target.value)} className={inputCls}>
                <option value="vegetarian">Vegetarian</option>
                <option value="eggetarian">Eggetarian</option>
                <option value="non-veg">Non-vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="jain">Jain</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Calorie target (kcal/day)</label>
              <input type="number" value={f.calorieTarget} onChange={(e)=>set("calorieTarget", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Activity level</label>
              <select value={f.activityLevel} onChange={(e)=>set("activityLevel", e.target.value)} className={inputCls}>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very-active">Very active</option>
              </select>
            </div>
            <div><label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Age</label><input type="number" value={f.age} onChange={(e)=>set("age", e.target.value)} className={inputCls} /></div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Gender</label>
              <select value={f.gender} onChange={(e)=>set("gender", e.target.value)} className={inputCls}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Weight (kg)</label><input type="number" value={f.weightKg} onChange={(e)=>set("weightKg", e.target.value)} className={inputCls} /></div>
            <div><label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Height (cm)</label><input type="number" value={f.heightCm} onChange={(e)=>set("heightCm", e.target.value)} className={inputCls} /></div>
            <div><label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Allergies</label><input value={f.allergies} onChange={(e)=>set("allergies", e.target.value)} className={inputCls} placeholder="peanuts, lactose" /></div>
            <div><label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Medical conditions</label><input value={f.medicalConditions} onChange={(e)=>set("medicalConditions", e.target.value)} className={inputCls} placeholder="diabetes, hypertension" /></div>
          </div>
          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={loading} accent={accent} label="Generate my 7-day plan" />
            <span className="text-[0.65rem] text-[#9A8F84]">Indian dishes · grocery list included</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard icon={<Flame className="h-4 w-4" />} label="BMI" value={result.bmi?.toFixed(1) || "—"} accent={accent} />
              <StatCard icon={<Apple className="h-4 w-4" />} label="Daily calories" value={`${result.calorieTarget} kcal`} accent="#9DB89E" />
              <StatCard icon={<Droplet className="h-4 w-4" />} label="Hydration" value={result.hydrationTarget || "2.5+ L"} accent="#7A9A7B" />
            </div>

            <ResultCard accent={accent} title="Macro Split">
              <div className="grid grid-cols-3 gap-3">
                {([["Protein", result.macroSplit?.protein, "#D98B6E"], ["Carbs", result.macroSplit?.carbs, "#E0B080"], ["Fat", result.macroSplit?.fat, "#9DB89E"]] as const).map(([label, g, c]) => (
                  <div key={label} className="rounded-xl bg-[#FAF7F2]/60 p-2.5 text-center">
                    <p className="font-serif text-xl font-bold text-[#1F1B17]">{g || 0}<span className="ml-0.5 text-[0.6rem] text-[#9A8F84]">g</span></p>
                    <p className="text-[0.6rem] uppercase tracking-wider" style={{ color: c }}>{label}</p>
                  </div>
                ))}
              </div>
            </ResultCard>

            <ResultCard accent={accent} title="7-Day Meal Plan">
              <div className="space-y-3">
                {result.mealPlan?.map((d, i) => (
                  <motion.div key={i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className="rounded-xl bg-[#FAF7F2]/60 p-3">
                    <p className="mb-2 font-serif text-sm font-bold text-[#1F1B17]">{d.day}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <MealRow label="Breakfast" meal={d.breakfast} accent="#E0B080" />
                      <MealRow label="Lunch" meal={d.lunch} accent="#9DB89E" />
                      <MealRow label="Dinner" meal={d.dinner} accent="#D98B6E" />
                      <MealRow label="Snacks" meal={d.snacks} accent="#7A9A7B" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </ResultCard>

            {result.groceryList?.length > 0 && (
              <ResultCard accent="#9DB89E" title="Grocery List">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {result.groceryList.map((c, i) => (
                    <div key={i} className="rounded-xl bg-[#FAF7F2]/60 p-2.5">
                      <p className="mb-1.5 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[#5A7A5B]"><ShoppingCart className="h-3 w-3" />{c.category}</p>
                      <div className="flex flex-wrap gap-1">
                        {c.items?.map((it, j) => <span key={j} className="rounded-full glass-chip px-2 py-0.5 text-[0.6rem] text-[#5C544D]">{it}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </ResultCard>
            )}

            {result.tips?.length > 0 && (
              <ResultCard accent="#5A7A5B" title="Healthy Eating Tips">
                <ul className="space-y-2">
                  {result.tips.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" /><span>{r}</span></li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><UtensilsCrossed className="h-3 w-3" /> Personalised plan — adjust portions to your needs</span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string; }) {
  return (
    <div className="overflow-hidden rounded-2xl glass-soft shadow-depth">
      <div className="flex items-center gap-2 px-3 py-2 text-white" style={{ background:`linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
        {icon}
        <p className="text-[0.6rem] font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className="px-3 py-2.5 font-serif text-lg font-bold text-[#1F1B17]">{value}</p>
    </div>
  );
}

function MealRow({ label, meal, accent }: { label: string; meal: Meal; accent: string; }) {
  if (!meal) return null;
  return (
    <div className="rounded-lg bg-white/40 p-2">
      <p className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: accent }}>{label}</p>
      <p className="text-xs font-medium text-[#1F1B17]">{meal.meal}</p>
      <p className="mt-0.5 text-[0.6rem] text-[#9A8F84]">{meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F</p>
      <p className="mt-1 text-[0.6rem] italic text-[#5C544D]">{meal.recipe}</p>
    </div>
  );
}
