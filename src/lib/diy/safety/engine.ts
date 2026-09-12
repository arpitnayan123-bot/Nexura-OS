/* ============================================================
 * NEXURA DIY — SAFETY ENGINE (deterministic, rules > model)
 * Rules ALWAYS win over any model output. Confidence
 * abstention: below 0.6 the parser must CLARIFY, below 0.85 it
 * must not auto-confirm medical-adjacent goals.
 * ============================================================ */

import { RED_FLAGS, HINGLISH_EMERGENCIES, type RedFlag } from "./red-flags";
import type { SafetyAction } from "../types";
import { db } from "@/lib/db";
import { AUDIT } from "../types";

export interface SafetyVerdict {
  action: SafetyAction;
  matched: { id: string; kind: string; severity: string; message: string }[];
  message?: string;
}

export function evaluateSafety(rawText: string): SafetyVerdict {
  const text = rawText.slice(0, 4000);
  const matched: SafetyVerdict["matched"] = [];
  let worst: SafetyAction = "ALLOW";
  const rank: Record<SafetyAction, number> = { ALLOW: 0, CLARIFY: 1, SOFT_LIMIT: 2, STOP_AND_REFER: 3, EMERGENCY: 4 };

  // 1. Hinglish emergencies first (most specific, blocker-level)
  for (const h of HINGLISH_EMERGENCIES) {
    if (h.pattern.test(text)) {
      matched.push({ id: h.id, kind: "emergency_hinglish", severity: "blocker", message: h.message });
      worst = "EMERGENCY";
    }
  }
  // 2. Full registry
  for (const rf of RED_FLAGS) {
    if (worst === "EMERGENCY" && rf.action !== "EMERGENCY") continue; // emergency short-circuits lower classes
    if (rf.pattern.test(text)) {
      matched.push({ id: rf.id, kind: rf.kind, severity: rf.severity, message: rf.message });
      if (rank[rf.action as SafetyAction] > rank[worst]) worst = rf.action as SafetyAction;
    }
  }

  return {
    action: worst,
    matched,
    message: matched[0]?.message,
  };
}

/** Persist a safety event (fire-and-forget; never blocks the reply). */
export async function recordSafetyEvent(opts: {
  userId?: string | null;
  text: string;
  verdict: SafetyVerdict;
  surface: string;
}) {
  if (opts.verdict.action === "ALLOW" || !opts.verdict.matched.length) return;
  try {
    await db.diySafetyEvent.createMany({
      data: opts.verdict.matched.slice(0, 5).map((m) => ({
        userId: opts.userId ?? undefined,
        kind: m.kind,
        severity: m.severity,
        matchedPattern: m.id,
        sourceSnippet: opts.text.slice(0, 240),
        action: `${opts.verdict.action}:${opts.surface}`,
      })),
    });
  } catch {
    /* audit failures never break the user path */
  }
}

export const CONFIDENCE_ABSTAIN = 0.6;
export const CONFIDENCE_AUTOCONFIRM = 0.85;

/** Category classification from (possibly hinglish-normalized) text.
 *  Deterministic keyword scoring — no model needed for the common path. */
export function classifyCategory(normalizedText: string): { category: string; confidence: number } {
  const t = normalizedText.toLowerCase();
  const rules: [string, RegExp, number][] = [
    ["WEIGHT_LOSS", /weight\s*(?:loss|kam|reduce|lose|down)|slim|vajan\s*kam|motapa|obese|fat\s*(?:loss|jana)|patla\s*hon/i, 0.9],
    ["WEIGHT_GAIN", /weight\s*(?:gain|badha|increase|up)|vajan\s*badha|wajan\s+badh|healthy\s*weight\s*on/i, 0.9],
    ["SLEEP", /sleep|insomnia|neend|so\s*nahi|raat\s*bhar|stay\s*up|jaldi\s*so/i, 0.92],
    ["STRESS", /stress|tension|pareshan|burnout|pressure|kaam\s*ka\s*bojhi?| overwhelmed/i, 0.88],
    ["ANXIETY_MOOD", /anxi|anxious|panic|ghabrahat|chinta|mood|sad|udaas|depress(?!ion)/i, 0.85],
    ["SKIN_ACNE", /acne|pimple|breakout|chhaya|daane?\s*(?:pad|hai)|chehre\s*pe\s*daane/i, 0.93],
    ["SKIN_GENERAL", /skin|glow| complexion|dull\s*skin|dry\s*skin|tan\b/i, 0.85],
    ["HAIR_HEALTH", /hair|baal|jh?ad|bald|hairfall|hair\s*fall|dandruff|rusi/i, 0.9],
    ["FITNESS_STRENGTH", /strength|muscle|gym\s*jana|body\s*build|push\s*up|weight\s*training|strong\s*hon/i, 0.88],
    ["FITNESS_ENDURANCE", /stamina|endurance|running|jogging|marathon|cycling|cardio|dur\s*bhaag/i, 0.88],
    ["DIET_QUALITY", /diet|khana|food|eating\s*habits|nutrition|protein\s*khaa|sugar\s*kam\s*khan/i, 0.82],
    ["ENERGY", /energy|thakan|fatigue|tired|kamzori|listless|sust/i, 0.86],
    ["DIGESTION", /digest|kabz|constipat|acidity|gas\s*ban|bloat|pet\s*saaf|motion/i, 0.88],
    ["POSTURE_PAIN", /posture|back\s*pain|kamar|neck\s*pain|gardan|slouch|sitting\s*pain|kaandha/i, 0.87],
    ["HABITS_SCREEN", /screen|phone\s*kam|social\s*media|scroll|reels|mobile\s*addict|digital\s*detox/i, 0.9],
    ["SUBSTANCE_REDUCTION", /smok|cigarette|vape|tambak?ku|alcohol|sharab|drink\s*kam|nashe?/i, 0.92],
  ];
  let best: { category: string; confidence: number } = { category: "", confidence: 0 };
  for (const [category, re, conf] of rules) {
    if (re.test(t) && conf > best.confidence) best = { category, confidence: conf };
  }
  return best.category ? best : { category: "", confidence: 0 };
}

export function isEmergency(v: SafetyVerdict): boolean {
  return v.action === "EMERGENCY";
}
