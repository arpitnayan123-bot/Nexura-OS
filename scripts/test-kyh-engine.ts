/* Smoke-test the KYH offline engine functions directly (pure TS, no server). */
import {
  offlineSymptomsChecker,
  offlineBp,
  offlineDiabetes,
  offlineDiseaseRisk,
  offlineMentalWellness,
  offlineSleep,
  offlineMedInteraction,
  offlineLab,
  offlineDiet,
  offlineAyurveda,
  offlineQuizGenerate,
  offlineQuizScore,
  offlineWomensCare,
  offlineFoodScan,
  offlineDermaScan,
  offlineXrayReader,
} from "../src/lib/kyh/offline-engine";

function show(label: string, v: unknown, keys?: string[]) {
  const o = v as Record<string, unknown> | null;
  const status = o ? "OK" : "NULL";
  const ks = o ? (keys ?? Object.keys(o)).join(",") : "";
  console.log(`${label.padEnd(22)} ${status}  [${ks}]`);
}

const s = offlineSymptomsChecker("mild fever and cough since 2 days, body ache");
console.log("symptoms urgency:", s?.urgency, "| causes:", (s?.possibleCauses ?? []).length);
const e = offlineSymptomsChecker("I have chest pain and can't breathe");
console.log("emergency test  :", e?.urgency === "emergency" ? "OK" : "FAIL", e?.urgency);
show(
  "bp",
  offlineBp([
    { systolic: 148, diastolic: 95 },
    { systolic: 152, diastolic: 98 },
    { systolic: 150, diastolic: 94 },
  ]),
  ["classification", "averageSystolic", "trend", "whiteCoatSuspected"],
);
show("bp-normal", offlineBp([{ systolic: 118, diastolic: 76 }]), ["classification"]);
show("diabetes", offlineDiabetes(165, 230, 8.2), ["status", "fastingAssessment"]);
show(
  "risk",
  offlineDiseaseRisk({
    age: 52,
    heightCm: 170,
    weightKg: 82,
    waistCm: 98,
    bpSystolic: 145,
    familyHistory: ["diabetes"],
    smoking: "yes",
    activity: "sedentary",
  }),
  ["diabetesRisk", "cvdRisk", "ckdRisk", "topRecommendations"],
);
const mw = offlineMentalWellness([1, 2, 2, 1, 2, 1, 1, 0, 0], [2, 2, 2, 1, 1, 1, 0]);
console.log(
  "mental phq/gad  :",
  (mw as any).phq9.score,
  (mw as any).gad7.score,
  (mw as any).phq9.level,
  "/",
  (mw as any).gad7.level,
  "| resources:",
  (mw as any).crisisResources.length,
);
show(
  "sleep",
  offlineSleep({
    bedtime: "23:30",
    wakeTime: "6:30 am",
    sleepLatencyMin: 45,
    awakenings: 3,
    totalAwakeMin: 40,
    sleepQuality: 2,
    mood: 3,
  }),
  ["totalSleepHours", "sleepEfficiencyPercent", "sleepEfficiencyCategory", "patternsDetected"],
);
const mi = offlineMedInteraction(["combiflam", "ecosprin 75", "thyronorm 50", "shelcal"]) as any;
console.log(
  "med-interact    :",
  mi.interactions.length,
  "interaction(s);",
  mi.interactions.map((i: any) => `${i.drug1}+${i.drug2}:${i.severity}`).join(" | "),
);
const lab = offlineLab([
  { name: "Hemoglobin", value: "10.2", unit: "g/dL" },
  { name: "TSH", value: "6.8" },
  { name: "Vitamin D", value: "14" },
  { name: "LDL", value: "99" },
]) as any;
console.log(
  "lab             :",
  `abnormal=${lab.abnormalCount}`,
  lab.tests.map((t: any) => `${t.name}:${t.status}:${t.severity}`).join(" "),
);
show("lab-empty", offlineLab([]), ["overallSummary"]);
show(
  "diet",
  offlineDiet({
    age: 34,
    heightCm: 168,
    weightKg: 74,
    calorieTarget: 1800,
    dietaryPreference: "vegetarian",
    allergies: "peanuts",
  }),
  ["bmi", "calorieTarget", "macroSplit"],
);
const diet = offlineDiet({ age: 34, heightCm: 168, weightKg: 74, calorieTarget: 1800 }) as any;
console.log(
  "diet plan days  :",
  diet.mealPlan.length,
  "| monday lunch:",
  diet.mealPlan[0].lunch.meal.slice(0, 50),
);
show("ayurveda", offlineAyurveda(Array(20).fill("a")), ["dominantDosha", "scores"]);
const quiz = offlineQuizGenerate() as any;
console.log(
  "quiz gen        :",
  quiz.questions.length,
  "questions; q1:",
  quiz.questions[0].question.slice(0, 40),
);
const scored = offlineQuizScore(
  quiz.questions,
  Object.fromEntries(quiz.questions.map((q: any) => [q.id, q.correctIndex])),
) as any;
console.log("quiz score      :", `${scored.score}/${scored.total}`, scored.grade);
show(
  "womens-pcos",
  offlineWomensCare("irregular periods and facial hair", "weight gain", { age: 27 }),
  ["assessment", "pcosRiskScore"],
);
show("food-scan", offlineFoodScan("Lunch"), ["identifiedFood", "healthScore"]);
show("derma", offlineDermaScan(), ["description", "possibleConditions", "urgency"]);
show("xray", offlineXrayReader("chest"), ["bodyPart", "requiresRadiologistReview"]);
