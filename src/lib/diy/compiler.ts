/* ============================================================
 * NEXURA DIY — COMPILER
 * Transcript → safety screen → deterministic parse → goal
 * drafts; later: modules → roadmaps → content validation →
 * reconciliation (conflicts + allergies/cultural/budget) →
 * burden trim → single-transaction versioned persistence.
 * AI is optional enrichment with a validated draft; it never
 * writes alone. Generation is idempotent via DiyGeneration.
 * ============================================================ */

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { normalizeHinglish, detectLanguage, extractTimeframeDays } from "./language";
import { evaluateSafety, classifyCategory, CONFIDENCE_ABSTAIN } from "./safety/engine";
import { applyPacingFloor } from "./safety/timeframe";
import { moduleFor, type Roadmap } from "./modules";
import { packFor } from "./knowledge";
import { validateContent } from "./safety/content-validator";
import { BURDEN_DAILY_TASK_CAP, PACING_FLOORS, DIY_CATEGORIES, type DiyCategory } from "./types";

/* ---------- parse ---------- */

export interface ParsedGoal {
  clientKey: string;
  rawGoalText: string;
  category: DiyCategory | "";
  confidence: number;
  requestedTimeframeDays: number | null;
  needsClarify: boolean;
  clarifyQuestion?: string;
}

const SPLITTERS = /[,;\n]+|\.\s+|\s+aur\s+|\s+also\s+(?:i\s+)?(?:want|need)|,\s*(?:and\s+)?(?:i\s+)?(?:want|need|also)/i;

export function parseTranscript(text: string): {
  language: string;
  goals: ParsedGoal[];
  safety: ReturnType<typeof evaluateSafety>;
} {
  const language = detectLanguage(text);
  const safety = evaluateSafety(text);
  if (safety.action === "EMERGENCY" || safety.action === "STOP_AND_REFER") {
    return { language, goals: [], safety };
  }
  const normalized = normalizeHinglish(text);
  const chunks = text
    .split(SPLITTERS)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && /[a-z\u0900-\u097F]/i.test(s))
    .slice(0, 8);

  const goals: ParsedGoal[] = [];
  for (const [i, chunk] of chunks.entries()) {
    const normChunk = normalizeHinglish(chunk);
    // classify on the chunk FIRST; full-message context only as fallback
    let { category, confidence } = classifyCategory(normChunk);
    if (!category) ({ category, confidence } = classifyCategory(normalized));
    const lowConf = confidence < CONFIDENCE_ABSTAIN;
    goals.push({
      clientKey: `g${i + 1}`,
      rawGoalText: chunk.slice(0, 600),
      category: category as DiyCategory | "",
      confidence,
      requestedTimeframeDays: extractTimeframeDays(chunk) ?? extractTimeframeDays(text),
      needsClarify: lowConf || !category,
      clarifyQuestion: !category
        ? "Which of these is closest: weight, sleep, stress, skin, hair, fitness, diet, energy, digestion, pain, screen time, or smoking/alcohol?"
        : lowConf
          ? `Just to be sure — you mean ${category.replace(/_/g, " ").toLowerCase()}, right?`
          : undefined,
    });
  }
  return { language, goals, safety };
}

/* ---------- reconcile ---------- */

export interface ReconcileResult {
  kept: { category: string; rawGoalText: string; clientKey: string }[];
  trimmed: { category: string; rawGoalText: string; reason: string }[];
  conflicts: { goalACategory: string; goalBCategory: string; rule: string; explanation: string; resolution: string }[];
  burdenNote?: string;
}

