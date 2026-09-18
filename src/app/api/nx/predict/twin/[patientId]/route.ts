import { NextRequest } from "next/server";
import { z } from "zod";
import { guard, ok, parseBody, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { buildTwinState } from "@/modules/pi-engine/db";
import { computeBaseline } from "@/modules/pi-engine/twin/digital-twin";
import {
  INTERVENTION_CATALOG,
  simulateIntervention,
} from "@/modules/pi-engine/twin/counterfactual";
import { patientInScope } from "@/lib/nx/patient-scope";

/* GET /api/nx/predict/twin/[patientId] — the Living Twin: current state
   vector + physics baseline + intervention catalog.
   POST — counterfactual simulation: run a what-if on the twin. */

const SimSchema = z.object({
  interventionIds: z.array(z.string().max(40)).min(1).max(4),
});

export const GET = withRoute<{ patientId: string }>(
  "pie.twin.get",
  async (req: NextRequest, ctx) => {
    const g = await guard(req, "patient.clinical.view");
    if ("response" in g) return g.response;
    const { patientId } = await ctx.params;
    if (!(await patientInScope(patientId, g.session))) {
      return ok({ error: "patient_not_found" }, { requestId: g.requestId, status: 404 });
    }
    const state = await buildTwinState(patientId);
    if (!state) return ok({ error: "patient_not_found" }, { requestId: g.requestId, status: 404 });
    const baseline = computeBaseline(state);
    return ok({ state, baseline, catalog: INTERVENTION_CATALOG }, { requestId: g.requestId });
  },
);

export const POST = withRoute<{ patientId: string }>(
  "pie.twin.simulate",
  async (req: NextRequest, ctx) => {
    const g = await guard(req, "patient.clinical.view");
    if ("response" in g) return g.response;
    const { patientId } = await ctx.params;
    if (!(await patientInScope(patientId, g.session))) {
      return ok({ error: "patient_not_found" }, { requestId: g.requestId, status: 404 });
    }
    const body = await parseBody(req, SimSchema);
    if ("response" in body) return body.response;
    const state = await buildTwinState(patientId);
    if (!state) return ok({ error: "patient_not_found" }, { requestId: g.requestId, status: 404 });
    const outcomes = body.data.interventionIds
      .map((id) => INTERVENTION_CATALOG.find((i) => i.id === id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i))
      .map((i) => simulateIntervention(state, i));
    return ok({ outcomes }, { requestId: g.requestId });
  },
);
