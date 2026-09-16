import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { appendEvent } from "@/lib/nx/eventlog";
import { hasPermission, type NxPermission } from "@/lib/nx/session";
import { patientInScope } from "@/lib/nx/patient-scope";

/* Offline write-buffer flush (PWA companion).
   The client queues triage captures / prescription drafts in IndexedDB while
   offline and POSTs them here on reconnect. Each op is idempotent by clientId
   (NxIdempotency) and lands as a REVIEWABLE draft — never silently final. */

const OpSchema = z.object({
  clientId: z.string().min(6).max(60),
  type: z.enum(["triage", "prescription_draft", "note_draft"]),
  capturedAt: z.string().datetime(),
  patientUhid: z.string().max(40).optional(),
  payload: z.record(z.string(), z.unknown()),
});

const SyncSchema = z.object({ ops: z.array(OpSchema).min(1).max(50) });

export const POST = withRoute("offline.sync", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, SyncSchema);
  if ("response" in body) return body.response;
  const receipts: { clientId: string; status: string; refId?: string; reason?: string }[] = [];
  // Write boundary: this flush route is gated by a READ permission, so every
  // op carries its own WRITE check — task-creating ops need tasks.manage,
  // doc-version ops need note.edit — and any patient referenced by UHID must
  // resolve inside the caller's hospital AND pass patientInScope. Failures
  // are per-op (rejected receipt); authenticated staff in DEMO_MODE pass both.
  for (const op of body.data.ops) {
    // idempotent replay protection via NxIdempotency
    const existing = await db.nxIdempotency.findUnique({ where: { key: `offline:${op.clientId}` } });
    if (existing) {
      receipts.push({ clientId: op.clientId, status: "duplicate_ignored", refId: existing.endpoint });
      continue;
    }
    const requiredPermission: NxPermission = op.type === "triage" ? "tasks.manage" : "note.edit";
    if (!hasPermission(g.perms, requiredPermission)) {
      receipts.push({ clientId: op.clientId, status: "rejected", reason: `missing_permission:${requiredPermission}` });
      continue;
    }
    if (op.patientUhid) {
      const patient = await db.hospitalPatient
        .findFirst({ where: { hospitalId, uhid: op.patientUhid }, select: { id: true } })
        .catch(() => null);
      if (!patient || !(await patientInScope(patient.id, g.session))) {
        receipts.push({ clientId: op.clientId, status: "rejected", reason: "patient_out_of_scope" });
        continue;
      }
    }
    let refId: string | undefined;
    let status = "accepted";
    if (op.type === "triage") {
      const task = await db.nxTask.create({
        data: {
          hospitalId,
          title: `Offline triage capture — ${op.patientUhid ?? "unknown patient"}`,
          type: "task", priority: "high", ownerRole: "doctor",
          sourceModule: "offline", relatedId: op.clientId,
          reason: "Captured offline; verify patient identity on arrival",
          detail: JSON.stringify(op.payload).slice(0, 2000),
        },
      }).catch(() => null);
      refId = task?.id; status = task ? "accepted" : "failed";
    } else {
      const doc = await db.nxDocVersion.create({
        data: {
          hospitalId, entityType: op.type === "prescription_draft" ? "care_plan" : "sbar",
          entityId: op.clientId, version: 1, changeKind: "create",
          authorName: g.session.name, authorRole: g.session.role,
          content: JSON.stringify(op.payload).slice(0, 8000),
          trackedJson: JSON.stringify([{ field: "capturedAt", from: "offline", to: op.capturedAt }]),
        },
      }).catch(() => null);
      refId = doc?.id; status = doc ? "accepted" : "failed";
    }
    if (status === "accepted") {
      await db.nxIdempotency.create({
        data: { key: `offline:${op.clientId}`, endpoint: refId ?? op.type, requestHash: op.clientId, expiresAt: new Date(Date.now() + 7 * 86400_000) },
      }).catch(() => {});
      await appendEvent(hospitalId, "offline_sync", op.clientId, `offline.${op.type}`, { uhid: op.patientUhid }, g.session.name);
    }
    receipts.push({ clientId: op.clientId, status, refId, reason: status === "failed" ? "write error" : undefined });
  }
  return ok({ receipts, acceptedCount: receipts.filter((r) => r.status === "accepted").length }, { requestId });
});
