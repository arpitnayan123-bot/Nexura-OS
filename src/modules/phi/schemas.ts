/* ============================================================
 * NEXURA PHI — INPUT SCHEMAS (pure, zod v4)
 * Every /api/nx/phi route validates its body through this module.
 * Rules:
 *  - Adults only: ageYears < 18 is rejected (routed out by design).
 *  - Plausibility ranges come from normalize.ts (sanity, not diagnosis).
 *  - Unit conversions happen in schema refinements/transforms so the
 *    route layer only ever sees canonical storage units (°C, mg/dL).
 *  - Error output must never echo input text: routes render only the
 *    first issue's path + message via firstZodIssue().
 * ============================================================ */

import { z } from "zod";
import { CONSENT_SCOPES, type IntakeBucket } from "./contracts";
import { fahrenheitToCelsius, glucoseMmolToMgDl, isPlausibleBp } from "./normalize";

/* ---------------- shared atoms ---------------- */

const isoDateLike = z
  .string()
  .max(40)
  .refine((v) => !Number.isNaN(Date.parse(v)), "expected a parseable ISO date string");

const freeText = (max: number) => z.string().max(max);

/* ---------------- consent ---------------- */

export const consentPutSchema = z.object({
  scope: z.enum(CONSENT_SCOPES),
  granted: z.boolean(),
});
export type ConsentPutInput = z.infer<typeof consentPutSchema>;

/* ---------------- profile ---------------- */

const adultAge = z
  .number()
  .int()
  .min(18, "This tool is adults-only — ages under 18 are not supported.")
  .max(120)
  .nullable();

export const profilePutSchema = z
  .object({
    ageYears: adultAge.optional(),
    sexAtBirth: z.enum(["male", "female", "intersex", "undisclosed"]).optional(),
    heightCm: z
      .number()
      .min(80)
      .max(250)
      .nullable()
      .optional(),
    weightKg: z
      .number()
      .min(20)
      .max(400)
      .nullable()
      .optional(),
    waistCm: z
      .number()
      .min(40)
      .max(200)
      .nullable()
      .optional(),
    pregnancyPossibility: z.boolean().optional(),
    languagePref: z.enum(["en", "hi"]).optional(),
    dietaryPref: z.enum(["vegetarian", "non_vegetarian", "eggetarian", "vegan", "jain", "other"]).nullable().optional(),
    cuisine: z
      .enum(["north_indian", "south_indian", "east_indian", "west_indian", "northeast_indian", "mixed"])
      .nullable()
      .optional(),
    activityLevel: freeText(40).nullable().optional(),
    occupation: freeText(80).nullable().optional(),
    shiftWork: z.boolean().optional(),
    accessibilityNotes: freeText(500).nullable().optional(),
  })
  .strict();

export type ProfilePutInput = z.infer<typeof profilePutSchema>;

/* ---------------- intake buckets ---------------- */

export const INTAKE_BUCKETS = [
  "symptoms",
  "conditions",
  "medications",
  "allergies",
  "lifestyle",
  "vitals",
  "labs",
] as const satisfies readonly IntakeBucket[];

export function isIntakeBucket(value: string): value is IntakeBucket {
  return (INTAKE_BUCKETS as readonly string[]).includes(value);
}

const maxArrayItems = (n: number) => z.array(freeText(60)).max(n);

export const symptomSchema = z
  .object({
    category: freeText(60).refine((v) => v.trim().length > 0, "category is required"),
    userWording: freeText(500).default(""),
    bodyLocation: freeText(80).optional(),
    onsetAt: freeText(40).optional(),
    durationDays: z.number().int().min(0).max(36500).nullable().optional(),
    severity1to10: z.number().int().min(1).max(10),
    frequency: freeText(40).optional(),
    pattern: freeText(80).optional(),
    triggers: freeText(200).optional(),
    relieving: freeText(200).optional(),
    worsening: freeText(200).optional(),
    associated: maxArrayItems(10).default([]),
    denied: maxArrayItems(10).default([]),
    isNew: z.boolean().default(true),
    isWorsening: z.boolean().default(false),
    confidence: z.enum(["sure", "unsure"]).optional(),
  })
  .strict();