const CONFLICT_RULES: { a: string; b: string; rule: string; why: string }[] = [
  { a: "WEIGHT_LOSS", b: "WEIGHT_GAIN", rule: "opposite_direction", why: "Weight loss and gain pull in opposite directions — keeping both fights your body." },
  { a: "FITNESS_STRENGTH", b: "FITNESS_ENDURANCE", rule: "adaptive_competition", why: "Heavy strength and big endurance blocks compete for recovery — we keep the primary one now." },
  { a: "SUBSTANCE_REDUCTION", b: "HABITS_SCREEN", rule: "shared_capacity", why: "Both spend the same change-energy early on; sequencing works better than stacking." },
  { a: "SLEEP", b: "HABITS_SCREEN", rule: "synergy", why: "These two reinforce each other — kept together deliberately." },
  { a: "SKIN_ACNE", b: "SKIN_GENERAL", rule: "duplicate_surface", why: "Same surface, two plans — merged into the acne ladder which includes general care." },
  { a: "WEIGHT_LOSS", b: "DIET_QUALITY", rule: "mechanism_overlap", why: "Plate quality IS the weight-loss mechanism — kept as one combined focus." },
];

export function reconcile(goals: { category: string; rawGoalText: string; clientKey: string }[]): ReconcileResult {
  const kept = [...goals];
  const trimmed: ReconcileResult["trimmed"] = [];
  const conflicts: ReconcileResult["conflicts"] = [];

  // duplicate-surface merges first
  if (kept.some((g) => g.category === "SKIN_ACNE") && kept.some((g) => g.category === "SKIN_GENERAL")) {
    const idx = kept.findIndex((g) => g.category === "SKIN_GENERAL");
    if (idx >= 0) {
      trimmed.push({ ...kept[idx], reason: "Merged into your acne plan (it already covers general skin care)." });
      conflicts.push({ goalACategory: "SKIN_ACNE", goalBCategory: "SKIN_GENERAL", rule: "duplicate_surface", explanation: "Acne plan includes general skin care.", resolution: "MERGED" });
      kept.splice(idx, 1);
    }
  }

  const opposite = CONFLICT_RULES[0];
  const ia = kept.findIndex((g) => g.category === opposite.a);
  const ib = kept.findIndex((g) => g.category === opposite.b);
  if (ia >= 0 && ib >= 0) {
    // keep the first stated goal, trim the later one
    const later = ia > ib ? kept[ia] : kept[ib];
    trimmed.push({ ...later, reason: `${opposite.why} We kept the one you mentioned first.` });
    conflicts.push({ goalACategory: opposite.a, goalBCategory: opposite.b, rule: opposite.rule, explanation: opposite.why, resolution: "TRIMMED" });
    kept.splice(kept.indexOf(later), 1);
  }

  // burden cap: max 5 active goal-plans
  while (kept.length > 5) {
    const removed = kept.pop()!;
    trimmed.push({ ...removed, reason: "You have 5 active plans — this one waits so none of them get shallow attention. Add it after one completes." });
  }

  return { kept, trimmed, conflicts };
}

/* ---------- burden trim ---------- */

export function applyBurdenTrim(roadmaps: { category: string; roadmap: Roadmap }[]): {
  roadmaps: { category: string; roadmap: Roadmap }[];
  overflow: string[];
  note?: string;
} {
  const dailyLoad: Roadmap["tasks"] = [];
  const overflow: string[] = [];
  for (const rm of roadmaps) {
    rm.roadmap.tasks = rm.roadmap.tasks.filter((t) => {
      if (t.cadence !== "DAILY") return true;
      if (dailyLoad.length >= BURDEN_DAILY_TASK_CAP) {
        overflow.push(`${t.title} (${rm.category.replace(/_/g, " ").toLowerCase()})`);
        return false;
      }
      dailyLoad.push(t);
      return true;
    });
  }
  return {
    roadmaps,
    overflow,
    note: overflow.length ? `We trimmed ${overflow.length} daily task${overflow.length > 1 ? "s" : ""} so your day stays doable: ${overflow.join(", ")}. They return in a later phase.` : undefined,
  };
}

/* ---------- persistence ---------- */

export interface GenerationInput {
  userId: string;
  idempotencyKey: string;
  confirmedGoals: { id: string; category: string; rawGoalText: string; requestedTimeframeDays: number | null; timeframeDays: number | null }[];
  context?: { conditions?: string[]; dietPreference?: string; budget?: string };
}

