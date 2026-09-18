import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, withRoute } from "@/lib/nx/api";
import { NextResponse } from "next/server";
import { parseHl7, adtFromHl7, oruFromHl7, oruToHl7, adtToHl7 } from "@/lib/nx/hl7";
import { audit } from "@/lib/nx/audit";
import { publish as busPublish } from "@/lib/nx/bus";

/* HL7 v2 interface endpoint.
   POST { message: "MSH|..." } → ADT^A01/A08 upserts demographics; ORU^R01 appends lab results.
   GET  ?patientId=… → outbound ORU^R01 / ADT^A08 serialization for downstream engines. */

const InSchema = z.object({ message: z.string().min(10).max(120_000) });

export const POST = withRoute("hl7.inbound", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "labs.result.enter");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const bodyIn = await req.json().catch(() => null);
  const parsed = InSchema.safeParse(bodyIn);
  if (!parsed.success) return fail("invalid_request", 400, "body.message required", requestId);
  const m = parseHl7(parsed.data.message);
  if (!m.ok) return fail("hl7_parse_error", 400, m.error, requestId);

  if (m.msg.messageType.startsWith("ADT")) {
    const adt = adtFromHl7(m.msg);
    if (!adt.ok) return fail("hl7_parse_error", 400, adt.error, requestId);
    if (!adt.data.uhid) return fail("hl7_missing_uhid", 422, "PID-3 (MRN) required.", requestId);
    // Tenant-safe upsert: look up WITHIN this hospital only — a UHID belonging
    // to another hospital must never be readable or overwritable via ADT.
    const existing = await db.hospitalPatient.findFirst({
      where: { uhid: adt.data.uhid, hospitalId },
      select: { id: true },
    });
    if (!existing && adt.data.trigger === "A08") {
      return fail(
        "hl7_unknown_patient",
        422,
        `No patient with UHID ${adt.data.uhid} in this hospital.`,
        requestId,
      );
    }
    const patient = existing
      ? await db.hospitalPatient.update({
          where: { id: existing.id },
          data: {
            fullName: adt.data.patientName || undefined,
            gender: adt.data.sex === "F" ? "female" : adt.data.sex === "M" ? "male" : undefined,
          },
        })
      : await db.hospitalPatient
          .create({
            data: {
              hospitalId,
              uhid: adt.data.uhid,
              fullName: adt.data.patientName,
              gender: adt.data.sex === "F" ? "female" : adt.data.sex === "M" ? "male" : "other",
              dob: adt.data.dob
                ? `${adt.data.dob.slice(0, 4)}-${adt.data.dob.slice(4, 6)}-${adt.data.dob.slice(6, 8)}`
                : null,
            },
          })
          .catch((e: unknown) => {
            // UHID is globally unique — a collision means another hospital owns it.
            if (
              typeof e === "object" &&
              e &&
              "code" in e &&
              (e as { code?: string }).code === "P2002"
            )
              return null;
            throw e;
          });
    if (!patient)
      return fail(
        "hl7_uhid_conflict",
        409,
        "UHID already registered to another hospital.",
        requestId,
      );
    await audit({
      hospitalId,
      actorName: g.session.name,
      actorRole: g.session.role,
      action: `hl7.${adt.data.trigger.toLowerCase()}`,
      entityType: "patient",
      entityId: patient.id,
      detail: { controlId: adt.data.controlId },
    });
    busPublish({
      event: "hl7.adt",
      hospitalId,
      data: { uhid: adt.data.uhid, trigger: adt.data.trigger },
    });
    return ok(
      { accepted: true, kind: "ADT", trigger: adt.data.trigger, patientId: patient.id },
      { requestId },
    );
  }

  const oru = oruFromHl7(m.msg);
  if (!oru.ok) return fail("hl7_parse_error", 400, oru.error, requestId);
  const patient = await db.hospitalPatient.findUnique({ where: { uhid: oru.data.uhid } });
  if (!patient || patient.hospitalId !== hospitalId) {
    return fail(
      "hl7_unknown_patient",
      422,
      `No patient with UHID ${oru.data.uhid} in this hospital.`,
      requestId,
    );
  }
  const created: string[] = [];
  for (const r of oru.data.results) {
    let order = await db.hospitalOrder.findFirst({
      where: {
        patientId: patient.id,
        orderType: "lab",
        status: { in: ["ordered", "acknowledged", "in_progress"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!order) {
      order = await db.hospitalOrder.create({
        data: {
          hospitalId,
          patientUhid: patient.uhid,
          patientId: patient.id,
          orderType: "lab",
          orderDetails: JSON.stringify({
            items: [{ test: r.testName, source: "hl7-oru" }],
            hl7ControlId: oru.data.controlId,
          }),
        },
      });
    }
    const lr = await db.labResult.create({
      data: {
        orderId: order.id,
        testName: r.testName,
        resultValue: r.value,
        unit: r.unit,
        abnormalFlag: r.flag,
        reportedAt: new Date(),
        verificationStatus: "pending",
      },
    });
    created.push(lr.id);
    if (r.flag === "critical") {
      busPublish({
        event: "result.critical",
        hospitalId,
        data: { resultId: lr.id, testName: r.testName, patient: patient.fullName },
      });
    }
  }
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "hl7.oru",
    entityType: "lab_result",
    detail: { count: created.length },
  });
  busPublish({
    event: "hl7.oru",
    hospitalId,
    data: { uhid: oru.data.uhid, count: created.length },
  });
  return ok({ accepted: true, kind: "ORU", resultsCreated: created.length }, { requestId });
});

export const GET = withRoute("hl7.outbound", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const patientId = req.nextUrl.searchParams.get("patientId");
  const kind = req.nextUrl.searchParams.get("kind") ?? "oru";
  if (!patientId) return fail("missing_patient", 400, undefined, requestId);
  const patient = await db.hospitalPatient.findFirst({ where: { id: patientId, hospitalId } });
  if (!patient) return fail("not_found", 404, undefined, requestId);

  if (kind === "adt") {
    const admission = await db.hospitalAdmission.findFirst({
      where: { patientId },
      orderBy: { admissionDate: "desc" },
    });
    const body = adtToHl7({
      uhid: patient.uhid,
      fullName: patient.fullName,
      gender: patient.gender,
      dob: patient.dob,
      ward: admission ? `WARD` : "OPD",
    });
    return new NextResponse(body, {
      headers: { "content-type": "text/plain; charset=utf-8", "x-request-id": requestId },
    });
  }
  const orders = await db.hospitalOrder.findMany({
    where: { patientId, orderType: "lab" },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const results = await db.labResult.findMany({
    where: { orderId: { in: orders.map((o) => o.id) } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const body = oruToHl7({
    uhid: patient.uhid,
    results: results.map((r) => ({
      testName: r.testName,
      value: r.resultValue ?? "",
      unit: r.unit ?? undefined,
      flag: r.abnormalFlag as "normal" | "low" | "high" | "critical",
    })),
  });
  return new NextResponse(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "x-request-id": requestId },
  });
});