export const conditionSchema = z
  .object({
    name: freeText(120).refine((v) => v.trim().length > 0, "name is required"),
    source: z.enum(["user_reported", "clinician_confirmed"]).default("user_reported"),
    diagnosedYear: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear())
      .nullable()
      .optional(),
    status: z.enum(["active", "managed", "resolved"]).default("active"),
    treatmentStatus: freeText(120).optional(),
    complications: freeText(300).optional(),
  })
  .strict();

export const medicationSchema = z
  .object({
    name: freeText(120).refine((v) => v.trim().length > 0, "name is required"),
    strength: freeText(40).optional(),
    frequency: freeText(60).optional(),
    reason: freeText(200).optional(),
    prescribedBy: z.enum(["doctor", "self"]).optional(),
    startedAt: freeText(40).optional(),
    adverseReactions: freeText(300).optional(),
  })
  .strict();

export const allergySchema = z
  .object({
    substance: freeText(120).refine((v) => v.trim().length > 0, "substance is required"),
    reaction: freeText(200).optional(),
    severity: z.enum(["mild", "moderate", "severe", "unknown"]).default("unknown"),
  })
  .strict();

export const lifestyleSchema = z
  .object({
    // Every field is optional/nullable: UNFILLED STAYS MISSING — the UI never
    // fabricates defaults and the server never invents "never"/"good" values.
    sleepHours: z.number().min(0).max(24).nullable().optional(),
    sleepQuality: z.enum(["good", "fair", "poor"]).nullable().optional(),
    activityMinutesWeek: z.number().int().min(0).max(3000).nullable().optional(),
    sedentaryHours: z.number().min(0).max(24).nullable().optional(),
    mealPattern: freeText(60).nullable().optional(),
    fruitsVegFrequency: freeText(40).nullable().optional(),
    proteinSources: freeText(120).nullable().optional(),
    waterGlasses: z.number().int().min(0).max(30).nullable().optional(),
    tobacco: z.enum(["never", "former", "current"]).nullable().optional(),
    alcohol: z.enum(["never", "occasional", "weekly", "daily"]).nullable().optional(),
    stressLevel: z.enum(["low", "moderate", "high"]).nullable().optional(),
    workSchedule: freeText(60).nullable().optional(),
    socialSupport: freeText(120).nullable().optional(),
  })
  .strict();

/* ---- vitals: canonical-unit transform (°C, mg/dL) ---- */

