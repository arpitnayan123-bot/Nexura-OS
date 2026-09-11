/* ============================================================
 * NEXURA PREDICTIVE — RED-FLAG TRIAGE RULESET v2.0
 *
 * Runs BEFORE any pattern analysis, on raw symptoms/vitals/
 * free-text. When an EMERGENCY flag fires, pattern analysis is
 * completely withheld and the result leads with the emergency
 * guidance. When uncertain, escalate — never reassure.
 *
 * Mental-health flags use warm, non-judgmental language and
 * route to Tele-MANAS (14416), KIRAN (1800-599-0019) and
 * AASRA (+91-9820466726). Free-text scanning covers English,
 * Hindi and Hinglish self-harm phrasing.
 * ============================================================ */

import type {
  ForesightInput,
  RedFlagHit,
  SymptomEntry,
  TriageResult,
} from "./types";

export const EMERGENCY_LINE = "108";
export const MENTAL_HEALTH_LINES = [
  { name: "Tele-MANAS", number: "14416" },
  { name: "KIRAN", number: "1800-599-0019" },
  { name: "AASRA", number: "+91-9820466726" },
];

/* Canonical symptom ids the engine understands. The UI catalog
   maps onto these ids; unknown ids never crash the engine. */
export const SYMPTOM_IDS = {
  chestPain: "sym.chest_pain",
  breathlessness: "sym.breathlessness",
  palpitations: "sym.palpitations",
  fainting: "sym.fainting",
  oneSideWeakness: "sym.one_side_weakness",
  speechSlur: "sym.speech_slur",
  visionSudden: "sym.vision_sudden",
  seizure: "sym.seizure",
  severeBleeding: "sym.severe_bleeding",
  severeAbdominalPain: "sym.severe_abdominal_pain",
  feverPersistent: "sym.fever_persistent",
  thirstExcess: "sym.thirst_excess",
  urinationFrequent: "sym.urination_frequent",
  weightLossUnexplained: "sym.weight_loss_unexplained",
  woundsSlowHeal: "sym.wounds_slow_heal",
  tinglingFeet: "sym.tingling_feet",
  fatiguePersistent: "sym.fatigue_persistent",
  breathlessExertion: "sym.breathless_exertion",
  dizziness: "sym.dizziness",
  pallor: "sym.pallor",
  boneAche: "sym.bone_ache",
  muscleWeakness: "sym.muscle_weakness",
  numbnessHands: "sym.numbness_hands",
  memoryFog: "sym.memory_fog",
  hairFall: "sym.hair_fall",
  coldIntolerance: "sym.cold_intolerance",
  weightGainUnexplained: "sym.weight_gain_unexplained",
  constipation: "sym.constipation",
  irregularCycles: "sym.irregular_cycles",
  acneSevere: "sym.acne_severe",
  coughPersistent: "sym.cough_persistent",
  wheeze: "sym.wheeze",
  snoringLoud: "sym.snoring_loud",
  sleepApneaGasp: "sym.sleep_apnea_gasp",
  headacheMorning: "sym.headache_morning",
  rightUpperAbdomenAche: "sym.right_upper_abdomen_ache",
  bloatingPersistent: "sym.bloating_persistent",
  lowMood: "sym.low_mood",
  hopelessness: "sym.hopelessness",
  panicEpisodes: "sym.panic_episodes",
} as const;

/* ------------------ EMERGENCY symptom rules ------------------ */

interface SymptomRule {
  id: string;
  match: (s: SymptomEntry, input: ForesightInput) => boolean;
  title: string;
  why: (s: SymptomEntry) => string;
  action: string;
}

