import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, fail, withRoute } from "@/lib/nx/api";
import { parseSteps } from "@/lib/nx/pathway";
import { ciFilter } from "@/lib/nx/db-dialect";

/* Personalized care journey: predicted pathway nodes layered onto the
   visual timeline. Deterministic projection from active pathway + historical
   length-of-stay for the same diagnosis; teams can add custom nodes. */

export const GET = withRoute("journey.predicted", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return fail("missing_patient", 400, undefined, requestId);
  const patient = await db.hospitalPatient.findFirst({ where: { id: patientId, hospitalId } });
  if (!patient) return fail("not_found", 404, undefined, requestId);
  const admission = await db.hospitalAdmission.findFirst({
    where: { patientId, dischargeStatus: "active" },
    orderBy: { admissionDate: "desc" },
  });
  // historical LOS for same diagnosis text (rough match), median of last 10
  let projectedLosDays: number | null = null;
  if (admission?.admissionDiagnosis) {
    const sameDx = await db.hospitalAdmission.findMany({
      where: {
        hospitalId,
        admissionDiagnosis: ciFilter(admission.admissionDiagnosis.split(" ")[0]),
        actualDischargeDate: { not: null },
      },
      select: { admissionDate: true, actualDischargeDate: true },
      orderBy: { admissionDate: "desc" },
      take: 10,
    });
    const los = sameDx
      .map((a) => ((a.actualDischargeDate?.getTime() ?? 0) - a.admissionDate.getTime()) / 86400_000)
      .filter((d) => d > 0)
      .sort((a, b) => a - b);
    if (los.length) projectedLosDays = Number(los[Math.floor(los.length / 2)].toFixed(1));
  }
  const runs = await db.nxPathwayRun.findMany({
    where: { hospitalId, patientId, status: { in: ["active", "escalated"] } },
    orderBy: { startedAt: "desc" },
  });
  const predictedNodes: Record<string, unknown>[] = [];
  for (const run of runs) {
    const def = await db.nxPathwayDef.findUnique({ where: { id: run.defId } });
    if (!def) continue;
    const steps = parseSteps(def.stepsJson);
    const state = JSON.parse(run.stateJson || "{}") as { completed?: string[] };
    for (const s of steps) {
      if (state.completed?.includes(s.id)) continue;
      predictedNodes.push({
        kind: "pathway_step",
        pathway: def.name,
        stepId: s.id,
        title: s.title,
        withinMin: s.withinMin,
        critical: Boolean(s.critical),
        ownerRole: s.ownerRole,
      });
    }
  }
  if (projectedLosDays && admission) {
    const dischargeEta = new Date(admission.admissionDate.getTime() + projectedLosDays * 86400_000);
    predictedNodes.push({
      kind: "projected_discharge",
      title: "Projected discharge window",
      eta: dischargeEta.toISOString(),
      basedOn: `median LOS ${projectedLosDays}d for similar admissions`,
    });
  }
  const annotations = await db.nxJourneyAnnotation.count({
    where: { hospitalId, patientId, decisionLog: true },
  });
  return ok(
    {
      patient: { id: patient.id, name: patient.fullName, uhid: patient.uhid },
      activeAdmission: admission
        ? {
            id: admission.id,
            diagnosis: admission.admissionDiagnosis,
            since: admission.admissionDate,
          }
        : null,
      predictedNodes,
      decisionLogEntries: annotations,
      note: "Predicted nodes are coordination aids for care teams — clinicians can add custom nodes (therapies, home visits, community interventions).",
    },
    { requestId },
  );
});
