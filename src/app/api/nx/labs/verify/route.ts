import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { fail, guard, ok, withRoute } from "@/lib/nx/api";
import { publish } from "@/lib/nx/bus";
import { hasPermission } from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   LAB RESULT VERIFICATION + CRITICAL RESULT ESCALATION
   PATCH — verify / reject a result (needs labs.result.verify).
   Critical results notify the ordering clinician + command center
   and stamp criticalNotifiedAt. Full audit on every action.
   ============================================================ */

const VerifySchema = z.object({
  resultId: z.string().min(3),
  action: z.enum(["verify", "reject", "notify_critical"]),
  note: z.string().max(500).optional(),
});

export const PATCH = withRoute("labs.verify", async (req: NextRequest) => {
  const g = await guard(req, "labs.result.verify");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = VerifySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);

  const result = await db.labResult.findUnique({
    where: { id: parsed.data.resultId },
    include: {
      order: {
        include: { doctor: true, patient: { select: { id: true, fullName: true, uhid: true } } },
      },
    },
  });
  if (!result) return fail("not_found", 404, "Result not found.");
  if (result.order.hospitalId !== hospitalId)
    return fail("forbidden", 403, "Cross-hospital access denied.");

  if (parsed.data.action === "verify") {
    const updated = await db.labResult.update({
      where: { id: result.id },
      data: { verificationStatus: "verified", verifiedByStaffId: null, verifiedAt: new Date() },
    });
    await audit({
      hospitalId,
      actorName: g.session.name,
      actorRole: g.session.role,
      action: "lab.result.verified",
      entityType: "lab_result",
      entityId: result.id,
      patientId: result.order.patientId,
      detail: { test: result.testName },
    });
    return NextResponse.json({ data: { result: updated } });
  }

  if (parsed.data.action === "reject") {
    const updated = await db.labResult.update({
      where: { id: result.id },
      data: { verificationStatus: "rejected", verifiedAt: null },
    });
    await audit({
      hospitalId,
      actorName: g.session.name,
      actorRole: g.session.role,
      action: "lab.result.rejected",
      entityType: "lab_result",
      entityId: result.id,
      patientId: result.order.patientId,
      detail: { note: parsed.data.note },
    });
    return NextResponse.json({ data: { result: updated } });
  }

  // notify_critical — flag + notify ordering doctor + command + create critical task
  if (result.abnormalFlag !== "critical") {
    return fail("invalid_request", 422, "Only results flagged critical can be escalated.");
  }
  const updated = await db.labResult.update({
    where: { id: result.id },
    data: { criticalNotifiedAt: new Date() },
  });
  const doctor = result.order.doctor;
  await db.nxNotification.create({
    data: {
      hospitalId,
      title: `CRITICAL: ${result.testName} — ${result.order.patient.fullName}`,
      body: `${result.testName} = ${result.resultValue ?? result.resultText ?? "?"} (ref ${result.refRangeMin ?? "—"}–${result.refRangeMax ?? "—"}). Immediate review required.`,
      level: "critical",
      category: "lab",
      link: `patient:${result.order.patientId}`,
      patientId: result.order.patientId,
      ...(doctor?.id
        ? await (async () => {
            const staffUser = await db.nxStaffUser.findFirst({
              where: { hospitalId, name: doctor.name },
              select: { id: true },
            });
            return staffUser ? { userId: staffUser.id } : { roleKey: "doctor" };
          })()
        : { roleKey: "doctor" }),
    },
  });
  await db.nxNotification.create({
    data: {
      hospitalId,
      roleKey: "command",
      title: `Critical result escalated: ${result.testName}`,
      body: `Patient ${result.order.patient.fullName} (${result.order.patient.uhid})`,
      level: "critical",
      category: "lab",
      link: `patient:${result.order.patientId}`,
      patientId: result.order.patientId,
    },
  });
  await db.nxTask.create({
    data: {
      hospitalId,
      title: `Review critical ${result.testName} — ${result.order.patient.fullName}`,
      type: "result",
      priority: "critical",
      status: "new",
      ownerRole: "doctor",
      patientId: result.order.patientId,
      patientName: result.order.patient.fullName,
      patientUhid: result.order.patient.uhid,
      sourceModule: "lab",
      relatedId: result.orderId,
      reason: "critical lab result",
      slaMinutes: 30,
    },
  });
  publish({
    event: "lab.critical",
    hospitalId,
    toRoles: ["doctor", "nurse", "command", "lab_tech", "admin", "hospital_admin"],
    data: { resultId: result.id, test: result.testName, patient: result.order.patient.fullName },
  });
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "lab.critical.notified",
    entityType: "lab_result",
    entityId: result.id,
    patientId: result.order.patientId,
  });
  return NextResponse.json({ data: { result: updated, notified: true } });
});

/* GET — result audit history */
export const GET = withRoute("labs.history", async (req: NextRequest) => {
  const g = await guard(req, "labs.result.enter");
  if ("response" in g) return g.response;
  const resultId = req.nextUrl.searchParams.get("resultId");
  if (!resultId) return fail("invalid_request", 400, "resultId required.");
  const history = await db.nxAuditEvent.findMany({
    where: { entityType: "lab_result", entityId: resultId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { actorName: true, actorRole: true, action: true, detail: true, createdAt: true },
  });
  return ok({ history });
});
void hasPermission;
