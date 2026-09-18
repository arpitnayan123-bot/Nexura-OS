/* ============================================================
 * NEXURA DIY — CATEGORY MODULES (16)
 * A GoalModule turns a confirmed goal into a DETERMINISTIC
 * roadmap: milestones, daily tasks, stop rules, referral
 * triggers, reconciliation hints. AI may later enrich a
 * validated draft (shadow mode) — it can never write alone.
 * ============================================================ */

import type { DiyCategory } from "./types";

export interface RoadmapTask {
  title: string;
  detail: string;
  cadence: "DAILY" | "WEEKLY";
  estMinutes: number;
}

export interface Roadmap {
  summary: string;
  milestones: { title: string; detail: string; targetDay: number }[];
  tasks: RoadmapTask[];
  stopRules: string[];
  referralTriggers: string[];
  /** hints used by the reconciler when goals coexist */
  reconcileHints?: { pairsWithConflict: string[]; note: string };
}

export interface GoalModule {
  category: DiyCategory;
  defaultDays: number;
  build(days: number): Roadmap;
}

const d = (
  title: string,
  detail: string,
  estMinutes = 10,
  cadence: RoadmapTask["cadence"] = "DAILY",
): RoadmapTask => ({
  title,
  detail,
  cadence,
  estMinutes,
});

const M = (title: string, detail: string, targetDay: number) => ({ title, detail, targetDay });

