import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, paginate, pageMeta, withRoute } from "@/lib/nx/api";
import { authenticateApiKey, hasScope } from "@/lib/nx/gateway";
import { ciFilter } from "@/lib/nx/db-dialect";

/* Tenant sandbox gateway — scoped partner read access to patients.
   Auth: Authorization: Bearer nxk_live_... (scope: patients.read) */

export const GET = withRoute("gateway.v1.patients", async (req: NextRequest, { requestId }) => {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return fail(auth.code, auth.status, auth.detail, requestId);
  if (!hasScope(auth.auth, "patients.read")) {
    return fail("scope_denied", 403, "Key lacks patients.read scope.", requestId);
  }
  const p = paginate(req, { perPage: 25, maxPerPage: 100 });
  const where = {
    hospitalId: { in: auth.auth.hospitalIds },
    ...(p.q
      ? {
          OR: [{ fullName: ciFilter(p.q) }, { uhid: ciFilter(p.q) }],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.hospitalPatient.findMany({
      where,
      select: {
        id: true,
        uhid: true,
        fullName: true,
        gender: true,
        dob: true,
        bloodGroup: true,
        state: true,
        insuranceProvider: true,
        hospitalId: true,
        createdAt: true,
      },
      skip: p.skip,
      take: p.take,
      orderBy: { createdAt: "desc" },
    }),
    db.hospitalPatient.count({ where }),
  ]);
  return ok(
    { patients: rows, tenant: auth.auth.tenantCode },
    { requestId, headers: { "x-page-meta": JSON.stringify(pageMeta(p, total)) } },
  );
});