const EMERGENCY_SYMPTOM_RULES: SymptomRule[] = [
  {
    id: "rf.cardio.chest_pain",
    match: (s) =>
      s.id === SYMPTOM_IDS.chestPain &&
      (s.severity >= 6 || s.worsening || s.onsetDays <= 2),
    title: "Chest pain needs emergency care",
    why: (s) =>
      `Chest pain (severity ${s.severity}/10${s.worsening ? ", worsening" : ""}) can be heart-related. Only a hospital can rule that out safely.`,
    action: `Call ${EMERGENCY_LINE} now or go to the nearest emergency room. Do not drive yourself.`,
  },
  {
    id: "rf.cardio.chest_plus_breath",
    match: (s, input) => {
      const breath = input.symptoms.find((x) => x.id === SYMPTOM_IDS.breathlessness);
      return s.id === SYMPTOM_IDS.chestPain && !!breath;
    },
    title: "Chest pain with breathlessness is an emergency",
    why: () => "The combination of chest pain and breathlessness is treated as a possible cardiac event until proven otherwise.",
    action: `Call ${EMERGENCY_LINE} immediately.`,
  },
  {
    id: "rf.resp.breathlessness_rest",
    match: (s) => s.id === SYMPTOM_IDS.breathlessness && s.severity >= 6,
    title: "Severe breathlessness needs emergency care",
    why: (s) => `Breathlessness at severity ${s.severity}/10 can signal a serious lung or heart problem.`,
    action: `Seek emergency care now — call ${EMERGENCY_LINE}.`,
  },
  {
    id: "rf.stroke.weakness",
    match: (s) =>
      s.id === SYMPTOM_IDS.oneSideWeakness ||
      s.id === SYMPTOM_IDS.speechSlur ||
      (s.id === SYMPTOM_IDS.visionSudden && s.severity >= 7),
    title: "Possible stroke signs — every minute counts",
    why: () => "One-sided weakness, slurred speech or sudden vision loss can be a stroke. Treatment works best within the first hours.",
    action: `Call ${EMERGENCY_LINE} RIGHT NOW. Note the time symptoms started — doctors will ask for it.`,
  },
  {
    id: "rf.neuro.seizure",
    match: (s) => s.id === SYMPTOM_IDS.seizure,
    title: "A seizure always needs urgent medical review",
    why: () => "A first-time or uncontrolled seizure requires emergency assessment.",
    action: `Go to an emergency room now — call ${EMERGENCY_LINE}.`,
  },
  {
    id: "rf.trauma.severe_bleeding",
    match: (s) => s.id === SYMPTOM_IDS.severeBleeding,
    title: "Severe bleeding is an emergency",
    why: () => "Heavy or uncontrolled bleeding needs immediate hospital care.",
    action: `Apply pressure and call ${EMERGENCY_LINE} immediately.`,
  },
  {
    id: "rf.alarm.fainting",
    match: (s) => s.id === SYMPTOM_IDS.fainting && s.severity >= 5,
    title: "Fainting needs same-day emergency review",
    why: () => "A blackout can be the first sign of a heart rhythm or neurological problem.",
    action: "Go to an emergency room today. Do not drive yourself.",
  },
];

/* ------------------ EMERGENCY vitals rules ------------------ */

function vitalsRules(input: ForesightInput): RedFlagHit[] {
  const hits: RedFlagHit[] = [];
  const v = input.vitals;
  if (v.systolic && v.systolic >= 180 && (v.diastolic ?? 0) >= 110) {
    hits.push({
      id: "rf.bp.crisis",
      level: "EMERGENCY",
      title: "Blood pressure is in a danger zone",
      why: `A reading of ${v.systolic}/${v.diastolic} mmHg is severely elevated.`,
      action: `Seek emergency care now — call ${EMERGENCY_LINE} or reach the nearest hospital.`,
      source: "vitals",
    });
  }
  if (v.glucoseMgDl != null && (v.glucoseMgDl >= 350 || v.glucoseMgDl <= 60)) {
    hits.push({
      id: "rf.glucose.extreme",
      level: "EMERGENCY",
      title: v.glucoseMgDl >= 350 ? "Blood sugar is critically high" : "Blood sugar is critically low",
      why: `A ${v.glucoseContext ?? "random"} glucose of ${v.glucoseMgDl} mg/dL is outside safe limits.`,
      action: v.glucoseMgDl <= 60
        ? "Take fast sugar (glucose/juice) if conscious and call a doctor immediately. Unresponsive: call 108."
        : `Seek urgent medical care today — call ${EMERGENCY_LINE} if you feel unwell.`,
      source: "vitals",
    });
  }
  if (v.spo2 != null && v.spo2 < 92) {
    hits.push({
      id: "rf.spo2.low",
      level: "EMERGENCY",
      title: "Oxygen level is dangerously low",
      why: `SpO2 of ${v.spo2}% means the body is not getting enough oxygen.`,
      action: `Go to an emergency room immediately — call ${EMERGENCY_LINE}.`,
      source: "vitals",
    });
  }
  return hits;
}

