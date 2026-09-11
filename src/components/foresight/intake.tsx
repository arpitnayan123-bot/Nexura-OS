"use client";

/* ============================================================
 * FORESIGHT INTAKE — catalog + step forms.
 * Adults only (18+). Every step is optional unless marked;
 * skipping degrades confidence honestly instead of faking data.
 * Emergency-symptom pills use rose styling to signal weight.
 * ============================================================ */

import { Field, PillGroup } from "./ui";
import { cn } from "@/lib/utils";
import type { ForesightInput, SymptomEntry } from "@/modules/foresight/types";

/* ---------------- symptom catalog ---------------- */

export interface SymptomDef {
  id: string;
  label: string;
  urgent?: boolean;
}

export const SYMPTOM_GROUPS: { group: string; items: SymptomDef[] }[] = [
  {
    group: "Emergency-weight — share if present",
    items: [
      { id: "sym.chest_pain", label: "Chest pain or pressure", urgent: true },
      { id: "sym.breathlessness", label: "Breathlessness at rest", urgent: true },
      { id: "sym.one_side_weakness", label: "Weakness on one side / face droop", urgent: true },
      { id: "sym.speech_slur", label: "Slurred or lost speech", urgent: true },
      { id: "sym.vision_sudden", label: "Sudden vision change/loss", urgent: true },
      { id: "sym.seizure", label: "Seizure / fit", urgent: true },
      { id: "sym.fainting", label: "Fainting / blackout", urgent: true },
      { id: "sym.severe_bleeding", label: "Heavy uncontrolled bleeding", urgent: true },
      { id: "sym.hopelessness", label: "Feeling hopeless / thoughts of self-harm", urgent: true },
    ],
  },
  {
    group: "General",
    items: [
      { id: "sym.fever_persistent", label: "Fever, going on for days" },
      { id: "sym.fatigue_persistent", label: "Tiredness that rest doesn't fix" },
      { id: "sym.weight_loss_unexplained", label: "Weight loss without trying" },
      { id: "sym.weight_gain_unexplained", label: "Weight gain without reason" },
      { id: "sym.dizziness", label: "Dizziness / light-headedness" },
    ],
  },
  {
    group: "Metabolic (sugar patterns)",
    items: [
      { id: "sym.thirst_excess", label: "Unusual thirst" },
      { id: "sym.urination_frequent", label: "Passing urine very often" },
      { id: "sym.wounds_slow_heal", label: "Cuts healing slowly" },
      { id: "sym.tingling_feet", label: "Tingling / burning feet" },
    ],
  },
  {
    group: "Heart & blood",
    items: [
      { id: "sym.palpitations", label: "Palpitations / fluttering heart" },
      { id: "sym.breathless_exertion", label: "Breathless on mild exertion" },
      { id: "sym.pallor", label: "Looking pale (eyes/nails)" },
    ],
  },
  {
    group: "Bones, muscles & skin",
    items: [
      { id: "sym.bone_ache", label: "Body / bone aches" },
      { id: "sym.muscle_weakness", label: "Muscle weakness or cramps" },
      { id: "sym.hair_fall", label: "Noticeable hair fall" },
      { id: "sym.acne_severe", label: "Severe or persistent acne" },
      { id: "sym.cold_intolerance", label: "Feeling cold when others aren't" },
    ],
  },
  {
    group: "Stomach & digestion",
    items: [
      { id: "sym.severe_abdominal_pain", label: "Severe stomach pain", urgent: true },
      { id: "sym.right_upper_abdomen_ache", label: "Dull ache, upper right belly" },
      { id: "sym.bloating_persistent", label: "Persistent bloating" },
      { id: "sym.constipation", label: "Constipation" },
    ],
  },
  {
    group: "Breathing",
    items: [
      { id: "sym.cough_persistent", label: "Cough that won't go" },
      { id: "sym.wheeze", label: "Wheezing" },
    ],
  },
  {
    group: "Sleep",
    items: [
      { id: "sym.snoring_loud", label: "Loud snoring" },
      { id: "sym.sleep_apnea_gasp", label: "Waking gasping / choking" },
      { id: "sym.headache_morning", label: "Morning headaches" },
    ],
  },
  {
    group: "Mind & memory",
    items: [
      { id: "sym.low_mood", label: "Feeling low most days" },
      { id: "sym.panic_episodes", label: "Panic episodes" },
      { id: "sym.memory_fog", label: "Brain fog / forgetfulness" },
      { id: "sym.numbness_hands", label: "Numbness in hands" },
    ],
  },
  {
    group: "Hormonal (women)",
    items: [{ id: "sym.irregular_cycles", label: "Irregular menstrual cycles" }],
  },
];

