import { NextRequest } from "next/server";
import { guard, ok, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { runPatientCycle } from "@/modules/pi-engine/engine";
import { patientInScope } from "@/lib/nx/patient-scope";

/* GET /api/nx/predict/risk/[patientId] — run a full PIE cycle for the
   patient (twin refresh → stratification → protocol decision) and
   return the composite assessment, domain breakdown and drivers. */
export const GET = withRoute<{ patientId: string }>(
  "pie.risk",
  async (req: NextRequest, ctx) => {
    const g = await guard(req, "patient.clinical.view");
    if ("response" in g) return g.response;
    const { patientId } = await ctx.params;
    if (!(await patientInScope(patientId, g.session))) {
      return ok({ error: "patient_not_found" }, { requestId: g.requestId, status: 404 });
    }
    const cycle = await runPatientCycle(patientId);
    if (!cycle) return ok({ error: "patient_not_found" }, { requestId: g.requestId, status: 404 });
    return ok(
      {
        composite: cycle.composite,
        domains: cycle.domains,
        twinUpdatedAt: cycle.twin.updatedAt,
        adherence: cycle.twin.adherenceScore,
        protocol: cycle.protocolDecision.action,
        protocolId: cycle.protocolId,
      },
      { requestId: g.requestId }
    );
  }
);
