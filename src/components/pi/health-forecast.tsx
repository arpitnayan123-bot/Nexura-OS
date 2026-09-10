"use client";

/* ============================================================
 * PIE UI — My Health Forecast (patient view)
 * /predictive/my-future
 * Simple, non-clinical, empathetic. Interactive sliders show how
 * daily choices bend the risk curve ("If I walk 30 mins daily…").
 * Gamification: stars for adhering to Pre-Emptive Plans.
 * Tone: supportive, never alarming.
 * ============================================================ */

import { useMemo, useState } from "react";
import { Footprints, Heart, Moon, Pill, Sparkles, Star, TrendingDown, TrendingUp } from "lucide-react";
import { RiskSparkline } from "@/components/pi/risk-badge";

interface ForecastState {
  walkMin: number; // 0..60 min/day
  sleepHours: number; // 4..10 h
  medAdherence: number; // 0..100 %
  balancedMeals: number; // 0..14 meals/week
}

/** Deterministic, warm, non-clinical projection model for the patient view.
 *  Mirrors the twin's chronic-decay directionality with gentle math. */
function forecast(s: ForecastState): {
  score: number; // 0..100 "strain" (lower is better)
  outlook: "sunny" | "mixed" | "cloudy";
  headline: string;
  message: string;
  factors: { label: string; good: boolean; note: string }[];
} {
  let score = 42;
  score -= Math.min(14, s.walkMin * 0.24);
  score -= Math.max(0, (s.sleepHours - 7) * -2.6) - (s.sleepHours < 7 ? (7 - s.sleepHours) * 3.4 : 0);
  score += (100 - s.medAdherence) * 0.16;
  score -= Math.min(8, s.balancedMeals * 0.5);
  score = Math.max(4, Math.min(96, score));

  const outlook = score < 34 ? "sunny" : score < 58 ? "mixed" : "cloudy";
  const headline = outlook === "sunny" ? "Your heart health outlook is looking bright" : outlook === "mixed" ? "Your outlook is steady — small steps keep it moving up" : "Let's work on this together — your effort matters";
  const message =
    outlook === "sunny"
      ? "Whatever you're doing — keep going. Your daily habits are quietly protecting your heart."
      : outlook === "mixed"
        ? "You're closer than you think. One small change this week — a short evening walk counts."
        : "We noticed things have been heavier lately. That's okay. Pick ONE slider and nudge it — we'll take it from there.";
  const factors = [
    { label: "Daily movement", good: s.walkMin >= 30, note: s.walkMin >= 30 ? `${s.walkMin} min/day — great for your heart` : `add ${30 - s.walkMin} min to reach the gentle zone` },
    { label: "Sleep", good: s.sleepHours >= 7, note: s.sleepHours >= 7 ? `${s.sleepHours} h — well rested` : `${s.sleepHours} h — aim for a little more` },
    { label: "Medicines on time", good: s.medAdherence >= 80, note: `${s.medAdherence}% — ${s.medAdherence >= 80 ? "steady routine" : "reminders can help"}` },
    { label: "Balanced meals", good: s.balancedMeals >= 10, note: `${s.balancedMeals}/week — every one counts` },
  ];
  return { score: Math.round(score), outlook, headline, message, factors };
}

export function MyHealthForecast() {
  const [stars, setStars] = useState(3);
  const [s, setS] = useState<ForecastState>({ walkMin: 20, sleepHours: 6.5, medAdherence: 70, balancedMeals: 8 });
  const f = useMemo(() => forecast(s), [s]);
  const trend = useMemo(() => {
    const pts: number[] = [];
    let base = f.score;
    for (let i = 0; i < 12; i++) {
      pts.push(base);
      base += (s.walkMin >= 30 ? -1.1 : 0.9) + (s.medAdherence >= 80 ? -0.6 : 0.5);
    }
    return pts;
  }, [f.score, s.walkMin, s.medAdherence]);

  const improving = trend[trend.length - 1] < trend[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="flex items-center gap-2.5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-coral to-honey text-white">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">My Health Forecast</h1>
          <p className="text-xs text-muted-foreground">Powered by PIE · your body's weather report</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-black/8 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{f.headline}</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{f.message}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Health strain</p>
            <p className={`font-display text-4xl font-semibold ${f.outlook === "sunny" ? "text-emerald-500" : f.outlook === "mixed" ? "text-amber-500" : "text-rose-400"}`}>
              {f.score}
              <span className="text-base font-normal text-muted-foreground">/100</span>
            </p>
            <p className="text-[11px] text-muted-foreground">lower is calmer</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          {improving ? <TrendingDown className="h-4 w-4 text-emerald-500" /> : <TrendingUp className="h-4 w-4 text-amber-500" />}
          <span className="text-xs text-muted-foreground">{improving ? "Your curve is heading the right way" : "Nudge a slider — watch the curve respond"}</span>
          <RiskSparkline points={trend} w={140} h={30} />
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Slider
            icon={<Footprints className="h-4 w-4" />}
            label="If I walk…"
            value={`${s.walkMin} min daily`}
            min={0} max={60} step={5}
            v={s.walkMin}
            onChange={(v) => setS({ ...s, walkMin: v })}
          />
          <Slider
            icon={<Moon className="h-4 w-4" />}
            label="If I sleep…"
            value={`${s.sleepHours} h nightly`}
            min={4} max={10} step={0.5}
            v={s.sleepHours}
            onChange={(v) => setS({ ...s, sleepHours: v })}
          />
          <Slider
            icon={<Pill className="h-4 w-4" />}
            label="If I take medicines…"
            value={`${s.medAdherence}% on time`}
            min={0} max={100} step={5}
            v={s.medAdherence}
            onChange={(v) => setS({ ...s, medAdherence: v })}
          />
          <Slider
            icon={<Sparkles className="h-4 w-4" />}
            label="If I eat balanced…"
            value={`${s.balancedMeals} meals/week`}
            min={0} max={14} step={1}
            v={s.balancedMeals}
            onChange={(v) => setS({ ...s, balancedMeals: v })}
          />
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {f.factors.map((x) => (
            <div key={x.label} className="flex items-start gap-2 rounded-xl bg-black/[0.03] px-3 py-2 text-xs dark:bg-white/5">
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${x.good ? "bg-emerald-500" : "bg-amber-400"}`} />
              <span>
                <span className="font-semibold">{x.label}:</span> <span className="text-muted-foreground">{x.note}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-honey/30 bg-honey/10 p-5 dark:border-honey/20 dark:bg-honey/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Pre-Emptive Plan streak</h3>
            <p className="text-xs text-muted-foreground">Small wins add up. Your care team sees your effort — not perfection.</p>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setStars(i)} aria-label={`set ${i} stars`}>
                <Star className={`h-5 w-5 ${i <= stars ? "fill-honey text-honey" : "text-black/20 dark:text-white/25"}`} />
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {stars} of 5 plan steps this week · {stars >= 4 ? "You're on a roll — protect that streak." : "Every star is a real victory. Aim for one more."}
        </p>
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        This forecast is a gentle simulation from your care plan and trends (PIE, Class II SaMD).
        It supports — never replaces — your doctor's advice. If something feels wrong, contact your care team.
      </p>
    </div>
  );
}

function Slider({
  icon, label, value, min, max, step, v, onChange,
}: {
  icon: React.ReactNode; label: string; value: string;
  min: number; max: number; step: number; v: number; onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-black/8 p-3.5 dark:border-white/10">
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className="text-honey">{icon}</span> {label}
        <span className="ml-auto font-semibold text-foreground">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-honey"
      />
    </div>
  );
}
