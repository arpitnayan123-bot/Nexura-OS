import "server-only";
import { db } from "@/lib/db";

/* ============================================================
   NEXURA PHI — AUDIT SERVICE
   Append-only audit trail for every health-data read/write and
   every engine execution. METADATA MUST NEVER CONTAIN PHI:
   no symptom text, no vital values, no free-text echoes. Only
   field names, bucket names, rule ids, and counts.
   ============================================================ */

import type { AuditService } from "./contracts";

type AuditMeta = Record<string, string | number | boolean | null>;

/** Guard: strips any key that looks like it might carry PHI payload keys. */
const FORBIDDEN_META_KEYS = new Set([
  "text",
  "wording",
  "message",
  "payload",
  "body",
  "value",
  "result",
  "note",
  "notes",
  "userWording",
  "symptom",
]);

function sanitizeMeta(meta: AuditMeta | undefined): AuditMeta {
  if (!meta) return {};
  const clean: AuditMeta = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_META_KEYS.has(k)) continue;
    if (typeof v === "string" && v.length > 120) continue; // long strings may embed PHI
    clean[k] = v;
  }
  return clean;
}

export const phiAudit: AuditService = {
  async record(event) {
    try {
      await db.phiAuditEvent.create({
        data: {
          subjectId: event.subjectId,
          action: event.action,
          resource: event.resource,
          outcome: event.outcome,
          meta: JSON.stringify(sanitizeMeta(event.meta)),
        },
      });
    } catch {
      // Audit must never break the request path; failures are swallowed
      // here but visible via DB monitoring. Never log event content.
    }
  },
};

export async function getAuditTrail(subjectId: string, limit = 50) {
  return db.phiAuditEvent.findMany({
    where: { subjectId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, action: true, resource: true, outcome: true, meta: true, createdAt: true },
  });
}
