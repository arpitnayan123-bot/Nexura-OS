"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sparkles, AlertCircle, Coffee, Smartphone, Star } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import {
  ToolHeader,
  RunButton,
  LoadingResult,
  ResultCard,
  SeverityBadge,
  Disclaimer,
  ResetButton,
  showError,
} from "@/components/know-your-health/ui";

interface Pattern {
  name: string;
  severity: "low" | "moderate" | "high";
  note: string;
}
interface SleepResult {
  totalSleepHours: number;
  sleepEfficiencyPercent: number;
  sleepEfficiencyCategory: string;
  patternsDetected: Pattern[];
  issues: string[];
  recommendations: string[];
  sleepHygieneTips: string[];
  whenToSeeDoctor: string;
}

const inputCls = "glass-input h-10 w-full rounded-lg px-3 text-xs outline-none";

export function SleepQuality() {
  const tool = TOOLS_BY_ID["sleep-quality"];
  const accent = tool.accent;
  const [f, setF] = useState({
    bedtime: "23:00",
    wakeTime: "06:30",
    sleepLatencyMin: "15",
    awakenings: "1",
    totalAwakeMin: "10",
    sleepQuality: "3",
    mood: "3",
    caffeineAfternoon: false,
    screenBeforeBed: false,
    notes: "",
    age: "30",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SleepResult | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });

  const run = async () => {
    if (!f.bedtime || !f.wakeTime) {
      showError("Please set bedtime and wake time");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/know-your-health/sleep-quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(75_000),
        body: JSON.stringify({
          ...f,
          sleepLatencyMin: Number(f.sleepLatencyMin),
          awakenings: Number(f.awakenings),
          totalAwakeMin: Number(f.totalAwakeMin),
          sleepQuality: Number(f.sleepQuality),
          mood: Number(f.mood),
          age: Number(f.age),
        }),
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

  const effColor = (cat: string) => {
    const c = (cat || "").toLowerCase();
    if (c.includes("excellent")) return "#5A7A5B";
    if (c.includes("good")) return "#9DB89E";
    if (c.includes("fair")) return "#C9962E";
    return "#B8860B";
  };

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
          <div className="grid grid-cols-2 gap-3 rounded-2xl glass-soft p-4 shadow-depth">
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                Bedtime
              </label>
              <input
                type="time"
                value={f.bedtime}
                onChange={(e) => set("bedtime", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                Wake time
              </label>
              <input
                type="time"
                value={f.wakeTime}
                onChange={(e) => set("wakeTime", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                Sleep latency (min)
              </label>
              <input
                type="number"
                value={f.sleepLatencyMin}
                onChange={(e) => set("sleepLatencyMin", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                # Awakenings
              </label>
              <input
                type="number"
                value={f.awakenings}
                onChange={(e) => set("awakenings", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                Total awake (min)
              </label>
              <input
                type="number"
                value={f.totalAwakeMin}
                onChange={(e) => set("totalAwakeMin", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                Age
              </label>
              <input
                type="number"
                value={f.age}
                onChange={(e) => set("age", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl glass-soft p-4 shadow-depth">
            <RatingSlider
              label="Sleep quality"
              value={Number(f.sleepQuality)}
              onChange={(v) => set("sleepQuality", String(v))}
              accent={accent}
            />
            <RatingSlider
              label="Morning mood"
              value={Number(f.mood)}
              onChange={(v) => set("mood", String(v))}
              accent="#9DB89E"
            />
          </div>

          <div className="rounded-2xl glass-soft p-4 shadow-depth">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs text-[#1F1B17]">
                <input
                  type="checkbox"
                  checked={f.caffeineAfternoon}
                  onChange={(e) => set("caffeineAfternoon", e.target.checked)}
                  className="accent-[#B8860B]"
                />{" "}
                <Coffee className="h-3.5 w-3.5 text-[#8A5A04]" /> Had tea/coffee after 4pm
              </label>
              <label className="flex items-center gap-2 text-xs text-[#1F1B17]">
                <input
                  type="checkbox"
                  checked={f.screenBeforeBed}
                  onChange={(e) => set("screenBeforeBed", e.target.checked)}
                  className="accent-[#B8860B]"
                />{" "}
                <Smartphone className="h-3.5 w-3.5 text-[#8A5A04]" /> Used phone in bed
              </label>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
                Notes (optional)
              </label>
              <textarea
                value={f.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                className="glass-input w-full resize-none rounded-lg px-3 py-2 text-xs outline-none"
                placeholder="felt tired, vivid dreams, woke up with headache…"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RunButton
              onClick={run}
              loading={loading}
              disabled={loading}
              accent={accent}
              label="Analyse my sleep"
            />
            <span className="text-[0.65rem] text-[#9A8F84]">
              Sleep efficiency & pattern detection
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
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard accent={accent} title="Total Sleep">
                <div className="flex items-center gap-3 py-2">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="grid h-16 w-16 place-items-center rounded-full shadow-depth"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                  >
                    <Moon className="h-7 w-7 text-white" />
                  </motion.div>
                  <div>
                    <p className="font-serif text-3xl font-bold text-[#1F1B17]">
                      {result.totalSleepHours}
                      <span className="ml-0.5 text-sm text-[#9A8F84]">hrs</span>
                    </p>
                    <p className="text-[0.65rem] text-[#9A8F84]">Recommended: 7-9 hrs for adults</p>
                  </div>
                </div>
              </ResultCard>
              <ResultCard
                accent={effColor(result.sleepEfficiencyCategory)}
                title="Sleep Efficiency"
              >
                <div className="flex items-center gap-3 py-2">
                  <div
                    className="grid h-16 w-16 place-items-center rounded-full shadow-depth"
                    style={{
                      background: `linear-gradient(135deg, ${effColor(result.sleepEfficiencyCategory)}, ${effColor(result.sleepEfficiencyCategory)}cc)`,
                    }}
                  >
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="font-serif text-3xl font-bold text-[#1F1B17]">
                      {result.sleepEfficiencyPercent}
                      <span className="ml-0.5 text-sm text-[#9A8F84]">%</span>
                    </p>
                    <SeverityBadge
                      level={
                        result.sleepEfficiencyCategory?.toLowerCase().includes("excel")
                          ? "normal"
                          : result.sleepEfficiencyCategory?.toLowerCase().includes("good")
                            ? "low"
                            : result.sleepEfficiencyCategory?.toLowerCase().includes("fair")
                              ? "moderate"
                              : "high"
                      }
                    />
                  </div>
                </div>
                <p className="text-[0.65rem] text-[#9A8F84]">{result.sleepEfficiencyCategory}</p>
              </ResultCard>
            </div>

            {result.patternsDetected?.length > 0 && (
              <ResultCard accent="#C9962E" title="Patterns Detected">
                <div className="space-y-2.5">
                  {result.patternsDetected.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl bg-[#FAF7F2]/60 p-2.5"
                    >
                      <span
                        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                        style={{ background: `${accent}15`, color: accent }}
                      >
                        <Moon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1F1B17]">{p.name}</p>
                          <SeverityBadge level={p.severity} />
                        </div>
                        <p className="mt-0.5 text-xs text-[#5C544D]">{p.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ResultCard>
            )}

            {result.issues?.length > 0 && (
              <ResultCard accent="#B8860B" title="Issues Identified">
                <ul className="space-y-2">
                  {result.issues.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#8A5A04]">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
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

            {result.sleepHygieneTips?.length > 0 && (
              <ResultCard accent="#9DB89E" title="Sleep Hygiene Tips">
                <ul className="space-y-2">
                  {result.sleepHygieneTips.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]">
                      <Moon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9DB89E]" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <ResultCard accent="#B8860B" title="When to See a Doctor">
              <p className="text-sm leading-relaxed text-[#1F1B17]">{result.whenToSeeDoctor}</p>
            </ResultCard>

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

function RatingSlider({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#9A8F84]">
          {label}
        </label>
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className="h-3.5 w-3.5"
                fill={i <= value ? accent : "transparent"}
                stroke={i <= value ? accent : "#E5DFD4"}
              />
            </button>
          ))}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#EFE9E0]">
        <motion.div
          animate={{ width: `${(value / 5) * 100}%` }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}
        />
      </div>
    </div>
  );
}
