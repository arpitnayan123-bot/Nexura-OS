import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { inspectStepUpToken } from "@/lib/nx/stepup";
import { audit } from "@/lib/nx/audit";
import { publish } from "@/lib/nx/bus";

/* ============================================================
   NEXURA OS v5 — E-PRESCRIPTION DIGITAL SIGNATURE (DPCO-aligned)
   Two-step verification: the PRESCRIBER signs (step-up: prescription.sign)
   AND a second clinical verifier countersigns (step-up: medication.verify)
   from their OWN session. Both tokens are bound to the same order id and
   must belong to different staff. Unsigned prescriptions cannot dispense.
   ============================================================ */

const SignSchema = z.object({
  orderId: z.string().min(4),
  prescriberToken: z.string().min(10),
  verifierToken: z.string().min(10),
  note: z.string().max(200).optional(),
});

export const POST = withRoute("prescriptions.sign", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "medication.dispense");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, SignSchema);
  if ("response" in body) return body.response;
  const d = body.data;

  const order = await db.hospitalOrder.findFirst({
    where: { id: d.orderId, hospitalId, orderType: "medication" },
  });
  if (!order) return fail("unknown_order", 404, undefined, requestId);

  // Verify BOTH step-up tokens server-side; tokens are bound to order id.
  const p = inspectStepUpToken(d.prescriberToken, "prescription.sign", d.orderId);
  if (!p.ok) return fail("prescriber_token_invalid", 401, `prescriber: ${p.reason}`, requestId);
  const v = inspectStepUpToken(d.verifierToken, "medication.verify", d.orderId);
  if (!v.ok) return fail("verifier_token_invalid", 401, `verifier: ${v.reason}`, requestId);

  // Decode the two token bodies to extract + compare user ids (signature already validated).
  const uid = (tok: string) => Buffer.from(tok.split(".")[0], "base64url").toString().split("|")[0];
  const prescriberId = uid(d.prescriberToken);
  const verifierId = uid(d.verifierToken);
  if (prescriberId === verifierId) {
    return fail(
      "two_person_required",
      422,
      "Prescriber and verifier must be two different staff members.",
      requestId,
    );
  }
  const [prescriber, verifier] = await Promise.all([
    db.nxStaffUser.findUnique({ where: { id: prescriberId } }),
    db.nxStaffUser.findUnique({ where: { id: verifierId } }),
  ]);
  if (!prescriber || !verifier) return fail("unknown_staff", 401, undefined, requestId);

  const signatureHash = `${Buffer.from(`${prescriberId}|${verifierId}|${d.orderId}|${Date.now()}`).toString("base64url")}`;
  await db.nxDocVersion.create({
    data: {
      hospitalId,
      entityType: "prescription",
      entityId: order.id,
      version: 1,
      changeKind: "sign",
      authorName: prescriber.name,
      authorRole: prescriber.role,
      content: JSON.stringify({
        orderId: order.id,
        patientUhid: order.patientUhid,
        orderDetails: JSON.parse(order.orderDetails || "{}"),
        prescriber: { id: prescriber.id, name: prescriber.name, staffCode: prescriber.staffCode },
        verifier: { id: verifier.id, name: verifier.name, staffCode: verifier.staffCode },
        signatureHash,
        note: d.note,
        regulation: "DPCO two-step prescription verification",
      }),
    },
  });
  await audit({
    hospitalId,
    actorName: prescriber.name,
    actorRole: prescriber.role,
    action: "prescription.signed",
    entityType: "hospital_order",
    entityId: order.id,
    patientId: order.patientId,
    detail: { verifier: verifier.staffCode, signatureHash },
  });
  publish({
    event: "prescription.signed",
    hospitalId,
    toRoles: ["pharmacist", "nurse"],
    data: { orderId: order.id, patientUhid: order.patientUhid },
  });
  return ok(
    { signed: true, signatureHash, prescriber: prescriber.name, verifier: verifier.name },
    { requestId },
  );
});

export const GET = withRoute("prescriptions.sign.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "medication.order.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const orderId = req.nextUrl.searchParams.get("orderId");
  const versions = await db.nxDocVersion.findMany({
    where: { hospitalId, entityType: "prescription", ...(orderId ? { entityId: orderId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return ok(
    versions.map((v) => ({ ...v, content: JSON.parse(v.content || "{}") })),
    { requestId },
  );
});
