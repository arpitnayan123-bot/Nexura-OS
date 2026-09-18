import { NextRequest } from "next/server";
import { guard, ok, requireHospitalContext, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { PROTOCOL_KB } from "@/modules/pi-engine/protocols/knowledge-base";

/* PieProtocol carries only a patientId scalar (no hospital relation), so the
   hospital boundary is enforced by joining HospitalPatient below: protocols
   whose patient sits outside the caller's hospital are filtered out entirely,
   and patient labels are resolved exclusively from that in-hospital map
   (previously the list was global and resolved cross-tenant names). */

const PLATFORM_ROLES = new Set(["super_admin", "org_admin"]);

/* GET /api/nx/predict/protocols — pending + recently decided protocols
   with patient labels, ready for the approval queue. */
export const GET = withRoute("pie.protocols.list", async (req: NextRequest) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  // Hospital boundary: the queue only ever shows this hospital's protocols.
  const hctx = await requireHospitalContext(g.session);
  if ("response" in hctx) return hctx.response;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const rows = await db.pieProtocol.findMany({
    where: status
      ? { status }
      : { status: { in: ["pending_approval", "approved", "executed", "rejected"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const patientIds = [...new Set(rows.map((r) => r.patientId))];
  const patients = await db.hospitalPatient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, hospitalId: true, fullName: true, uhid: true },
  });
  const byId = new Map(patients.map((p) => [p.id, p]));
  const isPlatform = PLATFORM_ROLES.has(g.session.role);
  return ok(
    {
      kbCodes: Object.keys(PROTOCOL_KB),
      protocols: rows
        // Tenant filter: platform-wide roles see all; every other session
        // only sees protocols whose patient is in their own hospital.
        .filter((r) => isPlatform || byId.get(r.patientId)?.hospitalId === hctx.hospitalId)
        .map((r) => ({
          ...r,
          immediate: JSON.parse(r.immediateJson || "[]"),
          monitoring: JSON.parse(r.monitoringJson || "[]"),
          patientName: byId.get(r.patientId)?.fullName ?? "unknown",
          patientUhid: byId.get(r.patientId)?.uhid ?? "?",
        })),
    },
    { requestId: g.requestId },
  );
});