export const ALL_SYMPTOMS: SymptomDef[] = SYMPTOM_GROUPS.flatMap((g) => g.items);

/* ---------------- form state ---------------- */

export type FsForm = ForesightInput;

export const EMPTY_FORM: FsForm = {
  profile: { ageYears: 0, sexAtBirth: "undisclosed" },
  symptoms: [],
  diet: {
    type: "vegetarian", cuisine: "mixed", sweetsPerWeek: "rare",
    friedPerWeek: "rare", sugaryDrinksPerWeek: "rare", riceRotiBalance: "balanced",
    salt: "moderate", breakfastSkipped: false, outsideFoodPerWeek: 0,
  },
  activity: { minutesPerWeek: 0, kinds: [], occupation: "desk", shiftWork: false },
  sleep: { hoursPerNight: 7, quality: "fair", snoring: "none", daytimeSleepiness: "none", schedule: "regular", screensBeforeBed: false },
  vitals: {},
  labs: {},
  history: { conditions: [], familyHistory: [], tobacco: "never", alcohol: "never", stress: "moderate", moodLowDays: 0 },
  environment: { aqiBand: "unknown" },
  freeText: "",
};

const numOrUndef = (v: string): number | undefined => {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/* ================= STEP 1 · PROFILE ================= */

export function StepProfile({ form, set }: { form: FsForm; set: (p: Partial<FsForm>) => void }) {
  const bmi =
    form.profile.heightCm && form.profile.weightKg
      ? Math.round((form.profile.weightKg / Math.pow(form.profile.heightCm / 100, 2)) * 10) / 10
      : null;
  const band =
    bmi == null ? null
    : bmi < 18.5 ? "below healthy range (South-Asian bands)"
    : bmi < 23 ? "healthy for South Asians"
    : bmi < 25 ? "overweight (South-Asian cutoff is 23)"
    : bmi < 27.5 ? "high-risk band for South Asians"
    : "obese band for South Asians";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Age (years)">
          <input className="nxf-input" type="number" inputMode="numeric" min={18} max={100}
            value={form.profile.ageYears || ""}
            onChange={(e) => set({ profile: { ...form.profile, ageYears: Number(e.target.value) || 0 } })}
            placeholder="e.g. 34" required />
        </Field>
        <Field label="Sex at birth">
          <select className="nxf-input" value={form.profile.sexAtBirth}
            onChange={(e) => set({ profile: { ...form.profile, sexAtBirth: e.target.value as FsForm["profile"]["sexAtBirth"] } })}>
            <option value="undisclosed">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="intersex">Intersex</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Height (cm)">
          <input className="nxf-input" type="number" inputMode="decimal" min={90} max={230}
            value={form.profile.heightCm ?? ""}
            onChange={(e) => set({ profile: { ...form.profile, heightCm: numOrUndef(e.target.value) } })}
            placeholder="e.g. 170" />
        </Field>
        <Field label="Weight (kg)">
          <input className="nxf-input" type="number" inputMode="decimal" min={25} max={350}
            value={form.profile.weightKg ?? ""}
            onChange={(e) => set({ profile: { ...form.profile, weightKg: numOrUndef(e.target.value) } })}
            placeholder="e.g. 72" />
        </Field>
        <Field label="Waist (cm)" why="strongest single signal">
          <input className="nxf-input" type="number" inputMode="decimal" min={50} max={200}
            value={form.profile.waistCm ?? ""}
            onChange={(e) => set({ profile: { ...form.profile, waistCm: numOrUndef(e.target.value) } })}
            placeholder="at the navel" />
        </Field>
      </div>
      {bmi != null && (
        <div className="nxf-glass px-4 py-3 text-sm">
          <span className="nxf-mute">BMI </span>
          <span className="nxf-mono font-semibold nxf-teal">{bmi}</span>
          <span className="nxf-dim"> — {band}. India's risk bands start at 23, lower than Western charts.</span>
        </div>
      )}
      {form.profile.sexAtBirth === "female" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-400"
            checked={form.profile.pregnancyPossibility === true}
            onChange={(e) => set({ profile: { ...form.profile, pregnancyPossibility: e.target.checked } })} />
          <span className="text-[13px] nxf-body">
            There is a possibility I am pregnant
            <span className="block text-[11px] nxf-mute">Adds antenatal safety checks (iron, thyroid, BP)</span>
          </span>
        </label>
      )}
      <p className="text-[11.5px] leading-relaxed nxf-mute">
        Adults only (18+). For children and teenagers, a paediatrician should lead — growth charts change every rule this tool knows.
      </p>
    </div>
  );
}