export const GOAL_MODULES: Record<DiyCategory, GoalModule> = {
  WEIGHT_LOSS: {
    category: "WEIGHT_LOSS",
    defaultDays: 84,
    build: (days) => ({
      summary: `A steady ${Math.round(days / 7)}-week rhythm: plate upgrades, daily walks, weekly reviews. No crash deficits — the safe pace is 0.5 kg/week.`,
      milestones: [
        M("Rhythm locked", "Meals and walks happen at consistent times most days.", 14),
        M(
          "Plate shift",
          "Half-plate vegetables, protein at every meal, liquids before food.",
          Math.round(days * 0.45),
        ),
        M("Honest review", "Measure, compare, decide: hold, ease, or continue.", days),
      ],
      tasks: [
        d(
          "10-minute after-meal walk",
          "Lunch ke baad ya dinner ke baad — sirf 10 minute, phone chhod ke.",
          10,
        ),
        d(
          "Protein at every meal",
          "Dal, curd, paneer, eggs or soya — one fist-sized portion per meal.",
          5,
        ),
        d(
          "Half-plate vegetables at lunch & dinner",
          "Sabzi half plate — variety beats perfection.",
          5,
        ),
        d(
          "Weekly weigh-in + note",
          "Same day, same time, clothes on. Log the number without judgment.",
          5,
          "WEEKLY",
        ),
        d("Liquid calories swap", "Sugary chai/coffee/juice count — swap one daily.", 2),
      ],
      stopRules: [
        "Lose >1 kg/week for 2 straight weeks → ease the deficit.",
        "Dizziness, hair shedding, cycle changes → pause and review.",
      ],
      referralTriggers: [
        "BMI-based medical conditions → clinical supervision first.",
        "Eating-distress language → counselor referral (iCall 9152987821).",
      ],
      reconcileHints: {
        pairsWithConflict: ["WEIGHT_GAIN"],
        note: "Loss and gain goals fight — keep one, or sequence them.",
      },
    }),
  },
  WEIGHT_GAIN: {
    category: "WEIGHT_GAIN",
    defaultDays: 90,
    build: (days) => ({
      summary: `A ${Math.round(days / 7)}-week muscle-first gain: calorie-dense Indian foods + progressive strength. Slow is normal here.`,
      milestones: [
        M("Eating rhythm", "3 meals + 2 additions at fixed times.", 14),
        M("Strength base", "Simple progressive home/gym routine.", Math.round(days * 0.5)),
        M("Review & adjust", "Weight trend + strength log review.", days),
      ],
      tasks: [
        d(
          "Add one calorie-dense item",
          "Peanut butter, banana shake, ghee-rota, dry fruits — one extra daily.",
          5,
        ),
        d("Strength session", "Squats, push, pull — add a little each week.", 30),
        d("Track intake honestly", "Note what you actually ate — gains need truth.", 4),
      ],
      stopRules: [
        "Rapid jump >1 kg/week → check it is not bloating.",
        "Appetite loss 3+ days → pause and review.",
      ],
      referralTriggers: ["Unintended weight history → rule out clinical causes first."],
    }),
  },
  SLEEP: {
    category: "SLEEP",
    defaultDays: 42,
    build: (days) => ({
      summary: `A ${Math.round(days / 7)}-week circadian reset: fixed wake time, light discipline, wind-down. No sedatives, ever.`,
      milestones: [
        M("Anchor the wake time", "Same wake time 7 days — even weekends ±30 min.", 10),
        M("Evening downshift", "Screens dimmed, caffeine cutoff held.", Math.round(days * 0.5)),
        M("Consolidation", "Sleep-onset and night-wake trend reviewed.", days),
      ],
      tasks: [
        d("Fixed wake time", "Alarm at the same time daily — this is the keystone.", 1),
        d("Caffeine cutoff 2 PM", "Chai/coffee after 2 PM steals deep sleep ~10 hours later.", 1),
        d("30-min wind-down", "Lights low, phone away, shower/read/stretch.", 30),
        d("Morning daylight", "10 minutes outside within an hour of waking.", 10),
      ],
      stopRules: [
        "No sleep for 2+ nights despite the routine → talk to a doctor.",
        "Loud snoring with gasping → get screened for sleep apnea.",
      ],
      referralTriggers: [
        "Suspected apnea, restless legs, chronic insomnia >3 months → clinical care.",
      ],
      reconcileHints: {
        pairsWithConflict: [],
        note: "Sleep improvements usually lift stress, energy and weight goals — protect them.",
      },
    }),
  },
  STRESS: {
    category: "STRESS",
    defaultDays: 42,
    build: (days) => ({
      summary: `A ${Math.round(days / 7)}-week downshift plan: micro-recovery daily, boundaries weekly, referral paths always visible.`,
      milestones: [
        M("Daily downshift", "One 10-minute practice lands daily.", 10),
        M("Boundary reps", "Two real boundary conversations had.", Math.round(days * 0.6)),
        M("Load review", "What to keep, drop, renegotiate.", days),
      ],
      tasks: [
        d(
          "10-minute downshift",
          "Slow breathing (4-6), a short walk, or shavasana — daily, non-negotiable.",
          10,
        ),
        d("Worry parking", "Write tomorrow's worry at 6 PM; it gets 10 minutes then.", 5),
        d("One boundary action", "One small 'no' or renegotiation this week.", 5, "WEEKLY"),
      ],
      stopRules: [
        "Physical symptoms (chest tightness, palpitations) → medical review.",
        "Practice feels activating, not calming → switch method.",
      ],
      referralTriggers: ["Hopelessness, self-harm thoughts → Tele-MANAS 14416 now."],
      reconcileHints: {
        pairsWithConflict: ["HABITS_SCREEN"],
        note: "Scroll time often feeds stress — the two plans align.",
      },
    }),
  },
  ANXIETY_MOOD: {
    category: "ANXIETY_MOOD",
    defaultDays: 56,
    build: (days) => ({
      summary: `Gentle ${Math.round(days / 7)}-week self-care: grounding, movement, sleep protection — with clinical care encouraged, never replaced.`,
      milestones: [
        M("Grounding habit", "One grounding technique used daily.", 14),
        M("Movement base", "Light movement most days.", Math.round(days * 0.5)),
        M("Check-in review", "Mood trend reviewed; care decision made.", days),
      ],
      tasks: [
        d(
          "5-4-3-2-1 grounding",
          "5 see, 4 touch, 3 hear, 2 smell, 1 taste — when anxiety spikes.",
          5,
        ),
        d("Daylight walk", "15 minutes outside, ideally morning.", 15),
        d("Mood check-in", "One line: how did today feel, what helped?", 3),
      ],
      stopRules: [
        "Panic attacks increasing → seek clinical care.",
        "Self-harm thoughts → Tele-MANAS 14416 immediately.",
      ],
      referralTriggers: ["Any Functional impairment at work/home → professional care recommended."],
    }),
  },
  SKIN_ACNE: {
    category: "SKIN_ACNE",
    defaultDays: 56,
    build: (days) => ({
      summary: `An 8-week gentle ladder: barrier care first, actives later, patch tests always. No home remedies on active acne.`,
      milestones: [
        M("Barrier basics", "Gentle cleanser + moisturizer + sunscreen, daily.", 14),
        M("Patch-test gate", "Any new product tested behind the ear x3 days.", 21),
        M("Progress review", "Photos compared in same light; derm decision.", days),
      ],
      tasks: [
        d("Cleanse gently 2x", "Mild face wash, lukewarm water, no scrubbing.", 3),
        d("Moisturize + sunscreen", "Non-comedogenic moisturizer; SPF 30+ every morning.", 4),
        d("Patch test new product", "Behind ear for 3 nights before face use.", 2),
        d("Weekly photo", "Same light, same angle — progress you can trust.", 3, "WEEKLY"),
      ],
      stopRules: [
        "Burning, peeling, redness after a product → pause it (irritation pause).",
        "Cystic/painful nodules → dermatologist, not products.",
      ],
      referralTriggers: ["Scarring, nodular acne, or no change in 8 weeks → dermatologist."],
      reconcileHints: {
        pairsWithConflict: [],
        note: "Acne routines pair safely with diet-quality goals.",
      },
    }),
  },
  SKIN_GENERAL: {
    category: "SKIN_GENERAL",
    defaultDays: 56,
    build: (days) => ({
      summary: `Barrier-first ${Math.round(days / 7)} weeks: sun, sleep, moisture — glow follows health, not 10-step routines.`,
      milestones: [
        M("Sun habit", "SPF every morning, reapply at noon.", 14),
        M("Night care", "Cleanse + moisturize nightly.", Math.round(days * 0.5)),
        M("Review", "Texture/tone photo comparison.", days),
      ],
      tasks: [
        d("Morning SPF", "SPF 30+ on face and neck — every single day.", 2),
        d("Night cleanse + moisturize", "Wash the day off, seal with moisturizer.", 4),
        d("Hydration target", "Water at each meal + one bottle between.", 2),
      ],
      stopRules: ["New rash, itching spreads → pause everything, consider a doctor."],
      referralTriggers: ["Persistent pigmentation change, non-healing spots → dermatologist."],
    }),
  },
  HAIR_HEALTH: {
    category: "HAIR_HEALTH",
    defaultDays: 90,
    build: (days) => ({
      summary: `A 90-day honesty plan: hair responds to nutrition, handling and time — 3 months minimum before judging.`,
      milestones: [
        M("Gentle handling", "No tight styles, hot tools 2x max/week.", 14),
        M("Protein + iron awareness", "Protein each meal; get levels checked if shedding.", 45),
        M("3-month review", "Shedding count + part-width photo.", days),
      ],
      tasks: [
        d("Protein with breakfast", "Eggs/paneer/dal/sprouts — hair is protein.", 5),
        d(
          "Gentle oiling (optional)",
          "If you oil: 1 hour max before wash, no overnight harsh massage.",
          15,
          "WEEKLY",
        ),
        d("Loose hairstyle day", "Avoid tight ponytails/buns today.", 1),
        d("Monthly hair photo", "Center part, same light — the honest record.", 3, "WEEKLY"),
      ],
      stopRules: [
        "Sudden patchy loss → dermatologist this week.",
        "Shedding with fatigue → check thyroid/iron/ferritin.",
      ],
      referralTriggers: [
        "Visible scalp, patchy alopecia, post-partum heavy shedding → clinical review.",
      ],
    }),
  },
  FITNESS_STRENGTH: {
    category: "FITNESS_STRENGTH",
    defaultDays: 56,
    build: (days) => ({
      summary: `An 8-week progressive strength base: 3 sessions/week, form first, add load slowly.`,
      milestones: [
        M("Form base", "Squat/hinge/push/pull patterns learned.", 14),
        M("Progressive load", "Reps or weight up gently each week.", Math.round(days * 0.6)),
        M("Strength review", "Reps maxed, photos, next block planned.", days),
      ],
      tasks: [
        d("Strength session", "3/week: squat, push, pull, hinge, carry — 2 sets to start.", 35),
        d("Protein after training", "20-30 g protein within a couple hours of sessions.", 5),
        d("Rest-day walk", "Easy 15-minute walk on off days.", 15),
      ],
      stopRules: [
        "Sharp joint pain → stop that movement, assess.",
        "Form breaks down → drop load.",
      ],
      referralTriggers: ["Existing cardiac/joint conditions → clinician-approved plan first."],
    }),
  },
  FITNESS_ENDURANCE: {
    category: "FITNESS_ENDURANCE",
    defaultDays: 56,
    build: (days) => ({
      summary: `A walk-to-run ${Math.round(days / 7)}-week ladder: easy pace wins, one long day weekly, rest is training.`,
      milestones: [
        M("Base: brisk walks", "30 min brisk walk, 4x/week.", 14),
        M("Intervals begin", "1-min jog / 2-min walk blocks.", Math.round(days * 0.5)),
        M("Continuous run", "20-30 min continuous easy pace.", days),
      ],
      tasks: [
        d("Brisk walk/jog intervals", "Follow the week's ladder; conversational pace.", 30),
        d("Long easy day", "One longer session weekly at chatty pace.", 45, "WEEKLY"),
        d("Shin/ankle check", "30 seconds of calf raises; note any pain.", 3),
      ],
      stopRules: [
        "Chest pain, unusual breathlessness → stop and seek care.",
        "Shin pain that worsens → rest and review.",
      ],
      referralTriggers: ["Cardiac history → clinician clearance first."],
    }),
  },
  DIET_QUALITY: {
    category: "DIET_QUALITY",
    defaultDays: 42,
    build: (days) => ({
      summary: `Plate-level upgrades over ${Math.round(days / 7)} weeks using foods you already eat — no exotic imports, no calorie police.`,
      milestones: [
        M("Breakfast upgrade", "Protein + fiber at breakfast daily.", 10),
        M(
          "Plate balance",
          "Half veg, quarter protein, quarter grain at lunch/dinner.",
          Math.round(days * 0.5),
        ),
        M("Sustained pattern", "Eating-out pattern reviewed honestly.", days),
      ],
      tasks: [
        d("Protein + fiber breakfast", "Sprouts/eggs/paneer + fruit or veg — before 10 AM.", 8),
        d("Half-plate vegetables", "At lunch AND dinner, colorful variety.", 5),
        d("One home-cooked swap", "Replace one outside/processed item daily.", 10),
      ],
      stopRules: [
        "Any meal skipped entirely for 2+ days → pause and review relationship with food.",
        "Rigid 'good/bad food' thinking → ease off, talk to a counselor if distressing.",
      ],
      referralTriggers: ["Diabetes/kidney conditions → dietitian-guided, not self-guided."],
      reconcileHints: {
        pairsWithConflict: [],
        note: "Diet-quality work quietly powers weight, skin, energy and hair goals.",
      },
    }),
  },
  ENERGY: {
    category: "ENERGY",
    defaultDays: 42,
    build: (days) => ({
      summary: `A ${Math.round(days / 7)}-week energy audit: sleep anchor, iron-aware nutrition, movement snacks — and honest lab checks.`,
      milestones: [
        M("Sleep anchor", "Fixed wake time held 7 days.", 10),
        M(
          "Fuel check",
          "Iron/protein-rich meals; consider CBC/ferritin if fatigue persists.",
          Math.round(days * 0.5),
        ),
        M("Trend review", "Energy ratings compared week over week.", days),
      ],
      tasks: [
        d("Fixed wake time", "Anchor the circadian rhythm.", 1),
        d("Movement snack", "5 minutes of movement every 2 sitting hours.", 5),
        d("Iron-aware meal", "Greens/beans/jaggery + vitamin-C source daily.", 6),
        d("Energy rating", "Rate energy 1-5 in the evening.", 1),
      ],
      stopRules: [
        "Breathlessness at rest, palpitations → medical review now.",
        "No improvement after 4-6 weeks → get basic labs.",
      ],
      referralTriggers: ["Persistent fatigue despite sleep → anemia/thyroid screen."],
    }),
  },
  DIGESTION: {
    category: "DIGESTION",
    defaultDays: 42,
    build: (days) => ({
      summary: `A gentle ${Math.round(days / 7)}-week gut rhythm: fiber pacing, water, movement, and alarm symptoms that always escalate.`,
      milestones: [
        M("Regular meal times", "Meals at consistent times.", 10),
        M("Fiber + water pacing", "Gradual fiber increase WITH water.", Math.round(days * 0.5)),
        M("Pattern review", "Symptom diary reviewed; escalate if unchanged.", days),
      ],
      tasks: [
        d("Fixed meal times", "Same 3 meal windows daily.", 2),
        d("Fiber, slowly", "One extra fiber source daily — increase gradually.", 5),
        d("Water before meals", "A glass of water 20 minutes before food.", 2),
        d("Post-lunch 10-min walk", "The simplest motility medicine.", 10),
        d("Symptom diary line", "One line about how the gut behaved today.", 2),
      ],
      stopRules: [
        "Blood in stool, weight loss, night pain → doctor now.",
        "Severe bloating with vomiting → urgent care.",
      ],
      referralTriggers: ["Alarm symptoms or >4 weeks without change → clinical evaluation."],
    }),
  },
  POSTURE_PAIN: {
    category: "POSTURE_PAIN",
    defaultDays: 28,
    build: (days) => ({
      summary: `A 4-week desk-body reset: micro-mobility hourly, strength 2x weekly, workstation fixes — pain escalation respected.`,
      milestones: [
        M("Hourly movement", "Movement snack every hour of desk time.", 7),
        M("Strength base", "Core/back routine 2x/week.", 21),
        M("Ergonomic reset", "Screen height, chair, break pattern set.", days),
      ],
      tasks: [
        d("Hourly movement snack", "Stand, roll shoulders, 5 cat-cow — every desk hour.", 3),
        d("Core + back routine", "Bird-dog, glute bridge, wall angels — 2x/week.", 20),
        d("Screen at eye level", "Books/stand under laptop today — check every break.", 2),
      ],
      stopRules: [
        "Pain radiating down a leg/arm, numbness → physio/doctor.",
        "Night pain waking you → clinical review.",
      ],
      referralTriggers: ["Red-flag back pain (fever, weight loss, bladder changes) → urgent care."],
    }),
  },
  HABITS_SCREEN: {
    category: "HABITS_SCREEN",
    defaultDays: 28,
    build: (days) => ({
      summary: `A 4-week friction plan: charge-out-of-bed, app timers, replacement rituals — design beats willpower.`,
      milestones: [
        M("Friction installed", "Charging spot + one timer set.", 7),
        M("Replacement ritual", "Evening slot has a real alternative.", 21),
        M("New default", "Screen audit shows sustained drop.", days),
      ],
      tasks: [
        d("Phone charges outside bedroom", "Buy a ₹200 alarm if needed — tonight.", 5),
        d("App timer on top offender", "15-minute daily cap on the worst app.", 5),
        d("Replacement ritual", "20 minutes: walk, book, music, family — scheduled.", 20),
        d("Sunday screen audit", "Check the week's number, adjust one dial.", 5, "WEEKLY"),
      ],
      stopRules: ["Cutting screens spikes anxiety badly → slow the pace, consider support."],
      referralTriggers: ["Screen use masking mood issues → counseling helps more than timers."],
      reconcileHints: {
        pairsWithConflict: ["SLEEP"],
        note: "Evening screens wreck sleep — these plans reinforce each other.",
      },
    }),
  },
  SUBSTANCE_REDUCTION: {
    category: "SUBSTANCE_REDUCTION",
    defaultDays: 28,
    build: (days) => ({
      summary: `A 4-week reduction scaffold: count, delay, replace — with quit-support humans alongside. Heavy dependence needs medical supervision.`,
      milestones: [
        M("Count honestly", "Daily count logged without shame.", 7),
        M("Delay + replace", "Urge protocol used daily.", 21),
        M("Support circle", "One person informed; help line saved.", days),
      ],
      tasks: [
        d("Log the count", "Every cigarette/drink logged — awareness first.", 2),
        d("Delay ritual", "Urge arrives → 10-minute delay + water/walk.", 10),
        d("Replacement ready", "Nimbu pani, gum, walk — whatever interrupts the pattern.", 5),
        d("Save Tele-MANAS 14416", "Free, 24x7, government quit support. Save it today.", 2),
      ],
      stopRules: [
        "Heavy daily dependence → medical supervision for withdrawal, especially alcohol.",
        "Quitting alcohol suddenly after heavy use can be dangerous — see a doctor.",
      ],
      referralTriggers: ["Any withdrawal tremors, sweats, confusion → urgent medical care."],
    }),
  },
};

export function moduleFor(category: string): GoalModule | null {
  return (GOAL_MODULES as Record<string, GoalModule>)[category] ?? null;
}
