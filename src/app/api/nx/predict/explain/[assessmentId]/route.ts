import { NextRequest } from "next/server";
import { guard, ok, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { explain, attributionBars } from "@/modules/pi-engine/governance/explain";
import { patientInScope } from "@/lib/nx/patient-scope";

/* GET /api/nx/predict/explain/[assessmentId] — the "Why" button.
   Returns the human explanation + normalized attribution bars for
   any PIE assessment. No black boxes. */
export const GET = withRoute<{ assessmentId: string }>(
  "pie.explain",
  async (req: NextRequest, ctx) => {
    const g = await guard(req, "patient.clinical.view");
    if ("response" in g) return g.response;
    const { assessmentId } = await ctx.params;
    const a = await db.pieRiskAssessment.findUnique({ where: { id: assessmentId } });
    if (!a) return ok({ error: "not_found" }, { requestId: g.requestId, status: 404 });
    if (!(await patientInScope(a.patientId, g.session))) {
      return ok({ error: "not_found" }, { requestId: g.requestId, status: 404 });
    }
    const patient = await db.hospitalPatient.findUnique({
      where: { id: a.patientId },
      select: { fullName: true },
    });
    const drivers = JSON.parse(a.driversJson || "[]") as Parameters<typeof explain>[0]["drivers"];
    const assessment = {
      patientId: a.patientId,
      domain: a.domain as Parameters<typeof explain>[0]["domain"],
      score: a.score,
      band: a.band as "green" | "yellow" | "red",
      confidence: a.confidence,
      horizonHours: a.horizonHours,
      drivers,
      modelVersion: a.modelVersion,
      uncertain: a.uncertain,
      rationale: "",
    };
    return ok(
      {
        explanation: explain(assessment, patient?.fullName ?? "patient"),
        attribution: attributionBars(drivers),
      },
      { requestId: g.requestId },
    );
  },
);
