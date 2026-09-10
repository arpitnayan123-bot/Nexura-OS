import { db } from "@/lib/db";
import { publish } from "./bus";
import { log } from "@/lib/logger";

/* ============================================================
   NEXURA OS v5 — CRITICAL ALERT ESCALATION TREE
   Policies define timed levels: L0 (immediate) → L1 (after N min,
   on-call roles) → L2 (after M more, command/leadership).
   evaluateEscalation() records L0 at alert time; sweepEscalations()
   advances overdue events (called opportunistically by the
   escalations API and by system-status). Deterministic, never throws.
   ============================================================ */

export interface EscalationLevel {
  afterMin: number;
  notifyRoles: string[];
  notifyUsers?: string[];
  channel?: string;
}

export interface EscalationPolicySpec {
  alertType: string;
  levels: EscalationLevel[];
}

function parseLevels(raw: string): EscalationLevel[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Record the L0 escalation event for a fired alert and notify level-0 roles. */
export async function evaluateEscalation(hospitalId: string, alertType: string, entityRef: string): Promise<void> {
  try {
    const policy = await db.nxEscalationPolicy.findFirst({
      where: { hospitalId, alertType, active: true },
      orderBy: { createdAt: "desc" },
    });
    if (!policy) return;
    const levels = parseLevels(policy.levelsJson);
    const l0 = levels[0];
    if (!l0) return;
    await db.nxEscalationEvent.create({
      data: {
        hospitalId, policyId: policy.id, alertType, entityRef, level: 0,
        detailJson: JSON.stringify({ notifiedRoles: l0.notifyRoles }),
      },
    });
    publish({
      event: "escalation.new",
      hospitalId,
      toRoles: l0.notifyRoles,
      data: { alertType, entityRef, level: 0 },
    });
  } catch (err) {
    log.error("escalation", "evaluate", { err: err instanceof Error ? err.message : String(err) });
  }
}

/** Advance an escalation event to the next policy level (manual or sweep). */
export async function advanceEscalation(eventId: string, actorName: string): Promise<{ advanced: boolean; level?: number }> {
  const ev = await db.nxEscalationEvent.findUnique({ where: { id: eventId } });
  if (!ev) return { advanced: false };
  const policy = ev.policyId
    ? await db.nxEscalationPolicy.findUnique({ where: { id: ev.policyId } })
    : await db.nxEscalationPolicy.findFirst({ where: { hospitalId: ev.hospitalId, alertType: ev.alertType, active: true } });
  const levels = policy ? parseLevels(policy.levelsJson) : [];
  const nextLevel = ev.level + 1;
  const next = levels[nextLevel];
  if (!policy || !next) return { advanced: false, level: ev.level };
  await db.nxEscalationEvent.create({
    data: {
      hospitalId: ev.hospitalId, policyId: policy.id, alertType: ev.alertType,
      entityRef: ev.entityRef, level: nextLevel, actorName,
      detailJson: JSON.stringify({ notifiedRoles: next.notifyRoles, reason: "level advance" }),
    },
  });
  publish({
    event: "escalation.advanced",
    hospitalId: ev.hospitalId,
    toRoles: next.notifyRoles,
    data: { alertType: ev.alertType, entityRef: ev.entityRef, level: nextLevel },
  });
  return { advanced: true, level: nextLevel };
}

/** Advance every event whose time-in-level exceeds the next level's afterMin. */
export async function sweepEscalations(hospitalId: string): Promise<number> {
  try {
    const policies = await db.nxEscalationPolicy.findMany({ where: { hospitalId, active: true } });
    if (!policies.length) return 0;
    let advanced = 0;
    for (const policy of policies) {
      const levels = parseLevels(policy.levelsJson);
      const events = await db.nxEscalationEvent.findMany({
        where: { hospitalId, policyId: policy.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      // latest event per entityRef
      const latest = new Map<string, (typeof events)[number]>();
      for (const ev of events) if (!latest.has(ev.entityRef)) latest.set(ev.entityRef, ev);
      for (const ev of latest.values()) {
        const next = levels[ev.level + 1];
        if (!next) continue;
        const overdueMs = next.afterMin * 60_000;
        if (Date.now() - ev.createdAt.getTime() >= overdueMs) {
          const r = await advanceEscalation(ev.id, "escalation-sweep");
          if (r.advanced) advanced += 1;
        }
      }
    }
    return advanced;
  } catch {
    return 0;
  }
}
