import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { redactDeep } from "./redact";
import { activeModelId } from "@/lib/gemini";

/* ============================================================
   NEXURA OS v5 — AI GOVERNANCE CORE
   Every AI output carries: confidence score, consent verification,
   prompt/model versions, and a threshold verdict. Below threshold,
   the fail-safe routes to a HUMAN instead of shipping the output.
   Corrections are captured as NxAiFeedback (HITL loop) and surfaced
   in the daily performance report (/api/nx/ai/report).
   ============================================================ */

export const PROMPT_VERSIONS: Record<string, string> = {
  patient_summary: "patient_summary@4",
  handover: "handover@3",
  discharge_draft: "discharge_draft@2",
  ops_recommend: "ops_recommend@3",
};

/** The model id recorded on every AI interaction — the REAL provider path
 *  that will serve the call (env-dependent), not a hardcoded label. */
export function modelVersion(): string {
  return process.env.NX_AI_MODEL_VERSION || activeModelId();
}

/**
 * Deterministic confidence heuristic — structured-output completeness.
 * Not a clinical accuracy score: it measures how well the model satisfied
 * the requested JSON contract (fields present, arrays populated, gaps
 * declared). Honest and explainable, unit-tested.
 */
export function confidenceHeuristic(output: unknown): number {
  if (typeof output === "string") {
    try {
      output = JSON.parse(output);
    } catch {
      return 0.35; // unparseable free text — low confidence
    }
  }
  if (!output || typeof output !== "object") return 0.3;
  const obj = output as Record<string, unknown>;
  const values = Object.values(obj);
  const filled = values.filter((v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0));
  let score = values.length ? filled.length / values.length : 0.3;
  // declared data gaps are a GOOD sign (honest uncertainty), not a penalty
  const hasGapDisclosure = values.some((v) => typeof v === "string" && /missing|not available|no data|unknown/i.test(v));
  if (hasGapDisclosure) score = Math.min(1, score + 0.05);
  // extremely short outputs are suspicious
  const blob = JSON.stringify(obj);
  if (blob.length < 24) score = Math.min(score, 0.5);
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

/** Has this patient consented to AI-assisted processing (DPDP/GDPR)? */
export async function checkAiConsent(hospitalId: string, patientId?: string): Promise<boolean | null> {
  if (!patientId) return null; // no specific patient (e.g. ops analytics) — not applicable
  const consent = await db.nxConsent.findFirst({
    where: {
      hospitalId, patientId,
      type: { in: ["ai_assist", "data_share"] },
      status: "granted",
    },
    orderBy: { grantedAt: "desc" },
  });
  return Boolean(consent);
}

export type ThresholdAction = "allowed" | "human_fallback" | "blocked";

export async function enforceThreshold(hospitalId: string, feature: string, confidence: number): Promise<{ action: ThresholdAction; min: number; requireReview: boolean }> {
  const cfg = await db.nxAiThreshold.findUnique({ where: { hospitalId_feature: { hospitalId, feature } } });
  const min = cfg?.minConfidence ?? 0.6;
  const requireReview = cfg?.requireReview ?? true;
  if (confidence < min * 0.7) return { action: "blocked", min, requireReview };
  if (confidence < min) return { action: "human_fallback", min, requireReview };
  return { action: "allowed", min, requireReview };
}

export async function logAiInteraction(args: {
  hospitalId: string;
  userName: string;
  userRole: string;
  feature: string;
  status: string;
  output?: unknown;
  confidence?: number;
  consentFlag?: boolean | null;
  thresholdAction?: ThresholdAction;
}): Promise<void> {
  await db.nxAIInteraction.create({
    data: {
      hospitalId: args.hospitalId,
      userName: args.userName,
      userRole: args.userRole,
      feature: args.feature,
      status: args.status,
      response: args.output ? redactDeep(JSON.stringify(args.output)).slice(0, 4000) : undefined,
      confidence: args.confidence,
      consentFlag: args.consentFlag ?? undefined,
      promptVersion: PROMPT_VERSIONS[args.feature],
      modelVersion: modelVersion(),
      thresholdAction: args.thresholdAction,
    },
  }).catch((err) => log.warn("ai", "telemetry_log_failed", { err: String(err) }));
}
