/* ============================================================
 * NEXURA PREDICTIVE — DOMAIN SCORERS v2.0
 *
 * Twelve condition-domain risk-pattern scorers. Each returns a
 * burden (0-100 ordinal, NOT a probability), a signal level,
 * every contributing factor with its weight, screening items
 * grounded in Indian practice (ICMR/IDF/NIN-aligned), lifestyle
 * actions and clinician questions.
 *
 * Rules every scorer obeys:
 *  - Missing inputs degrade confidence; they never count as
 *    "normal".
 *  - Lab values within the engine's bands act as anchors and
 *    cap/raise levels explicitly.
 *  - Protective factors appear with positive direction and
 *    genuinely subtract from burden.
 *  - No output ever states or implies a diagnosis.
 * ============================================================ */

import {
  AQI_POINTS,
  BAND_POINTS,
  BP_BANDS,
  CONFIDENCE,
  LAB_BANDS,
  bmiBand,
  computeBmi,
  levelFor,
  waistRisk,
} from "./calibration";
import { SYMPTOM_IDS } from "./redflags";
import {
  ALL_DOMAIN_IDS,
  type Confidence,
  type DomainId,
  type DomainResult,
  type ForesightInput,
  type FactorHit,
} from "./types";

/* ---------------- helpers ---------------- */

const sym = (input: ForesightInput, id: string) => input.symptoms.find((s) => s.id === id);

const hasCond = (input: ForesightInput, re: RegExp) =>
  input.history.conditions.some((c) => re.test(c));

const f = (
  id: string,
  label: string,
  weight: number,
  direction: "risk" | "protective" = "risk",
  detail?: string,
): FactorHit => ({ id, label, weight, direction, detail });

function base(id: DomainId): DomainResult {
  return {
    id,
    level: "LOW",
    burden: 0,
    confidence: CONFIDENCE.MODERATE,
    headline: "",
    factors: [],
    screening: [],
    actions: [],
    clinicianQuestions: [],
  };
}

function finish(d: DomainResult): DomainResult {
  const risk = d.factors.filter((x) => x.direction === "risk").reduce((a, b) => a + b.weight, 0);
  const prot = d.factors
    .filter((x) => x.direction === "protective")
    .reduce((a, b) => a + b.weight, 0);
  const riskCount = d.factors.filter((x) => x.direction === "risk" && x.weight >= 2.5).length;
  let burden = Math.max(0, risk - prot);
  /* Risk compounds: 5+ simultaneous risk factors genuinely multiply
     each other (metabolic-syndrome logic), 3+ mildly so. */
  if (riskCount >= 5) burden *= 1.3;
  else if (riskCount >= 3) burden *= 1.15;
  /* Lab/cluster anchors set a floor — an out-of-range HbA1c IS the
     elevated signal regardless of how quiet the rest of the profile is. */
  burden = Math.max(burden, d.burden);
  d.burden = Math.min(100, Math.round(burden));
  d.level = levelFor(d.burden);
  if (d.factors.length === 0 && d.confidence !== CONFIDENCE.HIGHER) {
    d.confidence = CONFIDENCE.INSUFFICIENT;
  }
  d.factors.sort((a, b) => b.weight - a.weight);
  return d;
}

/* ================= 1 · METABOLIC / T2D ================= */

