import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withRoute } from "@/lib/nx/api";
import { authenticateApiKey, hasScope } from "@/lib/nx/gateway";

/* Tenant sandbox gateway — latest lab observations for a patient (scope: observations.read).
   GET /api/nx/gateway/v1/observations?patientId=xxx */

export const GET = withRoute("gateway.v1.observations", async (req: NextRequest, { requestId }) => {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return fail(auth.code, auth.status, auth.detail, requestId);
  if (!hasScope(auth.auth, "observations.read")) {
    return fail("scope_denied", 403, "Key lacks observations.read scope.", requestId);
  }
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return fail("missing_patient", 400, undefined, requestId);
  const patient = await db.hospitalPatient.findFirst({
    where: { id: patientId, hospitalId: { in: auth.auth.hospitalIds } },
    select: { id: true, uhid: true },
  });
  if (!patient) return fail("not_found", 404, "Patient not in tenant scope.", requestId);
  const orders = await db.hospitalOrder.findMany({
    where: { patientId, orderType: "lab" },
    select: { id: true },
    take: 50,
    orderBy: { createdAt: "desc" },
  });
  const results = await db.labResult.findMany({
    where: { orderId: { in: orders.map((o) => o.id) } },
    select: {
      id: true, testName: true, resultValue: true, unit: true, abnormalFlag: true,
      verificationStatus: true, reportedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ patient: { id: patient.id, uhid: patient.uhid }, observations: results, tenant: auth.auth.tenantCode }, { requestId });
});