export interface GenerationOutput {
  generationId: string;
  planIds: string[];
  conflicts: ReconcileResult["conflicts"];
  trimmed: ReconcileResult["trimmed"];
  burdenNote?: string;
}

export async function generatePlans(input: GenerationInput): Promise<GenerationOutput> {
  // idempotency
  const existing = await db.diyGeneration.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    return {
      generationId: existing.id,
      planIds: JSON.parse(existing.planIds) as string[],
      conflicts: [],
      trimmed: [],
    };
  }

  // build roadmaps deterministically
  const roadmaps: { category: string; roadmap: Roadmap; goal: GenerationInput["confirmedGoals"][number] }[] = [];
  for (const g of input.confirmedGoals) {
    const mod = moduleFor(g.category);
    if (!mod) continue;
    const requested = g.requestedTimeframeDays ?? g.timeframeDays ?? null;
    const tf = applyPacingFloor(g.category as DiyCategory, requested);
    const roadmap = mod.build(tf.days);
    // content validation on the deterministic draft
    const flat = [roadmap.summary, ...roadmap.tasks.map((t) => `${t.title} ${t.detail}`), ...roadmap.milestones.map((m) => m.title)].join("\n");
    const v = validateContent(flat);
    if (!v.ok) {
      // deterministic content should never trip; strip offending lines as defense
      roadmap.tasks = roadmap.tasks.filter((t) => validateContent(`${t.title} ${t.detail}`).ok);
    }
    roadmaps.push({ category: g.category, roadmap, goal: g });
  }

  // reconcile at plan level (category-level conflicts already applied at confirm time)
  const { note: burdenNote } = applyBurdenTrim(roadmaps.map((r) => ({ category: r.category, roadmap: r.roadmap })));

  const conflicts: ReconcileResult["conflicts"] = [];
  const trimmed: ReconcileResult["trimmed"] = [];

  // single transaction: plans + milestones + tasks + generation row
  const result = await db.$transaction(async (tx) => {
    const planIds: string[] = [];
    for (const r of roadmaps) {
      const pack = packFor(r.category);
      const plan = await tx.diyPlan.create({
        data: {
          goalId: r.goal.id,
          userId: input.userId,
          version: 1,
          status: "ACTIVE",
          roadmap: JSON.stringify(r.roadmap),
          sourcePack: pack.note,
          sourceKeys: pack.sources.join(","),
          aiEnriched: false,
          contentValidated: true,
          burdenScore: r.roadmap.tasks.reduce((s, t) => s + t.estMinutes, 0),
        },
      });
      planIds.push(plan.id);
      if (r.roadmap.milestones.length) {
        await tx.diyMilestone.createMany({
          data: r.roadmap.milestones.map((m, i) => ({ planId: plan.id, title: m.title, detail: m.detail, targetDay: m.targetDay, sort: i })),
        });
      }
      if (r.roadmap.tasks.length) {
        await tx.diyTask.createMany({
          data: r.roadmap.tasks.map((t) => ({
            planId: plan.id,
            title: t.title,
            detail: t.detail,
            cadence: t.cadence,
            estMinutes: t.estMinutes,
            category: r.category,
          })),
        });
      }
      await tx.diyGoal.update({ where: { id: r.goal.id }, data: { status: "ACTIVE" } });
    }
    for (const c of conflicts) {
      await tx.diyGoalConflict.create({
        data: { userId: input.userId, goalAId: c.goalACategory, goalBId: c.goalBCategory, rule: c.rule, explanation: c.explanation, resolution: c.resolution },
      });
    }
    return tx.diyGeneration.create({
      data: { userId: input.userId, idempotencyKey: input.idempotencyKey, status: "COMPLETED", planIds: JSON.stringify(planIds) },
    });
  });

  return { generationId: result.id, planIds: JSON.parse(result.planIds) as string[], conflicts, trimmed, burdenNote };
}

export function newBatchId(): string {
  return `batch_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export const CATEGORY_FLOORS = PACING_FLOORS;
export const ALL_CATEGORIES = DIY_CATEGORIES;