/* ------------------ SAME-DAY rules ------------------ */

const SAME_DAY_SYMPTOM_RULES: SymptomRule[] = [
  {
    id: "rf.fever.persistent",
    match: (s) =>
      s.id === SYMPTOM_IDS.feverPersistent && (s.onsetDays >= 3 || s.severity >= 7),
    title: "Persistent fever needs a doctor today",
    why: (s) => `Fever lasting ${s.onsetDays} day(s) at ${s.severity}/10 should be examined — monsoon-season fevers in India often need a blood test (dengue/typhoid/malaria panel).`,
    action: "Book a doctor visit today. Get CBC + dengue/malaria/typhoid panel if advised.",
  },
  {
    id: "rf.alarm.severe_abdominal",
    match: (s) => s.id === SYMPTOM_IDS.severeAbdominalPain && s.severity >= 7,
    title: "Severe abdominal pain needs same-day review",
    why: () => "Pain at this intensity can indicate appendicitis, gallstones or another acute cause.",
    action: "See a doctor today — urgent care if it worsens.",
  },
  {
    id: "rf.alarm.vision",
    match: (s) => s.id === SYMPTOM_IDS.visionSudden,
    title: "Sudden vision change needs same-day review",
    why: () => "Sudden vision changes must be examined quickly, both for eye and vascular causes.",
    action: "See an ophthalmologist or ER today.",
  },
];

/* ------------------ Mental-health safety net ------------------ */

const SELF_HARM_PATTERNS = [
  // English
  /\bsuicid(e|al)\b/i,
  /\bkill myself\b/i,
  /\bend(ing)? (my )?life\b/i,
  /\bno reason to live\b/i,
  /\bbetter off without me\b/i,
  /\bnot worth living\b/i,
  /\bself.?harm\b/i,
  /\bcut(ting)? myself\b/i,
  /\bwant to die\b/i,
  // Hindi / Hinglish (romanised)
  /\bmarna?\s+(chahta|chahati|chah_raha|chah_rahi)/i,
  /\bjaan\s+de\b/i,
  /\bkhudkhushi\b/i,
  /\bkhatam kar (doon|dun|lu|na)\b/i,
  /\bjeena nahi\b/i,
  /\bzindagi barbaad\b/i,
  // Devanagari
  /आत्महत्या/,
  /मरना चाहता/,
  /मरना चाहती/,
  /जीना नहीं/,
];

function mentalHealthHits(input: ForesightInput): RedFlagHit[] {
  const hits: RedFlagHit[] = [];
  const text = (input.freeText ?? "").toLowerCase();
  const textHit = SELF_HARM_PATTERNS.some((re) => re.test(text));
  const hopeless = input.symptoms.find((s) => s.id === SYMPTOM_IDS.hopelessness);
  const lowMood = input.symptoms.find((s) => s.id === SYMPTOM_IDS.lowMood);
  const severeMood =
    (hopeless && hopeless.severity >= 8) ||
    (lowMood && lowMood.severity >= 9) ||
    input.history.moodLowDays >= 12;

  if (textHit) {
    hits.push({
      id: "rf.mind.crisis_text",
      level: "EMERGENCY",
      title: "You told us something important — please reach out now",
      why: "Your words suggest you may be thinking about harming yourself. You deserve support right now, and trained counsellors are available free, 24×7.",
      action: `Call Tele-MANAS 14416 (24×7, free, all Indian languages) or KIRAN 1800-599-0019. If you are in immediate danger, call ${EMERGENCY_LINE}.`,
      source: "text",
    });
  } else if (severeMood) {
    hits.push({
      id: "rf.mind.crisis_mood",
      level: "SAME_DAY",
      title: "This emotional load is too heavy to carry alone",
      why: "You reported feeling low or hopeless almost every day for two weeks. That matters and deserves prompt, kind attention.",
      action: `Talk to a counsellor today — Tele-MANAS 14416 is free and 24×7. If thoughts of self-harm occur, call ${EMERGENCY_LINE} immediately.`,
      source: "symptom",
    });
  }
  return hits;
}