function metabolic(input: ForesightInput): DomainResult {
  const d = base("metabolic");
  const bmi = computeBmi(input.profile.heightCm, input.profile.weightKg);
  const band = bmiBand(bmi);
  const waist = waistRisk(input.profile.waistCm, input.profile.sexAtBirth);
  const fam = input.history.familyHistory.includes("diabetes");
  let confidence: Confidence = CONFIDENCE.LOW;

  if (band === "obese")
    d.factors.push(f("m.bmi", `BMI ${bmi} — in the obese band for South Asians`, 7));
  else if (band === "risk")
    d.factors.push(
      f(
        "m.bmi",
        `BMI ${bmi} — high-risk band for South Asians (23+ is the threshold here, not 25)`,
        5.5,
      ),
    );
  else if (band === "overweight")
    d.factors.push(f("m.bmi", `BMI ${bmi} — overweight by South-Asian cutoffs (23+)`, 4));
  else if (band === "healthy")
    d.factors.push(f("m.bmi", `BMI ${bmi} — healthy for South-Asian bands`, 2.5, "protective"));
  if (band !== "unknown") confidence = CONFIDENCE.MODERATE;

  if (waist === "high")
    d.factors.push(
      f(
        "m.waist",
        `Waist ${input.profile.waistCm} cm — above the IDF cutoff for South Asians`,
        5.5,
      ),
    );
  else if (waist === "elevated")
    d.factors.push(
      f("m.waist", `Waist ${input.profile.waistCm} cm — at the IDF South-Asian cutoff`, 3.5),
    );

  if (fam) d.factors.push(f("m.family", "Family history of diabetes (parents/siblings)", 4.5));

  if (sym(input, SYMPTOM_IDS.thirstExcess))
    d.factors.push(f("m.thirst", "Unusual thirst recently", 3));
  if (sym(input, SYMPTOM_IDS.urinationFrequent))
    d.factors.push(f("m.urine", "Passing urine more often than usual", 3));
  if (sym(input, SYMPTOM_IDS.woundsSlowHeal))
    d.factors.push(f("m.wounds", "Cuts or wounds healing slowly", 3.5));
  if (sym(input, SYMPTOM_IDS.tinglingFeet))
    d.factors.push(f("m.tingle", "Tingling or pins-and-needles in feet", 3));
  if (sym(input, SYMPTOM_IDS.weightLossUnexplained))
    d.factors.push(f("m.wl", "Weight loss without trying", 3));

  // Diet-driven load
  const sweets = BAND_POINTS[input.diet.sweetsPerWeek];
  const fried = BAND_POINTS[input.diet.friedPerWeek];
  const drinks = BAND_POINTS[input.diet.sugaryDrinksPerWeek];
  if (sweets >= 2.5) d.factors.push(f("m.sweets", "Regular mithai/desserts", sweets));
  if (fried >= 2.5) d.factors.push(f("m.fried", "Frequent deep-fried food", fried));
  if (drinks >= 2.5) d.factors.push(f("m.drinks", "Regular sugary drinks", drinks));
  if (input.diet.riceRotiBalance === "rice_heavy")
    d.factors.push(f("m.rice", "Mostly white-rice-dominant meals (high glycaemic load)", 2.5));
  if (input.diet.breakfastSkipped) d.factors.push(f("m.breakfast", "Breakfast often skipped", 1));

  // Activity
  if (input.activity.minutesPerWeek < 60)
    d.factors.push(f("m.sedentary", "Very little brisk activity", 3.5));
  else if (input.activity.minutesPerWeek >= 150)
    d.factors.push(
      f(
        "m.active",
        `${input.activity.minutesPerWeek} min/week of movement — WHO-level protective`,
        3,
        "protective",
      ),
    );

  // Anchors: labs/vitals
  if (input.labs.hba1cPct != null) {
    const a = input.labs.hba1cPct;
    confidence = CONFIDENCE.HIGHER;
    if (a >= LAB_BANDS.hba1c.diabetesRange) {
      d.factors.push(
        f(
          "m.hba1c",
          `HbA1c ${a}% — in the diabetes range (6.5%+); this needs a doctor, not an app`,
          9,
        ),
      );
      d.burden = Math.max(d.burden, 68); // anchor floor: HIGH
      d.actions.unshift({
        title: "See a doctor with this report",
        detail: `An HbA1c of ${a}% is in the diabetes range. Take a printout of this summary — a doctor should confirm and guide treatment.`,
        effort: "with-doctor",
      });
    } else if (a >= LAB_BANDS.hba1c.prediabetes) {
      d.factors.push(f("m.hba1c", `HbA1c ${a}% — in the prediabetes band (5.7-6.4%)`, 6));
      d.burden = Math.max(d.burden, 42); // anchor floor: ELEVATED
      d.screening.unshift({
        test: "Repeat HbA1c",
        why: "Confirm the prediabetes-band reading after 3 months of changes",
        cadence: "every 3-6 months",
      });
    } else {
      d.factors.push(f("m.hba1c", `HbA1c ${a}% — within normal band`, 2, "protective"));
    }
  }
  if (input.vitals.glucoseMgDl != null && input.vitals.glucoseContext === "fasting") {
    const g = input.vitals.glucoseMgDl;
    confidence = CONFIDENCE.HIGHER;
    if (g >= LAB_BANDS.fastingGlucose.diabetesRange) {
      d.factors.push(
        f(
          "m.fbs",
          `Fasting glucose ${g} mg/dL — in the diabetes range; confirm with a doctor`,
          8.5,
        ),
      );
      d.burden = Math.max(d.burden, 64);
    } else if (g >= LAB_BANDS.fastingGlucose.prediabetes) {
      d.factors.push(
        f("m.fbs", `Fasting glucose ${g} mg/dL — in the prediabetes band (100-125)`, 5),
      );
      d.burden = Math.max(d.burden, 42);
    } else if (g <= LAB_BANDS.fastingGlucose.normal)
      d.factors.push(f("m.fbs", `Fasting glucose ${g} mg/dL — normal`, 1.5, "protective"));
  } else if (input.vitals.glucoseMgDl != null && input.vitals.glucoseContext === "random") {
    const g = input.vitals.glucoseMgDl;
    if (g >= LAB_BANDS.randomGlucoseHigh) {
      d.factors.push(
        f("m.rbs", `Random glucose ${g} mg/dL — high enough that a doctor should see this`, 7),
      );
      d.burden = Math.max(d.burden, 46);
      confidence = CONFIDENCE.HIGHER;
    }
  }

  if (hasCond(input, /diabet|sugar|madhumeh/i)) {
    d.factors.push(
      f(
        "m.known",
        "You told us diabetes is already diagnosed — we keep this domain in view for control, not detection",
        4,
      ),
    );
    confidence = CONFIDENCE.HIGHER;
  }

  const age = input.profile.ageYears;
  if (age >= 35)
    d.factors.push(
      f(
        "m.age",
        `Age ${age} — Indian screening guidance suggests an annual sugar check from 35`,
        2,
      ),
    );
  if (fam && age >= 25)
    d.factors.push(
      f("m.agefam", "With family history, earlier screening (from 25) is advised in India", 1.5),
    );

  d.headline = d.factors.some((x) => x.direction === "risk" && x.weight >= 4)
    ? "Several classic metabolic signals are stacking up"
    : "Metabolic pattern looks steady";

  d.screening.push(
    {
      test: "HbA1c",
      why: "3-month average sugar — the single most useful first test",
      cadence: "once now if never done; yearly if 35+ or family history",
    },
    {
      test: "Fasting glucose + lipid profile",
      why: "Often ordered together; fasting sugar above 100 mg/dL is the Indian prediabetes band",
      cadence: "with annual check-up",
    },
  );
  d.actions.push(
    {
      title: "Cut liquid sugar first",
      detail:
        "Sweet chai count, cold drinks and packaged juices are the fastest lever — even switching 2 sweet chais a day to unsweetened moves the needle in weeks.",
      effort: "easy",
    },
    {
      title: "Add a 10-minute walk after the biggest meal",
      detail:
        "Post-meal walking blunts glucose spikes — practical with Indian lunch/dinner patterns.",
      effort: "easy",
    },
    {
      title: "Re-plate your thali",
      detail:
        "Half vegetables, one quarter dal/curd/paneer, one quarter roti-rice. Same food, better order and proportion.",
      effort: "moderate",
    },
  );
  d.clinicianQuestions.push(
    "Is my HbA1c/fasting sugar in the range where I should start medication, or can lifestyle changes carry it for now?",
    "How often should I repeat the sugar test given my family history?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ================= 2 · BLOOD PRESSURE ================= */

function bp(input: ForesightInput): DomainResult {
  const d = base("bp");
  let confidence: Confidence = CONFIDENCE.LOW;
  const { systolic: sys, diastolic: dia } = input.vitals;

  if (sys && dia) {
    confidence = CONFIDENCE.HIGHER;
    if (sys >= BP_BANDS.high.sys || dia >= BP_BANDS.high.dia) {
      d.factors.push(
        f("bp.value", `Reading ${sys}/${dia} mmHg — in the hypertension range (140/90+)`, 8),
      );
      d.burden = Math.max(d.burden, 46); // anchor floor: this reading IS the elevated signal
      d.actions.unshift({
        title: "Confirm with a 3-day log",
        detail: `Measure morning and evening for 3 days, seated and rested. If the average stays ≥140/90, take the log to a doctor.`,
        effort: "easy",
      });
    } else if (sys >= BP_BANDS.elevated.sys || dia >= BP_BANDS.elevated.dia) {
      d.factors.push(f("bp.value", `Reading ${sys}/${dia} mmHg — in the watch zone (130/85+)`, 5));
      d.burden = Math.max(d.burden, 24);
    } else {
      d.factors.push(
        f("bp.value", `Reading ${sys}/${dia} mmHg — in the normal band`, 2, "protective"),
      );
    }
  }

  if (input.diet.salt === "high")
    d.factors.push(
      f("bp.salt", "High salt intake (pickles, papad, namkeen, restaurant food add up fast)", 4),
    );
  if (input.history.familyHistory.includes("hypertension"))
    d.factors.push(f("bp.family", "Family history of high blood pressure", 3.5));
  if (input.history.alcohol === "daily") d.factors.push(f("bp.alcohol", "Daily alcohol", 2.5));
  if (input.history.tobacco === "current_smoke")
    d.factors.push(f("bp.tobacco", "Current smoking", 3));
  if (input.activity.shiftWork)
    d.factors.push(f("bp.shift", "Night/rotating shifts — a known BP stressor", 1.5));
  if (input.history.stress === "high")
    d.factors.push(f("bp.stress", "Self-reported high stress", 1.5));

  const bmi = computeBmi(input.profile.heightCm, input.profile.weightKg);
  const band = bmiBand(bmi);
  if (band === "risk" || band === "obese")
    d.factors.push(f("bp.bmi", `BMI ${bmi} — above the South-Asian healthy band`, 2.5));

  if (hasCond(input, /hypertension|bp|blood pressure/i)) {
    d.factors.push(f("bp.known", "Hypertension already diagnosed — focus is on control", 3.5));
    d.clinicianQuestions.push(
      "Is my current BP control on target, and how often should I log at home?",
    );
  }

  d.headline =
    sys && (sys >= BP_BANDS.high.sys || sys >= BP_BANDS.elevated.sys)
      ? "Your blood pressure reading deserves attention"
      : "Blood pressure pattern looks manageable";

  d.screening.push({
    test: "3-day home BP log",
    why: "Two readings a day, seated and rested — beats a single clinic reading",
    cadence: "now, if readings ≥130/85",
  });
  d.actions.push(
    {
      title: "Target the hidden salt",
      detail:
        "Pickles, papad, namkeen and restaurant gravies carry most Indian salt load. Aim under 1 teaspoon (5 g) a day total.",
      effort: "moderate",
    },
    {
      title: "5 minutes of slow breathing daily",
      detail:
        "Slow exhale-longer-than-inhale breathing for 5 minutes has measurable BP benefit and costs nothing.",
      effort: "easy",
    },
  );
  d.clinicianQuestions.push(
    "Should I be on medication at my current readings, or is a lifestyle window reasonable first?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ================= 3 · HEART / CARDIOVASCULAR ================= */

function heart(input: ForesightInput): DomainResult {
  const d = base("heart");
  let confidence: Confidence = CONFIDENCE.MODERATE;

  const fam = input.history.familyHistory.includes("heart_disease");
  if (fam) d.factors.push(f("h.family", "Family history of heart disease", 4.5));

  const t = input.history.tobacco;
  if (t === "current_smoke")
    d.factors.push(f("h.smoke", "Current smoking — the single biggest modifiable heart risk", 6.5));
  else if (t === "smokeless")
    d.factors.push(
      f("h.smokeless", "Smokeless tobacco (gutkha/paan) — raises heart and BP risk", 4.5),
    );
  else if (t === "former")
    d.factors.push(f("h.former", "Former smoker — risk falls substantially after quitting", 1.5));
  else d.factors.push(f("h.nosmoke", "No tobacco use", 2, "protective"));

  if (input.labs.ldlMgDl != null) {
    const l = input.labs.ldlMgDl;
    confidence = CONFIDENCE.HIGHER;
    if (l >= LAB_BANDS.ldl.veryHigh)
      d.factors.push(
        f("h.ldl", `LDL ${l} mg/dL — very high; South-Asian targets are often stricter`, 6.5),
      );
    else if (l >= LAB_BANDS.ldl.high)
      d.factors.push(f("h.ldl", `LDL ${l} mg/dL — above common targets`, 4.5));
    else if (l <= LAB_BANDS.ldl.optimal)
      d.factors.push(f("h.ldl", `LDL ${l} mg/dL — within a good band`, 2, "protective"));
  }
  if (input.labs.triglyceridesMgDl != null) {
    const tg = input.labs.triglyceridesMgDl;
    if (tg >= LAB_BANDS.triglycerides.veryHigh)
      d.factors.push(f("h.tg", `Triglycerides ${tg} mg/dL — very high`, 5));
    else if (tg >= LAB_BANDS.triglycerides.high)
      d.factors.push(
        f("h.tg", `Triglycerides ${tg} mg/dL — high (common with sweet/rice-heavy patterns)`, 3.5),
      );
  }
  if (input.labs.hdlMgDl != null) {
    const lowHdl =
      input.profile.sexAtBirth === "female" ? LAB_BANDS.hdl.femaleLow : LAB_BANDS.hdl.maleLow;
    if (input.labs.hdlMgDl < lowHdl)
      d.factors.push(
        f("h.hdl", `HDL ${input.labs.hdlMgDl} mg/dL — below the protective band`, 2.5),
      );
    else
      d.factors.push(f("h.hdl", `HDL ${input.labs.hdlMgDl} mg/dL — protective`, 1.5, "protective"));
  }

  const sys = input.vitals.systolic ?? 0;
  if (sys >= BP_BANDS.elevated.sys)
    d.factors.push(f("h.bp", "Blood pressure running above normal", 3));
  if (input.activity.minutesPerWeek < 60)
    d.factors.push(f("h.sedentary", "Very little regular movement", 3));
  else if (input.activity.minutesPerWeek >= 150)
    d.factors.push(f("h.active", "WHO-level weekly activity", 2.5, "protective"));

  const bmi = computeBmi(input.profile.heightCm, input.profile.weightKg);
  if (band2(bmi) === true)
    d.factors.push(f("h.bmi", `BMI ${bmi} — above South-Asian healthy band`, 2));
  if (input.history.conditions.some((c) => /diabet|sugar/i.test(c)))
    d.factors.push(f("h.dm", "Diabetes already diagnosed — heart protection matters doubly", 3.5));
  if (sym(input, SYMPTOM_IDS.palpitations))
    d.factors.push(f("h.palp", "Awareness of heartbeat/palpitations", 2));
  if (
    sym(input, SYMPTOM_IDS.breathlessExertion) &&
    (sym(input, SYMPTOM_IDS.breathlessExertion)?.severity ?? 0) >= 6
  ) {
    d.factors.push(f("h.exertion", "Breathlessness on mild exertion", 3));
    d.screening.unshift({
      test: "Doctor-ordered ECG / TMT as advised",
      why: "Exertional breathlessness deserves a clinical look before we attribute it to fitness",
      cadence: "with a doctor",
    });
  }

  const age = input.profile.ageYears;
  const male = input.profile.sexAtBirth === "male";
  if ((male && age >= 45) || (!male && age >= 50))
    d.factors.push(f("h.age", `Age ${age} — routine heart screening age band`, 2.5));

  d.headline =
    d.factors.filter((x) => x.direction === "risk" && x.weight >= 4).length >= 2
      ? "Multiple heart-risk factors are stacking — this is fixable territory"
      : "Heart profile looks broadly steady";

  d.screening.push(
    {
      test: "Lipid profile",
      why: "LDL, HDL, triglycerides — Indians often show high TG even at normal weight",
      cadence: "yearly after 30 (earlier with family history)",
    },
    {
      test: "BP + fasting sugar",
      why: "The trio (lipids, BP, sugar) covers the metabolic heart-risk cluster",
      cadence: "yearly",
    },
  );
  d.actions.push(
    {
      title: "If you use tobacco, quitting is the whole ballgame",
      detail:
        "Quitting tobacco (including gutkha/paan) cuts heart risk faster than any other single change. Quitline 1800-11-2356 offers free support.",
      effort: "moderate",
    },
    {
      title: "Two 15-minute brisk walks daily",
      detail:
        "Split walks count fully toward the 150 weekly minutes — easier around work and heat.",
      effort: "easy",
    },
  );
  d.clinicianQuestions.push(
    "Given my family history, should my LDL target be stricter than the standard cutoff?",
    "Do I need an ECG or stress test at my age and risk level?",
  );
  d.confidence = confidence;
  return finish(d);
}

function band2(bmi: number | null): boolean {
  if (bmi == null) return false;
  return bmi >= 23;
}

/* ================= 4 · HEMOGLOBIN / ANEMIA ================= */

function hemoglobin(input: ForesightInput): DomainResult {
  const d = base("hemoglobin");
  let confidence: Confidence = CONFIDENCE.LOW;
  const female = input.profile.sexAtBirth === "female";

  if (input.labs.hemoglobinGdl != null) {
    const h = input.labs.hemoglobinGdl;
    confidence = CONFIDENCE.HIGHER;
    const lowCut = female ? LAB_BANDS.hemoglobin.female.low : LAB_BANDS.hemoglobin.male.low;
    if (h < lowCut - 2) {
      d.factors.push(f("an.hb", `Haemoglobin ${h} g/dL — well below the ${lowCut} cutoff`, 7.5));
      d.burden = Math.max(d.burden, 58); // anchor floor: clinically significant anemia pattern
    } else if (h < lowCut) {
      d.factors.push(
        f(
          "an.hb",
          `Haemoglobin ${h} g/dL — below the ${lowCut} g/dL band for ${female ? "women" : "men"}`,
          5.5,
        ),
      );
      d.burden = Math.max(d.burden, 42);
    } else {
      d.factors.push(f("an.hb", `Haemoglobin ${h} g/dL — healthy band`, 2, "protective"));
    }
  }

  const veg =
    input.diet.type === "vegetarian" || input.diet.type === "vegan" || input.diet.type === "jain";
  if (veg && female)
    d.factors.push(
      f(
        "an.veg_f",
        "Vegetarian diet + menstrual losses — the most common Indian anemia setup",
        3.5,
      ),
    );
  else if (veg)
    d.factors.push(f("an.veg", "Vegetarian diet — non-haem iron absorbs less efficiently", 2));
  if (sym(input, SYMPTOM_IDS.fatiguePersistent))
    d.factors.push(f("an.fatigue", "Persistent tiredness", 2.5));
  if (sym(input, SYMPTOM_IDS.breathlessExertion))
    d.factors.push(f("an.exertion", "Breathlessness on mild exertion", 2.5));
  if (sym(input, SYMPTOM_IDS.dizziness)) d.factors.push(f("an.dizzy", "Dizziness episodes", 2));
  if (sym(input, SYMPTOM_IDS.pallor))
    d.factors.push(f("an.pallor", "Looking pale (eyelids/nails)", 3));
  if (input.profile.pregnancyPossibility) {
    d.factors.push(
      f(
        "an.preg",
        "Possible pregnancy — iron needs rise sharply (ICMR advises routine screening)",
        4,
      ),
    );
    d.screening.unshift({
      test: "CBC (haemoglobin)",
      why: "Standard antenatal screening in India",
      cadence: "as part of antenatal visits",
    });
  }
  if (input.history.menstruationRegular === false)
    d.factors.push(f("an.cycles", "Irregular or heavy cycles reported — increases iron loss", 2));
  if (input.diet.type === "non_veg" || input.diet.type === "eggetarian")
    d.factors.push(f("an.heme", "Includes eggs/meat — haem-iron source", 1.5, "protective"));

  d.headline =
    d.burden >= 40
      ? "Several anemia-pattern signals — very common in India and very fixable"
      : "Blood/oxygen-carrying pattern looks steady";

  d.screening.push({
    test: "CBC with haemoglobin",
    why: "First-line test; Indian guidance also suggests ferritin to separate iron deficiency from thalassemia trait",
    cadence: "once now if symptoms present",
  });
  d.actions.push(
    {
      title: "Iron + vitamin C pairing",
      detail:
        "Have iron sources (palak, chana, rajma, jaggery) with lemon/amla/orange — vitamin C multiplies absorption. Keep chai/coffee 1 hour away from meals (tannins block iron).",
      effort: "easy",
    },
    {
      title: "Cook in a cast-iron kadhai",
      detail: "A small, genuinely measurable iron addition to daily food.",
      effort: "easy",
    },
  );
  d.clinicianQuestions.push(
    "Should I be checked for ferritin and thalassemia trait, not just haemoglobin?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ================= 5 · VITAMIN D ================= */

function vitaminD(input: ForesightInput): DomainResult {
  const d = base("vitamin_d");
  let confidence: Confidence = CONFIDENCE.LOW;

  if (input.labs.vitaminDNgMl != null) {
    const v = input.labs.vitaminDNgMl;
    confidence = CONFIDENCE.HIGHER;
    if (v < LAB_BANDS.vitaminD.deficient) {
      d.factors.push(f("vd.level", `Vitamin D ${v} ng/mL — deficient band (<12)`, 6.5));
      d.burden = Math.max(d.burden, 46);
    } else if (v < LAB_BANDS.vitaminD.insufficient) {
      d.factors.push(f("vd.level", `Vitamin D ${v} ng/mL — insufficient band (12-20)`, 4.5));
      d.burden = Math.max(d.burden, 40);
    } else if (v >= LAB_BANDS.vitaminD.sufficient)
      d.factors.push(f("vd.level", `Vitamin D ${v} ng/mL — sufficient`, 2, "protective"));
    else d.factors.push(f("vd.level", `Vitamin D ${v} ng/mL — borderline (20-30)`, 2.5));
  }

  const sun = input.environment.sunlightMinutesPerDay ?? 0;
  if (sun > 0 && sun < 15)
    d.factors.push(
      f("vd.sun", `Only ${sun} min of daily sun — most Indians need 20-30 min on arms/face`, 3),
    );
  else if (sun >= 20)
    d.factors.push(f("vd.sun", `${sun} min of daily sunlight`, 1.5, "protective"));
  if (input.activity.occupation === "desk")
    d.factors.push(f("vd.desk", "Desk-bound daytime routine — limited sun exposure", 1.5));
  if (sym(input, SYMPTOM_IDS.boneAche)) d.factors.push(f("vd.bone", "Body/bone aches", 2.5));
  if (sym(input, SYMPTOM_IDS.muscleWeakness))
    d.factors.push(f("vd.muscle", "Muscle weakness or frequent cramps", 2));
  if (sym(input, SYMPTOM_IDS.fatiguePersistent))
    d.factors.push(f("vd.fatigue", "Persistent tiredness (also a Vit-D pattern)", 1.5));
  if (AQI_POINTS[input.environment.aqiBand] >= 2)
    d.factors.push(
      f(
        "vd.aqi",
        "Poor air quality keeps people indoors — a hidden Vit-D factor in Indian metros",
        1,
      ),
    );

  d.headline =
    d.burden >= 40
      ? "Classic urban-India vitamin D pattern (very common, easily corrected)"
      : "Vitamin-D-related signals look low";

  d.screening.push({
    test: "Serum 25-OH Vitamin D",
    why: "The correct test name — many labs package it with B12 at a discount",
    cadence: "once now if aches/fatigue persist",
  });
  d.actions.push(
    {
      title: "20-30 minutes of morning sun, arms exposed",
      detail:
        "Before 10 AM or after 4 PM in Indian summers. Glass blocks UVB — balcony glass does not count.",
      effort: "easy",
    },
    {
      title: "Ask your doctor about a weekly 60,000 IU course",
      detail:
        "The standard Indian repletion course is weekly (not daily) for 8 weeks, then monthly maintenance — but only after a test.",
      effort: "with-doctor",
    },
  );
  d.clinicianQuestions.push(
    "My Vitamin D was low — should I retest after the repletion course to confirm?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ================= 6 · B12 / NERVE ================= */

function b12(input: ForesightInput): DomainResult {
  const d = base("b12");
  let confidence: Confidence = CONFIDENCE.LOW;

  if (input.labs.b12PgMl != null) {
    const b = input.labs.b12PgMl;
    confidence = CONFIDENCE.HIGHER;
    if (b < LAB_BANDS.b12.veryLow) {
      d.factors.push(f("b12.level", `B12 ${b} pg/mL — clearly low (<150)`, 6.5));
      d.burden = Math.max(d.burden, 46);
    } else if (b < LAB_BANDS.b12.low) {
      d.factors.push(f("b12.level", `B12 ${b} pg/mL — borderline-low (150-200)`, 4.5));
      d.burden = Math.max(d.burden, 38);
    } else d.factors.push(f("b12.level", `B12 ${b} pg/mL — adequate band`, 2, "protective"));
  }

  const veg =
    input.diet.type === "vegetarian" || input.diet.type === "vegan" || input.diet.type === "jain";
  if (veg)
    d.factors.push(
      f(
        "b12.veg",
        veg
          ? "Purely plant diet — B12 comes almost only from fortified food or supplements"
          : "Vegetarian diet — B12 is scarce in plant foods",
        4.5,
      ),
    );
  else
    d.factors.push(
      f("b12.nonveg", "Includes animal foods — natural B12 source", 1.5, "protective"),
    );

  const tingle = sym(input, SYMPTOM_IDS.tinglingFeet);
  if (tingle)
    d.factors.push(f("b12.tingle", "Tingling in feet/hands (a classic B12 pattern)", 5.5));
  if (veg && tingle) {
    d.factors.push(
      f(
        "b12.combo",
        "Vegetarian diet + nerve tingling — the classic Indian B12-deficiency setup",
        6,
      ),
    );
    d.burden = Math.max(d.burden, 24); // at least WATCH
  }
  if (sym(input, SYMPTOM_IDS.numbnessHands)) d.factors.push(f("b12.numb", "Numbness in hands", 3));
  if (sym(input, SYMPTOM_IDS.memoryFog))
    d.factors.push(f("b12.fog", "Brain fog / forgetfulness", 2.5));
  if (sym(input, SYMPTOM_IDS.fatiguePersistent))
    d.factors.push(f("b12.fatigue", "Persistent tiredness", 1.5));
  if (input.profile.ageYears >= 60)
    d.factors.push(f("b12.age", "Age 60+ — absorption of B12 from food falls with age", 2));
  if (hasCond(input, /gastr|acidity|gerd|ulcer/i))
    d.factors.push(
      f(
        "b12.gastric",
        "Acidity/gastric issues or acid-suppressing medicines reduce B12 absorption",
        2,
      ),
    );
  if (hasCond(input, /metformin|diabet/i))
    d.factors.push(
      f("b12.metformin", "Long-term metformin use is a known B12 depleter — worth testing", 2.5),
    );

  d.headline =
    d.burden >= 40
      ? "Nerve-and-energy pattern consistent with low B12 (extremely common in vegetarian India)"
      : "B12-related signals look low";

  d.screening.push({
    test: "Serum Vitamin B12",
    why: "Often bundled with Vitamin D at labs",
    cadence: "once now if tingling/fog present",
  });
  d.actions.push(
    {
      title: "Add fortified foods or dairy daily",
      detail:
        "Milk/curd/paneer if lacto-veg; fortified oats/nutritional yeast for vegans. Absorption from tablets is actually excellent.",
      effort: "easy",
    },
    {
      title: "Ask about methylcobalamin courses",
      detail:
        "If levels are low, doctors typically use a short high-dose course — test first, then treat.",
      effort: "with-doctor",
    },
  );
  d.clinicianQuestions.push(
    "Should I test B12 before starting supplements, and retest after the course?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ================= 7 · THYROID ================= */

function thyroid(input: ForesightInput): DomainResult {
  const d = base("thyroid");
  let confidence: Confidence = CONFIDENCE.LOW;

  if (input.labs.tshMiuL != null) {
    const t = input.labs.tshMiuL;
    confidence = CONFIDENCE.HIGHER;
    if (t > LAB_BANDS.tsh.high) {
      d.factors.push(f("th.tsh", `TSH ${t} mIU/L — above the screening band (0.4-5.5)`, 6));
      d.burden = Math.max(d.burden, 46);
    } else if (t < LAB_BANDS.tsh.low) {
      d.factors.push(f("th.tsh", `TSH ${t} mIU/L — below the screening band`, 5));
      d.burden = Math.max(d.burden, 42);
    } else d.factors.push(f("th.tsh", `TSH ${t} mIU/L — within band`, 2, "protective"));
  }

  const weightUnexpl = sym(input, SYMPTOM_IDS.weightGainUnexplained);
  if (weightUnexpl)
    d.factors.push(f("th.wgain", "Weight gain without a change in eating/activity", 3));
  if (sym(input, SYMPTOM_IDS.coldIntolerance))
    d.factors.push(f("th.cold", "Feeling unusually cold", 2.5));
  if (sym(input, SYMPTOM_IDS.hairFall)) d.factors.push(f("th.hair", "Noticeable hair fall", 2));
  if (sym(input, SYMPTOM_IDS.constipation))
    d.factors.push(f("th.const", "New or worsening constipation", 1.5));
  if (sym(input, SYMPTOM_IDS.fatiguePersistent))
    d.factors.push(f("th.fatigue", "Persistent tiredness", 2));
  if (input.profile.sexAtBirth === "female") {
    d.factors.push(f("th.female", "Thyroid disorders are 5-8× more common in women", 1.5));
    if (input.history.menstruationRegular === false)
      d.factors.push(f("th.cycles", "Irregular cycles (thyroid is one common driver)", 2.5));
  }
  if (input.history.familyHistory.includes("thyroid"))
    d.factors.push(f("th.family", "Family history of thyroid problems", 3));
  if (input.profile.pregnancyPossibility)
    d.factors.push(
      f(
        "th.preg",
        "Possible pregnancy — thyroid function matters more and is routinely checked",
        2,
      ),
    );

  d.headline =
    d.burden >= 40
      ? "A thyroid-pattern cluster is showing — one blood test settles it"
      : "Thyroid-related signals look low";

  d.screening.push({
    test: "TSH",
    why: "The single first-line thyroid test; add T3/T4 only if TSH is off",
    cadence: "once now if symptoms cluster; then as advised",
  });
  d.actions.push({
    title: "Test in the morning, fasting if possible",
    detail: "TSH has a morning peak — consistent timing makes repeat results comparable.",
    effort: "easy",
  });
  d.clinicianQuestions.push(
    "If my TSH is borderline, should we retest in 6-8 weeks before deciding on treatment?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ================= 8 · PCOS / HORMONAL ================= */

function pcos(input: ForesightInput): DomainResult {
  const d = base("pcos");
  if (input.profile.sexAtBirth !== "female") {
    d.confidence = CONFIDENCE.INSUFFICIENT;
    d.headline = "Not applicable for this profile";
    d.burden = 0;
    return finish(d);
  }
  let confidence: Confidence = CONFIDENCE.LOW;

  if (input.history.menstruationRegular === false) {
    d.factors.push(f("pc.cycles", "Irregular menstrual cycles (the lead PCOS-pattern signal)", 5));
    if (
      waistRisk(input.profile.waistCm, "female") !== "normal" ||
      input.history.familyHistory.includes("pcos")
    ) {
      d.burden = Math.max(d.burden, 42); // cycle + metabolic/family signal = warrants a gyn workup
    }
  } else if (input.history.menstruationRegular === true)
    d.factors.push(f("pc.cycles", "Regular cycles", 2, "protective"));
  if (sym(input, SYMPTOM_IDS.acneSevere))
    d.factors.push(f("pc.acne", "Persistent severe acne", 2.5));
  if (sym(input, SYMPTOM_IDS.hairFall)) d.factors.push(f("pc.hair", "Hair thinning/fall", 2));
  if (sym(input, SYMPTOM_IDS.weightGainUnexplained))
    d.factors.push(f("pc.weight", "Weight gain that resists effort", 2.5));

  const waist = waistRisk(input.profile.waistCm, "female");
  if (waist === "high" || waist === "elevated")
    d.factors.push(
      f(
        "pc.waist",
        `Waist ${input.profile.waistCm} cm — central weight gain is tightly linked to PCOS patterns`,
        3,
      ),
    );
  if (input.activity.minutesPerWeek < 60)
    d.factors.push(f("pc.sedentary", "Low activity worsens the hormonal pattern", 2));
  else if (input.activity.minutesPerWeek >= 150)
    d.factors.push(
      f(
        "pc.active",
        "Regular movement — the best-evidence lever for PCOS patterns",
        2.5,
        "protective",
      ),
    );
  if (input.history.familyHistory.includes("pcos"))
    d.factors.push(f("pc.family", "Family history of PCOS", 2.5));
  if (input.diet.sweetsPerWeek === "daily")
    d.factors.push(f("pc.sweets", "Daily sweets — insulin resistance feeds the PCOS loop", 2));

  if (hasCond(input, /pcos|pcod/i)) {
    d.factors.push(
      f("pc.known", "PCOS/PCOD already diagnosed — we focus on management signals", 4),
    );
    confidence = CONFIDENCE.HIGHER;
  }

  d.headline =
    d.burden >= 40
      ? "A PCOS-consistent pattern is showing — very manageable, and worth confirming with a doctor"
      : "Hormonal-cycle signals look steady";

  d.screening.push(
    {
      test: "Pelvic ultrasound + hormone panel",
      why: "Doctors typically combine cycle history, ultrasound and androgen/hormone labs for a PCOS assessment",
      cadence: "with a gynaecologist",
    },
    {
      test: "HbA1c / fasting insulin",
      why: "PCOS patterns travel with insulin resistance — checking sugar metabolism is standard",
      cadence: "once, then yearly",
    },
  );
  d.actions.push(
    {
      title: "Strength or resistance work 2×/week",
      detail:
        "Muscle is the best insulin-sensitiser — more effective than cardio alone for this pattern.",
      effort: "moderate",
    },
    {
      title: "Protein-first meals",
      detail:
        "Start lunch/dinner with dal/paneer/egg before rice — flattens the glucose swings that drive the cycle.",
      effort: "easy",
    },
  );
  d.clinicianQuestions.push(
    "Given my cycle pattern, do I meet the criteria for a PCOS workup?",
    "Should I test fasting insulin along with sugar?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ================= 9 · SLEEP / OSA ================= */

function sleep(input: ForesightInput): DomainResult {
  const d = base("sleep");
  let confidence: Confidence = CONFIDENCE.MODERATE;

  const h = input.sleep.hoursPerNight;
  if (h > 0 && h < 6) d.factors.push(f("sl.hours", `${h} hours a night — a heavy sleep debt`, 5));
  else if (h < 7)
    d.factors.push(f("sl.hours", `${h} hours a night — just under the 7-9 band`, 2.5));
  else if (h >= 7 && h <= 9)
    d.factors.push(f("sl.hours", `${h} hours — within the healthy band`, 2.5, "protective"));
  else if (h > 9)
    d.factors.push(
      f("sl.hours", `${h} hours — unusually long sleep (worth a mention to a doctor)`, 2),
    );

  if (input.sleep.quality === "poor")
    d.factors.push(f("sl.quality", "Self-rated poor sleep quality", 3));
  else if (input.sleep.quality === "good")
    d.factors.push(f("sl.quality", "Good sleep quality", 1.5, "protective"));

  // STOP-BANG-lite pattern
  const loud = input.sleep.snoring === "loud_regular";
  const gasp = !!sym(input, SYMPTOM_IDS.sleepApneaGasp);
  const seen = sym(input, SYMPTOM_IDS.snoringLoud);
  const obesitySign =
    waistRisk(input.profile.waistCm, input.profile.sexAtBirth) === "high" ||
    bmiBand(computeBmi(input.profile.heightCm, input.profile.weightKg)) === "obese";
  const sleepy = input.sleep.daytimeSleepiness === "severe";
  const bpHigh = (input.vitals.systolic ?? 0) >= BP_BANDS.elevated.sys;

  if (loud || seen || gasp)
    d.factors.push(
      f(
        "sl.snore",
        gasp ? "Snoring with choking/gasping at night" : "Regular loud snoring",
        gasp ? 5 : 3.5,
      ),
    );
  if (gasp) d.burden = Math.max(d.burden, 40); // witnessed apnoeas alone warrant a sleep study
  if (sleepy) d.factors.push(f("sl.daytime", "Severe daytime sleepiness", 4));
  else if (input.sleep.daytimeSleepiness === "mild")
    d.factors.push(f("sl.daytime", "Mild daytime sleepiness", 2));
  if (loud && sleepy) {
    d.confidence = CONFIDENCE.HIGHER;
    d.burden = Math.max(d.burden, 45); // the classic 2-question OSA screen is positive
  }
  if (loud && obesitySign)
    d.factors.push(
      f("sl.osa_cluster", "Snoring + higher body weight — the main sleep-apnoea pattern", 3),
    );
  if (bpHigh && (loud || sleepy))
    d.factors.push(
      f(
        "sl.bp_cluster",
        "Raised BP alongside snoring/sleepiness strengthens the case for a sleep check",
        2,
      ),
    );

  if (input.sleep.schedule === "irregular")
    d.factors.push(f("sl.schedule", "Irregular sleep-wake timing (social jetlag)", 2.5));
  if (input.activity.shiftWork)
    d.factors.push(f("sl.shift", "Night/rotating shifts disrupt circadian rhythm", 2.5));
  if (input.sleep.screensBeforeBed)
    d.factors.push(f("sl.screens", "Screens until bedtime delay deep sleep", 1.5));
  if (sym(input, SYMPTOM_IDS.headacheMorning))
    d.factors.push(f("sl.morning", "Morning headaches (can accompany overnight oxygen dips)", 2.5));

  d.headline =
    d.burden >= 40
      ? "Your sleep pattern is actively working against you — and it's fixable"
      : "Sleep pattern looks steady";

  d.screening.push(
    loud || sleepy
      ? {
          test: "Sleep study (polysomnography / home sleep test)",
          why: "Loud snoring + daytime sleepiness is exactly what sleep studies are for; many Indian metros now offer home kits",
          cadence: "ask a doctor",
        }
      : {
          test: "Two-week sleep diary",
          why: "Track bedtime, wake time and daytime energy before any tests",
          cadence: "self-monitoring",
        },
  );
  d.actions.push(
    {
      title: "Fix the wake time first",
      detail:
        "An anchored wake-up time (even weekends, ±30 min) rebuilds sleep pressure faster than chasing an early bedtime.",
      effort: "easy",
    },
    {
      title: "Sleep on your side if you snore",
      detail:
        "Side-sleeping measurably reduces snoring/apnea events; a pillow behind the back helps.",
      effort: "easy",
    },
    {
      title: "Last chai before 4 PM",
      detail:
        "Caffeine's half-life is ~5-6 hours — an evening cutting chai is still working at midnight.",
      effort: "easy",
    },
  );
  d.clinicianQuestions.push(
    "Do my snoring + sleepiness warrant a sleep apnoea test (home sleep study)?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ================= 10 · LUNGS / RESPIRATORY ================= */

function lungs(input: ForesightInput): DomainResult {
  const d = base("lungs");
  let confidence: Confidence = CONFIDENCE.MODERATE;

  const aqi = AQI_POINTS[input.environment.aqiBand];
  if (aqi >= 3.5)
    d.factors.push(
      f(
        "lu.aqi",
        `${input.environment.aqiBand.replace("_", "-").replace(/^\w/, (c) => c.toUpperCase())} air quality — sustained lung irritant in Indian cities`,
        aqi,
      ),
    );
  else if (aqi >= 2)
    d.factors.push(f("lu.aqi", "Poor air quality days — cumulative lung load", aqi));

  const t = input.history.tobacco;
  if (t === "current_smoke") d.factors.push(f("lu.smoke", "Current smoking", 5.5));
  else if (t === "smokeless")
    d.factors.push(f("lu.smokeless", "Smokeless tobacco — oral and airway irritant", 2.5));
  if (sym(input, SYMPTOM_IDS.coughPersistent)) {
    const c = sym(input, SYMPTOM_IDS.coughPersistent)!;
    d.factors.push(
      f("lu.cough", `Cough lasting ${c.onsetDays} days`, c.onsetDays >= 21 ? 4.5 : 2.5),
    );
    if (c.onsetDays >= 21) {
      d.screening.unshift({
        test: "Chest X-ray / doctor review",
        why: "Any cough beyond 3 weeks needs a clinical look (India's TB cough-rule)",
        cadence: "now",
      });
    }
  }
  if (sym(input, SYMPTOM_IDS.wheeze)) d.factors.push(f("lu.wheeze", "Wheezing episodes", 3.5));
  if (sym(input, SYMPTOM_IDS.breathlessExertion))
    d.factors.push(f("lu.exertion", "Breathlessness on exertion", 2.5));
  if (hasCond(input, /asthma|copd|bronch/i)) {
    d.factors.push(f("lu.known", "Existing respiratory condition — control focus", 3.5));
    confidence = CONFIDENCE.HIGHER;
  }
  if (input.activity.occupation === "field")
    d.factors.push(f("lu.dust", "Field/outdoor work — dust and pollution exposure", 1.5));
  if (hasCond(input, /acidity|reflux|gerd/i))
    d.factors.push(f("lu.reflux", "Acid reflux can drive chronic cough (often missed)", 1));

  d.headline =
    d.burden >= 40
      ? "Your lungs are carrying more load than they should"
      : "Respiratory pattern looks steady";

  d.screening.push(
    aqi >= 2 || sym(input, SYMPTOM_IDS.coughPersistent)
      ? {
          test: "Spirometry (lung function)",
          why: "Objective airflow reading; useful when cough/wheeze persists in high-AQI cities",
          cadence: "once now, then as advised",
        }
      : {
          test: "None needed now",
          why: "No persistent respiratory signals",
          cadence: "annual check-up covers it",
        },
  );
  d.actions.push(
    {
      title: "Check AQI before outdoor exercise",
      detail:
        "On 'poor'+ days move workouts indoors or to early morning; N95 on commute days in peak season genuinely helps.",
      effort: "easy",
    },
    {
      title: "Steam for symptom days",
      detail:
        "Warm steam eases airway irritation; it does not replace a doctor's assessment for a 3-week cough.",
      effort: "easy",
    },
  );
  d.clinicianQuestions.push(
    "With my city's air quality, should I get a baseline spirometry even without symptoms?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ================= 11 · LIVER / METABOLIC-FATTY ================= */

function liver(input: ForesightInput): DomainResult {
  const d = base("liver");
  let confidence: Confidence = CONFIDENCE.LOW;

  const waist = waistRisk(input.profile.waistCm, input.profile.sexAtBirth);
  if (waist === "high")
    d.factors.push(
      f(
        "li.waist",
        `Waist ${input.profile.waistCm} cm — central fat is the driver of fatty-liver patterns`,
        4.5,
      ),
    );
  else if (waist === "elevated")
    d.factors.push(
      f("li.waist", `Waist ${input.profile.waistCm} cm — at the South-Asian cutoff`, 3),
    );

  const bmi = computeBmi(input.profile.heightCm, input.profile.weightKg);
  const band = bmiBand(bmi);
  if (band === "obese") d.factors.push(f("li.bmi", `BMI ${bmi}`, 3));
  else if (band === "risk") d.factors.push(f("li.bmi", `BMI ${bmi}`, 2));

  const sweets = BAND_POINTS[input.diet.sweetsPerWeek];
  const fried = BAND_POINTS[input.diet.friedPerWeek];
  const drinks = BAND_POINTS[input.diet.sugaryDrinksPerWeek];
  if (sweets >= 2.5)
    d.factors.push(
      f("li.sweets", "Frequent sweets — fructose load goes straight to the liver", sweets),
    );
  if (fried >= 2.5) d.factors.push(f("li.fried", "Frequent deep-fried food", fried));
  if (drinks >= 2.5) d.factors.push(f("li.drinks", "Regular sugary drinks", drinks));

  if (
    input.labs.triglyceridesMgDl != null &&
    input.labs.triglyceridesMgDl >= LAB_BANDS.triglycerides.high
  ) {
    d.factors.push(
      f(
        "li.tg",
        `Triglycerides ${input.labs.triglyceridesMgDl} mg/dL — fatty-liver travels with high TG`,
        3.5,
      ),
    );
    confidence = CONFIDENCE.MODERATE;
  }
  if (input.activity.minutesPerWeek < 60)
    d.factors.push(
      f(
        "li.sedentary",
        "Low movement — liver fat clears with exercise even without weight loss",
        3,
      ),
    );
  else if (input.activity.minutesPerWeek >= 150)
    d.factors.push(
      f("li.active", "Regular activity — proven to reduce liver fat", 2.5, "protective"),
    );
  if (input.history.alcohol === "daily")
    d.factors.push(f("li.alcohol", "Daily alcohol — direct liver load", 4.5));
  else if (input.history.alcohol === "weekly")
    d.factors.push(f("li.alcohol", "Weekly alcohol", 1.5));
  if (sym(input, SYMPTOM_IDS.rightUpperAbdomenAche))
    d.factors.push(f("li.ache", "Dull ache on the upper right side", 2));
  if (hasCond(input, /fatty liver|masld|nafld|liver/i)) {
    d.factors.push(
      f("li.known", "Fatty liver already diagnosed — lifestyle is the main treatment", 4),
    );
    confidence = CONFIDENCE.HIGHER;
  }
  if (hasCond(input, /diabet|sugar/i))
    d.factors.push(f("li.dm", "Diabetes raises fatty-liver probability substantially", 2.5));

  d.headline =
    d.burden >= 40
      ? "A fatty-liver pattern is building — it reverses at this stage"
      : "Liver-related signals look steady";

  d.screening.push(
    waist === "high" ||
      band === "obese" ||
      (input.labs.triglyceridesMgDl != null &&
        input.labs.triglyceridesMgDl >= LAB_BANDS.triglycerides.high)
      ? {
          test: "Liver function test + abdominal ultrasound",
          why: "Standard first checks for fatty-liver patterns; both are cheap and widely available",
          cadence: "once now",
        }
      : {
          test: "Annual LFT",
          why: "Routine monitoring is enough at current signals",
          cadence: "yearly",
        },
  );
  d.actions.push(
    {
      title: "The liver responds fast",
      detail:
        "Cutting sweets/fried food and 150 min/week of brisk walking reduces liver fat measurably within 8-12 weeks — even before weight changes.",
      effort: "moderate",
    },
    {
      title: "Watch the 'healthy' sugars",
      detail:
        "Fruit juice, flavoured yogurt, glucose-heavy 'energy' drinks count as liver sugar load.",
      effort: "easy",
    },
  );
  d.clinicianQuestions.push(
    "Should I get an ultrasound for fatty liver even though my reports were 'normal' last year?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ================= 12 · MIND / STRESS ================= */

function mind(input: ForesightInput): DomainResult {
  const d = base("mind");
  let confidence: Confidence = CONFIDENCE.MODERATE;

  if (input.history.stress === "high")
    d.factors.push(f("mi.stress", "High self-reported stress", 4));
  else if (input.history.stress === "moderate")
    d.factors.push(f("mi.stress", "Moderate stress", 2));
  else d.factors.push(f("mi.stress", "Stress feels manageable", 1.5, "protective"));

  if (input.history.moodLowDays >= 10) {
    d.factors.push(
      f("mi.low", `Low/hopeless on ${input.history.moodLowDays} of the last 14 days`, 5),
    );
    d.burden = Math.max(d.burden, 42); // two heavy weeks is clinically significant
  } else if (input.history.moodLowDays >= 5)
    d.factors.push(f("mi.low", `Low mood on ${input.history.moodLowDays} of the last 14 days`, 3));
  else if (input.history.moodLowDays <= 1)
    d.factors.push(f("mi.low", "Mostly steady mood", 1.5, "protective"));

  if (sym(input, SYMPTOM_IDS.panicEpisodes)) d.factors.push(f("mi.panic", "Panic episodes", 3.5));
  if (input.sleep.hoursPerNight > 0 && input.sleep.hoursPerNight < 6.5)
    d.factors.push(f("mi.sleep", "Short sleep feeds anxiety loops", 2.5));
  if (input.activity.minutesPerWeek >= 150)
    d.factors.push(
      f(
        "mi.active",
        "Regular movement — among the strongest evidence-backed mood supports",
        2.5,
        "protective",
      ),
    );
  else if (input.activity.minutesPerWeek < 60)
    d.factors.push(
      f("mi.sedentary", "Very little movement — mood benefits of activity are unclaimed", 1.5),
    );
  if (input.history.tobacco === "current_smoke")
    d.factors.push(
      f("mi.tobacco", "Smoking as a stress-coping pattern tends to deepen the loop", 1),
    );

  d.headline =
    d.burden >= 40
      ? "Your mental load is running high — this deserves real care, not willpower"
      : "Mind-related signals look steady";

  d.screening.push(
    input.history.moodLowDays >= 10
      ? {
          test: "A conversation with a counsellor",
          why: "Two heavy weeks is a reasonable trigger to talk to someone — Tele-MANAS 14416 is free and 24×7",
          cadence: "now",
        }
      : {
          test: "None needed",
          why: "No clinical trigger; keep the habits that protect mood",
          cadence: "—",
        },
  );
  d.actions.push(
    {
      title: "Name it to one person",
      detail:
        "Telling one trusted person (or a Tele-MANAS counsellor) measurably lowers the load — secrecy is heavy.",
      effort: "easy",
    },
    {
      title: "Morning light + movement combo",
      detail:
        "10 minutes of morning daylight with a short walk is the cheapest antidepressant-adjacent habit with real evidence.",
      effort: "easy",
    },
  );
  d.clinicianQuestions.push(
    "I've been feeling low for two weeks — what are my options for counselling in my city/language?",
  );
  d.confidence = confidence;
  return finish(d);
}

/* ---------------- registry ---------------- */

export const DOMAIN_SCORERS: Record<DomainId, (input: ForesightInput) => DomainResult> = {
  metabolic,
  bp,
  heart,
  hemoglobin,
  vitamin_d: vitaminD,
  b12,
  thyroid,
  pcos,
  sleep,
  lungs,
  liver,
  mind,
};

export function scoreAllDomains(input: ForesightInput): DomainResult[] {
  return ALL_DOMAIN_IDS.map((id) => DOMAIN_SCORERS[id](input));
}
