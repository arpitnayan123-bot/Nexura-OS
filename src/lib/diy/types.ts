/* ============================================================
 * NEXURA DIY — DOMAIN TYPES
 * 16 goal categories / 5 safety actions / 11-state goal
 * machine / 9 granular consent scopes. Deterministic first:
 * the safety plane and roadmaps work with zero AI available.
 * ============================================================ */

export const DIY_CATEGORIES = [
  "WEIGHT_LOSS",
  "WEIGHT_GAIN",
  "SLEEP",
  "STRESS",
  "ANXIETY_MOOD",
  "SKIN_ACNE",
  "SKIN_GENERAL",
  "HAIR_HEALTH",
  "FITNESS_STRENGTH",
  "FITNESS_ENDURANCE",
  "DIET_QUALITY",
  "ENERGY",
  "DIGESTION",
  "POSTURE_PAIN",
  "HABITS_SCREEN",
  "SUBSTANCE_REDUCTION",
] as const;
export type DiyCategory = (typeof DIY_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<DiyCategory, string> = {
  WEIGHT_LOSS: "Weight loss",
  WEIGHT_GAIN: "Healthy weight gain",
  SLEEP: "Better sleep",
  STRESS: "Stress",
  ANXIETY_MOOD: "Anxiety & mood",
  SKIN_ACNE: "Acne & breakouts",
  SKIN_GENERAL: "Skin health",
  HAIR_HEALTH: "Hair health",
  FITNESS_STRENGTH: "Strength",
  FITNESS_ENDURANCE: "Stamina",
  DIET_QUALITY: "Everyday diet",
  ENERGY: "Energy",
  DIGESTION: "Digestion",
  POSTURE_PAIN: "Posture & pain",
  HABITS_SCREEN: "Screen & habits",
  SUBSTANCE_REDUCTION: "Smoking / alcohol reduction",
};

/** Deterministic safety plane verdicts, strictest wins. */
export const SAFETY_ACTIONS = [
  "ALLOW",
  "CLARIFY",
  "SOFT_LIMIT",
  "STOP_AND_REFER",
  "EMERGENCY",
] as const;
export type SafetyAction = (typeof SAFETY_ACTIONS)[number];

/** Goal lifecycle — 11 states, every transition server-validated. */
export const GOAL_STATES = [
  "DRAFTED",
  "CLARIFYING",
  "CONFIRMED",
  "PLANNING",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "NOT_FEASIBLE",
  "REFERRED",
  "ARCHIVED",
  "WITHDRAWN",
] as const;
export type GoalState = (typeof GOAL_STATES)[number];

export const GOAL_TRANSITIONS: Record<GoalState, GoalState[]> = {
  DRAFTED: ["CLARIFYING", "CONFIRMED", "ARCHIVED", "WITHDRAWN"],
  CLARIFYING: ["CONFIRMED", "ARCHIVED", "WITHDRAWN"],
  CONFIRMED: ["PLANNING", "ACTIVE", "ARCHIVED", "WITHDRAWN"],
  PLANNING: ["ACTIVE", "NOT_FEASIBLE", "ARCHIVED", "WITHDRAWN"],
  ACTIVE: ["PAUSED", "COMPLETED", "REFERRED", "ARCHIVED", "WITHDRAWN"],
  PAUSED: ["ACTIVE", "ARCHIVED", "WITHDRAWN"],
  COMPLETED: ["ARCHIVED", "ACTIVE"],
  NOT_FEASIBLE: ["ARCHIVED"],
  REFERRED: ["ARCHIVED"],
  ARCHIVED: [],
  WITHDRAWN: [],
};

export function canTransition(from: GoalState, to: GoalState): boolean {
  return GOAL_TRANSITIONS[from]?.includes(to) ?? false;
}

/* ---------- Granular consent (DPDP-aligned) ---------- */

export const CONSENT_SCOPES = [
  "GOAL_PARSING",
  "HEALTH_CONTEXT",
  "VOICE_PROCESSING",
  "VOICE_STORAGE",
  "PROGRESS_TRACKING",
  "REMINDERS",
  "PLAN_GENERATION",
  "PRODUCT_ANALYTICS",
  "MODEL_TRAINING",
] as const;
export type ConsentScope = (typeof CONSENT_SCOPES)[number];

/** Which scopes each protected action needs (fail-closed). */
export const REQUIRED_SCOPES: Record<string, ConsentScope[]> = {
  PARSE: ["GOAL_PARSING"],
  GOALS_WRITE: ["GOAL_PARSING"],
  GENERATE: ["GOAL_PARSING", "PLAN_GENERATION"],
  CONTEXT: ["HEALTH_CONTEXT"],
  TASKS: ["PROGRESS_TRACKING"],
  PROGRESS: ["PROGRESS_TRACKING"],
  CHECKIN: ["PROGRESS_TRACKING"],
  SKINCARE: ["PLAN_GENERATION"],
  EXPORT: ["GOAL_PARSING"],
  DELETE: ["GOAL_PARSING"],
};

export const CONSENT_POLICY_VERSION = "2026-09-diy-1";

/* ---------- Timeframe pacing floors (deterministic) ---------- */
/** Realistic minimums: promising faster than physiology allows is
 *  a safety failure, not a personalization gap. */
export const PACING_FLOORS: Partial<Record<DiyCategory, number>> = {
  WEIGHT_LOSS: 84,
  WEIGHT_GAIN: 90,
  HAIR_HEALTH: 90,
  SKIN_ACNE: 56,
  POSTURE_PAIN: 28,
  SUBSTANCE_REDUCTION: 28,
};

/** Category default plan lengths (days) when the user gives none. */
export const DEFAULT_DAYS: Record<DiyCategory, number> = {
  WEIGHT_LOSS: 84,
  WEIGHT_GAIN: 90,
  SLEEP: 42,
  STRESS: 42,
  ANXIETY_MOOD: 56,
  SKIN_ACNE: 56,
  SKIN_GENERAL: 56,
  HAIR_HEALTH: 90,
  FITNESS_STRENGTH: 56,
  FITNESS_ENDURANCE: 56,
  DIET_QUALITY: 42,
  ENERGY: 42,
  DIGESTION: 42,
  POSTURE_PAIN: 28,
  HABITS_SCREEN: 28,
  SUBSTANCE_REDUCTION: 28,
};

/* ---------- Burden model ---------- */
/** Cap on simultaneously active daily tasks — overflow is trimmed
 *  honestly (explained in the UI), never silently dropped. */
export const BURDEN_DAILY_TASK_CAP = 8;

/* ---------- Audit events (subset used by routes) ---------- */
export const AUDIT = {
  GOALS_PARSED: "DIY_GOALS_PARSED",
  GOAL_CREATED: "DIY_GOAL_CREATED",
  GOAL_STATE: "DIY_GOAL_STATE_CHANGED",
  CONSENT_GRANTED: "DIY_CONSENT_GRANTED",
  CONSENT_WITHDRAWN: "DIY_CONSENT_WITHDRAWN",
  PLAN_GENERATED: "DIY_PLAN_GENERATED",
  TASK_UPDATED: "DIY_TASK_UPDATED",
  CHECKIN_DONE: "DIY_CHECKIN_DONE",
  SAFETY_EVENT: "DIY_SAFETY_EVENT",
  DATA_EXPORTED: "DIY_DATA_EXPORTED",
  DATA_DELETED: "DIY_DATA_DELETED",
} as const;