/* ================= STEP 2 · SYMPTOMS ================= */

export function StepSymptoms({
  form, set,
}: {
  form: FsForm;
  set: (p: Partial<FsForm>) => void;
}) {
  const toggle = (id: string) => {
    const has = form.symptoms.some((s) => s.id === id);
    const next = has
      ? form.symptoms.filter((s) => s.id !== id)
      : [...form.symptoms, { id, severity: 5, onsetDays: 1, worsening: false } as SymptomEntry];
    set({ symptoms: next });
  };
  const selected = new Set(form.symptoms.map((s) => s.id));

  return (
    <div className="space-y-5">
      {SYMPTOM_GROUPS.map((g) => (
        <div key={g.group}>
          <p className={cn("mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]",
            g.items[0]?.urgent ? "nxf-rose" : "nxf-mute")}>
            {g.group}
          </p>
          <div className="flex flex-wrap gap-2">
            {g.items.map((s) => (
              <button key={s.id} type="button"
                className={cn("nxf-pill", s.urgent && "nxf-pill-rose")}
                aria-pressed={selected.has(s.id)}
                onClick={() => toggle(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {form.symptoms.length > 0 && (
        <div className="nxf-glass space-y-4 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] nxf-teal">Details for what you selected</p>
          {form.symptoms.map((s) => {
            const def = ALL_SYMPTOMS.find((a) => a.id === s.id);
            return (
              <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <p className="mb-2.5 text-[13px] font-medium nxf-hi">{def?.label ?? s.id}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-[11px] nxf-mute">
                    Severity: <span className="nxf-mono nxf-teal">{s.severity}/10</span>
                    <input type="range" min={1} max={10} value={s.severity} className="nxf-range mt-1"
                      onChange={(e) => set({ symptoms: form.symptoms.map((x) => x.id === s.id ? { ...x, severity: Number(e.target.value) } : x) })} />
                  </label>
                  <label className="block text-[11px] nxf-mute">
                    Going on for (days)
                    <input type="number" min={0} max={3650} value={s.onsetDays} className="nxf-input mt-1"
                      onChange={(e) => set({ symptoms: form.symptoms.map((x) => x.id === s.id ? { ...x, onsetDays: Number(e.target.value) || 0 } : x) })} />
                  </label>
                  <label className="flex items-end gap-2 pb-1 text-[12px] nxf-body">
                    <input type="checkbox" className="h-4 w-4 accent-teal-400" checked={s.worsening}
                      onChange={(e) => set({ symptoms: form.symptoms.map((x) => x.id === s.id ? { ...x, worsening: e.target.checked } : x) })} />
                    Getting worse
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Field label="In your words (optional)" why="scanned only for safety flags">
        <textarea className="nxf-input min-h-[84px]" maxLength={2000}
          value={form.freeText ?? ""}
          onChange={(e) => set({ freeText: e.target.value })}
          placeholder="Describe it the way you'd tell a family member — any language." />
      </Field>
    </div>
  );
}

/* ================= STEP 3 · DIET ================= */

const BAND_OPTS = [
  { value: "none", label: "Never" },
  { value: "rare", label: "Rarely", hint: "≤1/wk" },
  { value: "weekly", label: "Weekly-ish", hint: "2-4/wk" },
  { value: "daily", label: "Daily / most days" },
];

export function StepDiet({ form, set }: { form: FsForm; set: (p: Partial<FsForm>) => void }) {
  const d = form.diet;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Diet pattern">
          <select className="nxf-input" value={d.type}
            onChange={(e) => set({ diet: { ...d, type: e.target.value as FsForm["diet"]["type"] } })}>
            <option value="vegetarian">Vegetarian</option>
            <option value="eggetarian">Eggetarian</option>
            <option value="non_veg">Non-vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="jain">Jain</option>
          </select>
        </Field>
        <Field label="Cuisine you eat most">
          <select className="nxf-input" value={d.cuisine}
            onChange={(e) => set({ diet: { ...d, cuisine: e.target.value as FsForm["diet"]["cuisine"] } })}>
            <option value="north">North Indian</option>
            <option value="south">South Indian</option>
            <option value="east">East Indian</option>
            <option value="west">West Indian</option>
            <option value="northeast">Northeast</option>
            <option value="mixed">Mixed / pan-Indian</option>
          </select>
        </Field>
      </div>

      <Field label="Sweets / mithai">
        <PillGroup options={BAND_OPTS} value={d.sweetsPerWeek}
          onChange={(v) => set({ diet: { ...d, sweetsPerWeek: v as FsForm["diet"]["sweetsPerWeek"] } })} />
      </Field>
      <Field label="Deep-fried food (pakora, puri, bhujia…)">
        <PillGroup options={BAND_OPTS} value={d.friedPerWeek}
          onChange={(v) => set({ diet: { ...d, friedPerWeek: v as FsForm["diet"]["friedPerWeek"] } })} />
      </Field>
      <Field label="Sugary drinks (cold drinks, packaged juice)">
        <PillGroup options={BAND_OPTS} value={d.sugaryDrinksPerWeek}
          onChange={(v) => set({ diet: { ...d, sugaryDrinksPerWeek: v as FsForm["diet"]["sugaryDrinksPerWeek"] } })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rice vs roti balance">
          <select className="nxf-input" value={d.riceRotiBalance}
            onChange={(e) => set({ diet: { ...d, riceRotiBalance: e.target.value as FsForm["diet"]["riceRotiBalance"] } })}>
            <option value="balanced">Balanced</option>
            <option value="rice_heavy">Rice-dominant meals</option>
            <option value="roti_heavy">Roti-dominant meals</option>
          </select>
        </Field>
        <Field label="Salt intake" why="pickles, papad, namkeen count">
          <select className="nxf-input" value={d.salt}
            onChange={(e) => set({ diet: { ...d, salt: e.target.value as FsForm["diet"]["salt"] } })}>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Meals from outside / delivery per week">
          <input type="number" min={0} max={21} className="nxf-input" value={d.outsideFoodPerWeek || ""}
            onChange={(e) => set({ diet: { ...d, outsideFoodPerWeek: Number(e.target.value) || 0 } })} placeholder="e.g. 3" />
        </Field>
        <label className="flex cursor-pointer items-start gap-3 self-end rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-400" checked={d.breakfastSkipped}
            onChange={(e) => set({ diet: { ...d, breakfastSkipped: e.target.checked } })} />
          <span className="text-[13px] nxf-body">I usually skip breakfast</span>
        </label>
      </div>
    </div>
  );
}

/* ================= STEP 4 · ACTIVITY ================= */

const KINDS = ["walking", "yoga", "gym / strength", "running", "cycling", "sports", "swimming", "household work"];

export function StepActivity({ form, set }: { form: FsForm; set: (p: Partial<FsForm>) => void }) {
  const a = form.activity;
  const pct = Math.min(100, Math.round((a.minutesPerWeek / 150) * 100));
  return (
    <div className="space-y-5">
      <Field label="Brisk activity per week (minutes)" why="WHO target: 150">
        <input type="range" min={0} max={600} step={10} value={a.minutesPerWeek} className="nxf-range"
          onChange={(e) => set({ activity: { ...a, minutesPerWeek: Number(e.target.value) } })} />
        <p className="mt-1.5 text-[12px] nxf-dim">
          <span className="nxf-mono nxf-teal">{a.minutesPerWeek} min</span>
          {a.minutesPerWeek >= 150 ? " — target met. This is genuinely protective." : ` — ${150 - a.minutesPerWeek} min short of the 150-min target.`}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div className="nxf-bar-fill h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400" style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
      </Field>
      <Field label="What you actually do (select all)">
        <PillGroup multi values={a.kinds} onChange={(v) => {
          const has = a.kinds.includes(v);
          set({ activity: { ...a, kinds: has ? a.kinds.filter((k) => k !== v) : [...a.kinds, v] } });
        }} options={KINDS.map((k) => ({ value: k, label: k }))} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Typical day">
          <select className="nxf-input" value={a.occupation}
            onChange={(e) => set({ activity: { ...a, occupation: e.target.value as FsForm["activity"]["occupation"] } })}>
            <option value="desk">Desk / sitting most of the day</option>
            <option value="field">Field / physically active work</option>
            <option value="household">Household work</option>
            <option value="student">Student</option>
            <option value="other">Something else</option>
          </select>
        </Field>
        <label className="flex cursor-pointer items-start gap-3 self-end rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-400" checked={a.shiftWork}
            onChange={(e) => set({ activity: { ...a, shiftWork: e.target.checked } })} />
          <span className="text-[13px] nxf-body">Night or rotating shifts</span>
        </label>
      </div>
    </div>
  );
}

/* ================= STEP 5 · SLEEP ================= */

export function StepSleep({ form, set }: { form: FsForm; set: (p: Partial<FsForm>) => void }) {
  const s = form.sleep;
  return (
    <div className="space-y-5">
      <Field label="Hours of sleep, most nights" why="healthy band: 7-9">
        <input type="range" min={3} max={12} step={0.5} value={s.hoursPerNight || 7} className="nxf-range"
          onChange={(e) => set({ sleep: { ...s, hoursPerNight: Number(e.target.value) } })} />
        <p className="mt-1.5 text-[12px] nxf-dim">
          <span className="nxf-mono nxf-teal">{s.hoursPerNight || 0} h</span>
          {(s.hoursPerNight || 0) >= 7 && (s.hoursPerNight || 0) <= 9 ? " — inside the healthy band" : (s.hoursPerNight || 0) < 7 ? " — under-sleeping" : " — above the usual band"}
        </p>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sleep quality">
          <select className="nxf-input" value={s.quality}
            onChange={(e) => set({ sleep: { ...s, quality: e.target.value as FsForm["sleep"]["quality"] } })}>
            <option value="good">Good — wake refreshed</option>
            <option value="fair">Fair — sometimes broken</option>
            <option value="poor">Poor — rarely rested</option>
          </select>
        </Field>
        <Field label="Sleep-wake schedule">
          <select className="nxf-input" value={s.schedule}
            onChange={(e) => set({ sleep: { ...s, schedule: e.target.value as FsForm["sleep"]["schedule"] } })}>
            <option value="regular">Regular timings</option>
            <option value="irregular">Irregular / all over the place</option>
          </select>
        </Field>
        <Field label="Snoring">
          <select className="nxf-input" value={s.snoring}
            onChange={(e) => set({ sleep: { ...s, snoring: e.target.value as FsForm["sleep"]["snoring"] } })}>
            <option value="none">No / don't know</option>
            <option value="occasional">Occasional</option>
            <option value="loud_regular">Loud and regular</option>
          </select>
        </Field>
        <Field label="Daytime sleepiness">
          <select className="nxf-input" value={s.daytimeSleepiness}
            onChange={(e) => set({ sleep: { ...s, daytimeSleepiness: e.target.value as FsForm["sleep"]["daytimeSleepiness"] } })}>
            <option value="none">Rarely sleepy in the day</option>
            <option value="mild">Afternoon dips</option>
            <option value="severe">Fighting sleep at work/while reading</option>
          </select>
        </Field>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-400" checked={s.screensBeforeBed}
          onChange={(e) => set({ sleep: { ...s, screensBeforeBed: e.target.checked } })} />
        <span className="text-[13px] nxf-body">Screens (phone/TV) until I fall asleep</span>
      </label>
    </div>
  );
}

/* ================= STEP 6 · VITALS ================= */

export function StepVitals({ form, set }: { form: FsForm; set: (p: Partial<FsForm>) => void }) {
  const v = form.vitals;
  const bpOk = v.systolic && v.diastolic;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Blood pressure" why="e.g. 128/84">
          <input className="nxf-input" placeholder="120/80"
            value={v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : ""}
            onChange={(e) => {
              const m = e.target.value.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
              set({ vitals: { ...v, systolic: m ? Number(m[1]) : undefined, diastolic: m ? Number(m[2]) : undefined } });
            }} inputMode="numeric" />
        </Field>
        <Field label="Pulse (bpm)">
          <input className="nxf-input" type="number" min={30} max={220} value={v.pulse ?? ""}
            onChange={(e) => set({ vitals: { ...v, pulse: numOrUndef(e.target.value) } })} placeholder="e.g. 76" />
        </Field>
        <Field label="SpO₂ (%)">
          <input className="nxf-input" type="number" min={50} max={100} value={v.spo2 ?? ""}
            onChange={(e) => set({ vitals: { ...v, spo2: numOrUndef(e.target.value) } })} placeholder="95+" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Blood sugar (mg/dL, Indian units)">
          <input className="nxf-input" type="number" min={20} max={700} value={v.glucoseMgDl ?? ""}
            onChange={(e) => set({ vitals: { ...v, glucoseMgDl: numOrUndef(e.target.value) } })} placeholder="e.g. 112" />
        </Field>
        <Field label="That reading was">
          <select className="nxf-input" value={v.glucoseContext ?? "random"}
            onChange={(e) => set({ vitals: { ...v, glucoseContext: e.target.value as FsForm["vitals"]["glucoseContext"] } })}>
            <option value="fasting">Fasting (empty stomach)</option>
            <option value="random">Random (any time)</option>
            <option value="post_meal">2 hours after a meal</option>
          </select>
        </Field>
      </div>
      {bpOk != null && (
        <p className="text-[11.5px] nxf-mute">Seated and rested for 5 minutes before measuring gives the truest numbers.</p>
      )}
      {!v.systolic && (
        <p className="text-[11.5px] nxf-mute">No BP reading? Skip — we'll mark it as a missing signal rather than guessing.</p>
      )}
    </div>
  );
}

/* ================= STEP 7 · LABS (optional) ================= */

export function StepLabs({ form, set }: { form: FsForm; set: (p: Partial<FsForm>) => void }) {
  const l = form.labs;
  const items: { key: keyof FsForm["labs"]; label: string; ph: string; unit: string }[] = [
    { key: "hba1cPct", label: "HbA1c", ph: "5.4 - 8", unit: "%" },
    { key: "hemoglobinGdl", label: "Haemoglobin", ph: "9 - 17", unit: "g/dL" },
    { key: "tshMiuL", label: "TSH", ph: "0.4 - 10", unit: "mIU/L" },
    { key: "vitaminDNgMl", label: "Vitamin D (25-OH)", ph: "5 - 80", unit: "ng/mL" },
    { key: "b12PgMl", label: "Vitamin B12", ph: "80 - 1200", unit: "pg/mL" },
    { key: "ldlMgDl", label: "LDL cholesterol", ph: "60 - 220", unit: "mg/dL" },
    { key: "hdlMgDl", label: "HDL cholesterol", ph: "20 - 110", unit: "mg/dL" },
    { key: "triglyceridesMgDl", label: "Triglycerides", ph: "60 - 800", unit: "mg/dL" },
  ];
  return (
    <div className="space-y-5">
      <p className="text-[12.5px] leading-relaxed nxf-dim">
        If you have any recent lab report, even one value sharpens the whole map — labs act as anchors that override guesswork.
        No reports? Skip freely.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((it) => (
          <Field key={it.key} label={it.label} why={it.unit}>
            <input className="nxf-input" type="number" inputMode="decimal" placeholder={it.ph}
              value={(l[it.key] as number | undefined) ?? ""}
              onChange={(e) => set({ labs: { ...l, [it.key]: numOrUndef(e.target.value) } })} />
          </Field>
        ))}
      </div>
    </div>
  );
}

/* ================= STEP 8 · HISTORY & HABITS ================= */

const FAM = [
  { value: "diabetes", label: "Diabetes" },
  { value: "heart_disease", label: "Heart disease" },
  { value: "hypertension", label: "High BP" },
  { value: "thyroid", label: "Thyroid" },
  { value: "cancer", label: "Cancer" },
  { value: "pcos", label: "PCOS" },
  { value: "obesity", label: "Obesity" },
];

export function StepHistory({ form, set }: { form: FsForm; set: (p: Partial<FsForm>) => void }) {
  const h = form.history;
  return (
    <div className="space-y-5">
      <Field label="Conditions already diagnosed (type, comma separated)" why="optional">
        <input className="nxf-input" placeholder="e.g. hypothyroid, prediabetes"
          value={h.conditions.join(", ")}
          onChange={(e) => set({ history: { ...h, conditions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 15) } })} />
      </Field>
      <Field label="Family history (blood relations)">
        <PillGroup multi values={h.familyHistory}
          onChange={(v) => {
            const has = h.familyHistory.includes(v as FsForm["history"]["familyHistory"][number]);
            set({ history: { ...h, familyHistory: has ? h.familyHistory.filter((k) => k !== v) : [...h.familyHistory, v as FsForm["history"]["familyHistory"][number]] } });
          }}
          options={FAM} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tobacco" why="gutkha/paan included">
          <select className="nxf-input" value={h.tobacco}
            onChange={(e) => set({ history: { ...h, tobacco: e.target.value as FsForm["history"]["tobacco"] } })}>
            <option value="never">Never</option>
            <option value="former">Quit earlier</option>
            <option value="current_smoke">Currently smoke</option>
            <option value="smokeless">Smokeless (gutkha/paan/mishri)</option>
          </select>
        </Field>
        <Field label="Alcohol">
          <select className="nxf-input" value={h.alcohol}
            onChange={(e) => set({ history: { ...h, alcohol: e.target.value as FsForm["history"]["alcohol"] } })}>
            <option value="never">Never</option>
            <option value="occasional">Occasional</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </Field>
      </div>
      <Field label="Stress, these past weeks">
        <PillGroup
          value={h.stress}
          onChange={(v) => set({ history: { ...h, stress: v as FsForm["history"]["stress"] } })}
          options={[
            { value: "low", label: "Manageable" },
            { value: "moderate", label: "Moderate" },
            { value: "high", label: "Heavy" },
          ]} />
      </Field>
      <Field label={`Days feeling low or hopeless in the last 2 weeks: ${h.moodLowDays}`}>
        <input type="range" min={0} max={14} value={h.moodLowDays} className="nxf-range"
          onChange={(e) => set({ history: { ...h, moodLowDays: Number(e.target.value) } })} />
        <p className="mt-1 text-[11.5px] nxf-mute">
          Honest answers route you to free support (Tele-MANAS 14416) — never to judgment.
        </p>
      </Field>
      {form.profile.sexAtBirth === "female" && (
        <Field label="Menstrual cycles are">
          <select className="nxf-input" value={h.menstruationRegular === undefined ? "" : h.menstruationRegular ? "regular" : "irregular"}
            onChange={(e) => set({ history: { ...h, menstruationRegular: e.target.value === "" ? undefined : e.target.value === "regular" } })}>
            <option value="">Prefer not to say</option>
            <option value="regular">Mostly regular</option>
            <option value="irregular">Irregular / unpredictable</option>
          </select>
        </Field>
      )}
    </div>
  );
}

/* ================= STEP 9 · ENVIRONMENT ================= */

export function StepEnvironment({ form, set }: { form: FsForm; set: (p: Partial<FsForm>) => void }) {
  const env = form.environment;
  return (
    <div className="space-y-5">
      <Field label="Air quality where you live (AQI)">
        <PillGroup
          value={env.aqiBand}
          onChange={(v) => set({ environment: { ...env, aqiBand: v as FsForm["environment"]["aqiBand"] } })}
          options={[
            { value: "unknown", label: "Don't know" },
            { value: "good", label: "Good", hint: "0-50" },
            { value: "moderate", label: "Moderate", hint: "51-100" },
            { value: "poor", label: "Poor", hint: "101-200" },
            { value: "very_poor", label: "Very poor", hint: "201-300" },
            { value: "severe", label: "Severe", hint: "300+" },
          ]} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City (optional)" why="context only — never a label">
          <input className="nxf-input" value={env.city ?? ""} maxLength={60}
            onChange={(e) => set({ environment: { ...env, city: e.target.value } })}
            placeholder="e.g. Lucknow" />
        </Field>
        <Field label="Daily sunlight on skin (minutes)">
          <input className="nxf-input" type="number" min={0} max={600} value={env.sunlightMinutesPerDay ?? ""}
            onChange={(e) => set({ environment: { ...env, sunlightMinutesPerDay: numOrUndef(e.target.value) } })}
            placeholder="e.g. 20" />
        </Field>
      </div>
      <p className="text-[11.5px] nxf-mute">Your city is stored only with your runs — it is never used to assume anything about you.</p>
    </div>
  );
}

/* ================= STEP 10 · REVIEW ================= */

export function StepReview({ form }: { form: FsForm }) {
  const sCount = form.symptoms.length;
  const bmi = form.profile.heightCm && form.profile.weightKg
    ? Math.round((form.profile.weightKg / Math.pow(form.profile.heightCm / 100, 2)) * 10) / 10 : null;
  const rows: [string, string][] = [
    ["Profile", `${form.profile.ageYears || "—"}y · ${form.profile.sexAtBirth}${bmi ? ` · BMI ${bmi}` : ""}${form.profile.waistCm ? ` · waist ${form.profile.waistCm}cm` : ""}`],
    ["Symptoms", sCount === 0 ? "None selected" : `${sCount} shared`],
    ["Diet", `${form.diet.type} · ${form.diet.cuisine} · sweets ${form.diet.sweetsPerWeek} · fried ${form.diet.friedPerWeek}`],
    ["Activity", `${form.activity.minutesPerWeek} min/wk · ${form.activity.occupation}${form.activity.shiftWork ? " · shifts" : ""}`],
    ["Sleep", `${form.sleep.hoursPerNight}h · ${form.sleep.quality}${form.sleep.snoring !== "none" ? " · snores" : ""}`],
    ["Vitals", form.vitals.systolic ? `${form.vitals.systolic}/${form.vitals.diastolic} BP${form.vitals.glucoseMgDl ? ` · sugar ${form.vitals.glucoseMgDl}` : ""}` : "Not shared"],
    ["Labs", Object.keys(form.labs).length ? "Shared" : "None"],
    ["History", `${form.history.tobacco === "never" ? "No tobacco" : "Tobacco: " + form.history.tobacco} · stress ${form.history.stress} · low-mood days ${form.history.moodLowDays}/14`],
    ["Environment", `AQI ${form.environment.aqiBand}${form.environment.city ? ` · ${form.environment.city}` : ""}`],
  ];
  return (
    <div className="space-y-3">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] nxf-mute">{k}</span>
          <span className="max-w-[65%] text-right text-[12.5px] nxf-body">{v}</span>
        </div>
      ))}
      <p className="pt-1 text-[11.5px] leading-relaxed nxf-mute">
        Everything runs through the foresight engine (deterministic, versioned) and saves only to your anonymous session. Delete anytime from Settings.
      </p>
    </div>
  );
}
