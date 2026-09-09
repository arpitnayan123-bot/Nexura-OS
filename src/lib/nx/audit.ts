import { db } from "@/lib/db";
import crypto from "crypto";

/* ============================================================
   NEXURA OS — tamper-evident audit trail
   Each event stores the hash of the previous event, forming a
   verification chain. Any retroactive edit breaks the chain.
   ============================================================ */

function eventHash(payload: {
  prevHash?: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  patientId?: string | null;
  detail?: string | null;
  at: Date;
}): string {
  return crypto
    .createHash("sha256")
    .update(
      [
        payload.prevHash || "",
        payload.actorName,
        payload.actorRole,
        payload.action,
        payload.entityType,
        payload.entityId || "",
        payload.patientId || "",
        payload.detail || "",
        payload.at.toISOString(),
      ].join("|")
    )
    .digest("hex");
}

export async function audit(input: {
  hospitalId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  patientId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const last = await db.nxAuditEvent.findFirst({
      where: { hospitalId: input.hospitalId },
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });
    const at = new Date();
    const detail = input.detail ? JSON.stringify(input.detail) : null;
    const hash = eventHash({
      prevHash: last?.hash,
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      patientId: input.patientId,
      detail,
      at,
    });
    await db.nxAuditEvent.create({
      data: {
        hospitalId: input.hospitalId,
        actorName: input.actorName,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        patientId: input.patientId,
        detail,
        prevHash: last?.hash,
        hash,
        createdAt: at,
      },
    });
  } catch (err) {
    console.error("[nx-audit] failed to record event", err);
  }
}
