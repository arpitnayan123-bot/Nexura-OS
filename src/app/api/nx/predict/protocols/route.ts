import { NextRequest } from "next/server";
import { guard, ok, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { PROTOCOL_KB } from "@/modules/pi-engine/protocols/knowledge-base";

/* GET /api/nx/predict/protocols — pending + recently decided protocols
   with patient labels, ready for the approval queue. */
export const GET = withRoute("pie.protocols.list", async (req: NextRequest) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const rows = await db.pieProtocol.findMany({
    where: status ? { status } : { status: { in: ["pending_approval", "approved", "executed", "rejected"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const patientIds = [...new Set(rows.map((r) => r.patientId))];
  const patients = await db.hospitalPatient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, fullName: true, uhid: true },
  });
  const byId = new Map(patients.map((p) => [p.id, p]));
  return ok(
    {
      kbCodes: Object.keys(PROTOCOL_KB),
      protocols: rows.map((r) => ({
        ...r,
        immediate: JSON.parse(r.immediateJson || "[]"),
        monitoring: JSON.parse(r.monitoringJson || "[]"),
        patientName: byId.get(r.patientId)?.fullName ?? "unknown",
        patientUhid: byId.get(r.patientId)?.uhid ?? "?",
      })),
    },
    { requestId: g.requestId }
  );
});