const vitalMeasurement = z
  .object({
    systolic: z.number().int().min(50).max(300).optional(),
    diastolic: z.number().int().min(30).max(200).optional(),
    heartRate: z.number().int().min(25).max(250).optional(),
    temperatureC: z.number().min(30).max(45).optional(),
    temperatureF: z.number().min(80).max(115).optional(),
    spo2: z.number().int().min(50).max(100).optional(),
    glucoseMgDl: z.number().min(20).max(1500).optional(),
    glucoseMmol: z.number().min(0.1).max(60).optional(),
    weightKg: z.number().min(20).max(400).optional(),
    atRest: z.boolean().default(true),
    deviceSource: z.enum(["user_entered", "device"]).default("user_entered"),
    confidence: z.enum(["sure", "unsure"]).optional(),
    measuredAt: isoDateLike.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.temperatureC != null && v.temperatureF != null) {
      ctx.addIssue({ code: "custom", path: ["temperatureF"], message: "provide temperatureC or temperatureF, not both" });
    }
    if (v.glucoseMgDl != null && v.glucoseMmol != null) {
      ctx.addIssue({ code: "custom", path: ["glucoseMmol"], message: "provide glucoseMgDl or glucoseMmol, not both" });
    }
    if (
      v.systolic == null &&
      v.diastolic == null &&
      v.heartRate == null &&
      v.temperatureC == null &&
      v.temperatureF == null &&
      v.spo2 == null &&
      v.glucoseMgDl == null &&
      v.glucoseMmol == null &&
      v.weightKg == null
    ) {
      ctx.addIssue({ code: "custom", path: [], message: "at least one measurement is required" });
    }
    if (v.systolic != null && v.diastolic != null && !isPlausibleBp(v.systolic, v.diastolic)) {
      ctx.addIssue({ code: "custom", path: ["diastolic"], message: "systolic must be greater than diastolic" });
    }
  })
  .transform((v) => {
    const out: Omit<typeof v, "temperatureF" | "glucoseMmol"> & { _converted?: string[] } = {
      systolic: v.systolic,
      diastolic: v.diastolic,
      heartRate: v.heartRate,
      temperatureC:
        v.temperatureC != null
          ? v.temperatureC
          : v.temperatureF != null
            ? (fahrenheitToCelsius(v.temperatureF) ?? undefined)
            : undefined,
      spo2: v.spo2,
      glucoseMgDl:
        v.glucoseMgDl != null
          ? v.glucoseMgDl
          : v.glucoseMmol != null
            ? (glucoseMmolToMgDl(v.glucoseMmol) ?? undefined)
            : undefined,
      weightKg: v.weightKg,
      atRest: v.atRest,
      deviceSource: v.deviceSource,
      confidence: v.confidence,
      measuredAt: v.measuredAt,
    };
    const converted: string[] = [];
    if (v.temperatureF != null && v.temperatureC == null) converted.push("temperatureF->temperatureC");
    if (v.glucoseMmol != null && v.glucoseMgDl == null) converted.push("glucoseMmol->glucoseMgDl");
    if (converted.length > 0) out._converted = converted;
    return out;
  });

export const vitalsSchema = vitalMeasurement;

/** Canonical vitals payload after validation + unit conversion. */
export type VitalsInput = z.output<typeof vitalsSchema>;

export const labSchema = z
  .object({
    testName: freeText(120).refine((v) => v.trim().length > 0, "testName is required"),
    resultValue: z.number(),
    unit: freeText(24).refine((v) => v.trim().length > 0, "unit is required"),
    refRangeLow: z.number().nullable().optional(),
    refRangeHigh: z.number().nullable().optional(),
    collectedAt: isoDateLike.nullable().optional(),
    labSource: freeText(40).optional(),
  })
  .strict();

export const intakeSchemas = {
  symptoms: symptomSchema,
  conditions: conditionSchema,
  medications: medicationSchema,
  allergies: allergySchema,
  lifestyle: lifestyleSchema,
  vitals: vitalsSchema,
  labs: labSchema,
} as const;

/* ---------------- assessment / summary / share ---------------- */

export const runAssessmentSchema = z.object({}).strict();

export const summaryPostSchema = z
  .object({
    assessmentId: z.string().min(1).max(80),
  })
  .strict();

/** Sections a share grant may expose — nothing outside this list can leak. */
export const SHARE_SECTIONS = [
  "detectedSignals",
  "missingInformation",
  "questionsToAsk",
  "recentVitals",
  "medications",
  "allergies",
  "lifestyleContext",
] as const;

export type ShareSection = (typeof SHARE_SECTIONS)[number];

export const sharePostSchema = z
  .object({
    assessmentId: z.string().min(1).max(80),
    includes: z.array(z.enum(SHARE_SECTIONS)).min(1).max(SHARE_SECTIONS.length),
    dateFrom: isoDateLike.optional(),
    dateTo: isoDateLike.optional(),
    expiresInDays: z.number().int().min(1).max(30).default(7),
  })
  .strict();

export const shareDeleteSchema = z.object({
  token: z.string().min(10).max(200),
});

/* ---------------- feedback ---------------- */

export const feedbackPostSchema = z
  .object({
    kind: z.enum(["unclear", "incorrect", "other"]),
    message: freeText(1000).optional(),
    assessmentId: z.string().min(1).max(80).optional(),
  })
  .strict();

/* ---------------- error rendering ---------------- */

/**
 * Renders the FIRST zod issue as "path: message" — safe for responses
 * because zod messages describe expectations, never input values.
 */
export function firstZodIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "invalid input";
  const path = issue.path.map(String).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
