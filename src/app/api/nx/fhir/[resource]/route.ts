import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, fail, withRoute } from "@/lib/nx/api";
import {
  patientToFHIR,
  encounterToFHIR,
  observationToFHIR,
  medicationRequestToFHIR,
  capabilityStatement,
  bundleOf,
} from "@/lib/nx/fhir";

/* FHIR R4 read API (session-authenticated staff access).
   GET /api/nx/fhir/metadata          → CapabilityStatement
   GET /api/nx/fhir/Patient           → search (identifier=UHID | name=substring)
   GET /api/nx/fhir/Patient?_id=      → read by id
   GET /api/nx/fhir/Encounter?patient=
   GET /api/nx/fhir/Observation?patient=
   GET /api/nx/fhir/MedicationRequest?patient= */

const FHIR_RESOURCES = new Set(["Patient", "Encounter", "Observation", "MedicationRequest"]);

export const GET = withRoute("fhir.get", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId)
    return fail("no_hospital_context", 403, "Session has no hospital scope.", requestId);
  const resource = req.nextUrl.pathname.split("/").pop() || "";
  const sp = req.nextUrl.searchParams;

  if (resource === "metadata") {
    return ok(capabilityStatement(req.nextUrl.origin), { requestId });
  }
  if (!FHIR_RESOURCES.has(resource)) {
    return fail(
      "unsupported_resource",
      404,
      `Supported: ${[...FHIR_RESOURCES].join(", ")}, metadata.`,
      requestId,
    );
  }

  if (resource === "Patient") {
    const id = sp.get("_id");
    const identifier = sp.get("identifier");
    const name = sp.get("name");
    if (id) {
      const p = await db.hospitalPatient.findFirst({ where: { id, hospitalId } });
      if (!p) return fail("not_found", 404, undefined, requestId);
      return ok(patientToFHIR(p), { requestId });
    }
    const rows = await db.hospitalPatient.findMany({
      where: {
        hospitalId,
        ...(identifier ? { uhid: identifier } : {}),
        ...(name ? { fullName: { contains: name, mode: "insensitive" as const } } : {}),
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    return ok(bundleOf("searchset", rows.map(patientToFHIR)), { requestId });
  }

  const patientId = sp.get("patient");
  const patientScope = patientId
    ? { patientId, patient: { hospitalId } }
    : { patient: { hospitalId } };

  if (resource === "Encounter") {
    const rows = await db.hospitalAdmission.findMany({
      where: patientScope.patientId
        ? { patientId: patientScope.patientId, hospitalId }
        : { hospitalId },
      take: 50,
      orderBy: { admissionDate: "desc" },
    });
    return ok(
      bundleOf(
        "searchset",
        rows.map((a) =>
          encounterToFHIR({
            id: a.id,
            patientId: a.patientId,
            admissionDate: a.admissionDate,
            actualDischargeDate: a.actualDischargeDate,
            admissionType: a.admissionType,
            admissionDiagnosis: a.admissionDiagnosis,
            status: a.dischargeStatus,
          }),
        ),
      ),
      { requestId },
    );
  }

  if (resource === "Observation") {
    const orders = await db.hospitalOrder.findMany({
      where: patientScope.patientId
        ? { patientId: patientScope.patientId, hospitalId, orderType: "lab" }
        : { hospitalId, orderType: "lab" },
      select: { id: true, patientId: true },
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    const byPatient = new Map(orders.map((o) => [o.id, o.patientId]));
    const results = await db.labResult.findMany({
      where: { orderId: { in: orders.map((o) => o.id) } },
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    return ok(
      bundleOf(
        "searchset",
        results.map((r) =>
          observationToFHIR({
            id: r.id,
            patientId: byPatient.get(r.orderId) ?? "unknown",
            testName: r.testName,
            resultValue: r.resultValue,
            unit: r.unit,
            abnormalFlag: r.abnormalFlag,
            reportedAt: r.reportedAt,
            refRangeMin: r.refRangeMin,
            refRangeMax: r.refRangeMax,
          }),
        ),
      ),
      { requestId },
    );
  }

  // MedicationRequest
  const medOrders = await db.hospitalOrder.findMany({
    where: patientScope.patientId
      ? { patientId: patientScope.patientId, hospitalId, orderType: "medication" }
      : { hospitalId, orderType: "medication" },
    take: 50,
    orderBy: { createdAt: "desc" },
  });
  return ok(bundleOf("searchset", medOrders.map(medicationRequestToFHIR)), { requestId });
});