/* ------------------ Pregnancy-specific ------------------ */

function pregnancyHits(input: ForesightInput): RedFlagHit[] {
  const hits: RedFlagHit[] = [];
  if (!input.profile.pregnancyPossibility) return hits;
  const bleeding = input.symptoms.find((s) => s.id === SYMPTOM_IDS.severeBleeding);
  const abdominal = input.symptoms.find((s) => s.id === SYMPTOM_IDS.severeAbdominalPain);
  const swelling = /\b(swelling|feet swell|soojan)\b/i.test(input.freeText ?? "");
  if (bleeding) {
    hits.push({
      id: "rf.preg.bleeding",
      level: "EMERGENCY",
      title: "Bleeding during possible pregnancy is an emergency",
      why: "Bleeding with a possible pregnancy always needs immediate obstetric assessment.",
      action: `Contact an obstetrician or call ${EMERGENCY_LINE} immediately.`,
      source: "symptom",
    });
  }
  if (abdominal?.severity && abdominal.severity >= 6) {
    hits.push({
      id: "rf.preg.abdominal",
      level: "SAME_DAY",
      title: "Abdominal pain with possible pregnancy needs same-day review",
      why: "Abdominal pain in a possible pregnancy should be examined on the same day.",
      action: "See an obstetrician today.",
      source: "symptom",
    });
  }
  if (swelling) {
    hits.push({
      id: "rf.preg.swelling",
      level: "SAME_DAY",
      title: "Swelling in pregnancy should be checked today",
      why: "New swelling in a possible pregnancy can relate to blood pressure changes that need a quick check.",
      action: "Mention this to your doctor today.",
      source: "text",
    });
  }
  return hits;
}

/* ------------------ Orchestration ------------------ */

function hitFromRule(rule: SymptomRule, s: SymptomEntry, level: "EMERGENCY" | "SAME_DAY"): RedFlagHit {
  return {
    id: rule.id,
    level,
    title: rule.title,
    why: rule.why(s),
    action: rule.action,
    source: "symptom",
  };
}

export function runTriage(input: ForesightInput): TriageResult {
  const raw: RedFlagHit[] = [];

  for (const rule of EMERGENCY_SYMPTOM_RULES) {
    for (const s of input.symptoms) {
      if (rule.match(s, input)) {
        raw.push(hitFromRule(rule, s, "EMERGENCY"));
        break;
      }
    }
  }
  raw.push(...vitalsRules(input));
  raw.push(...mentalHealthHits(input));
  raw.push(...pregnancyHits(input));

  const sameDayRules = SAME_DAY_SYMPTOM_RULES.filter((r) =>
    input.symptoms.some((s) => r.match(s, input))
  ).map((r) => {
    const s = input.symptoms.find((x) => r.match(x, input))!;
    return hitFromRule(r, s, "SAME_DAY");
  });

  /* Partition STRICTLY by each hit's own level — a SAME_DAY
     mental-health or pregnancy flag must never be escalated to
     EMERGENCY by accident of array order. */
  const emergencies = raw.filter((h) => h.level === "EMERGENCY");
  const sameDay = [...raw.filter((h) => h.level === "SAME_DAY"), ...sameDayRules];

  if (emergencies.length > 0) {
    return {
      level: "EMERGENCY",
      hits: emergencies,
      headline: "Please take care of this first",
      body: "One or more answers need immediate attention, so we have paused all other analysis. Nothing else matters until this is safe.",
      analysisBlocked: true,
    };
  }

  if (sameDay.length > 0) {
    return {
      level: "SAME_DAY",
      hits: sameDay,
      headline: "Book a doctor visit for today",
      body: "What you shared should be looked at by a doctor today. Your full foresight map is still available below, but this comes first.",
      analysisBlocked: false,
    };
  }

  return {
    level: "STANDARD",
    hits: [],
    headline: "",
    body: "",
    analysisBlocked: false,
  };
}
