import { NextRequest } from "next/server";
import { z } from "zod";
import { guard, ok, parseBody, withRoute } from "@/lib/nx/api";

/* Digital twin (chronic-care PoC): deterministic outcome projection.
   Inputs are the modifiable factors clinicians/patients recognize;
   outputs are RELATIVE trajectories over 5 years, not predictions of
   absolute events. Clearly labeled simulation — not clinical advice. */

const SimSchema = z.object({
  patientId: z.string().optional(),
  current: z.object({
    systolic: z.number().min(80).max(220),
    hba1c: z.number().min(3).max(18),
    smoker: z.boolean(),
    activityMinPerWeek: z.number().min(0).max(2000),
    bmi: z.number().min(12).max(70),
  }),
  scenarios: z.array(z.object({
    label: z.string().max(60),
    changes: z.object({
      systolicDelta: z.number().min(-40).max(40).optional(),
      hba1cDelta: z.number().min(-4).max(4).optional(),
      quitSmoking: z.boolean().optional(),
      activityMinPerWeek: z.number().min(0).max(2000).optional(),
      weightLossPct: z.number().min(0).max(40).optional(),
    }),
  })).max(4).optional(),
});

function riskScore(c: { systolic: number; hba1c: number; smoker: boolean; activityMinPerWeek: number; bmi: number }): number {
  let r = 0;
  r += Math.max(0, c.systolic - 120) * 0.02;          // per mmHg over 120
  r += Math.max(0, c.hba1c - 5.7) * 0.6;              // per HbA1c point over normal
  if (c.smoker) r += 1.2;
  r += Math.max(0, c.bmi - 23) * 0.05;                // per BMI unit over 23
  r += Math.max(0, (150 - c.activityMinPerWeek) / 150) * 0.5; // inactivity penalty
  return r; // relative composite (0..~6)
}

export const POST = withRoute("twin.simulate", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const body = await parseBody(req, SimSchema);
  if ("response" in body) return body.response;
  const base = riskScore(body.data.current);
  const years = [1, 3, 5];
  const trajectory = (r: number) => years.map((y) => ({ year: y, relativeRisk: Number((r * (1 + 0.08 * (y - 1))).toFixed(2)) }));
  const result = {
    baseline: { inputs: body.data.current, compositeRisk: Number(base.toFixed(2)), trajectory: trajectory(base) },
    scenarios: (body.data.scenarios ?? []).map((s) => {
      const c = {
        systolic: Math.min(220, Math.max(80, body.data.current.systolic + (s.changes.systolicDelta ?? 0))),
        hba1c: Math.min(18, Math.max(3, body.data.current.hba1c + (s.changes.hba1cDelta ?? 0))),
        smoker: s.changes.quitSmoking ? false : body.data.current.smoker,
        activityMinPerWeek: s.changes.activityMinPerWeek ?? body.data.current.activityMinPerWeek,
        bmi: body.data.current.bmi * (1 - (s.changes.weightLossPct ?? 0) / 100),
      };
      const r = riskScore(c);
      return { label: s.label, compositeRisk: Number(r.toFixed(2)), trajectory: trajectory(r), deltaVsBaseline: Number((r - base).toFixed(2)) };
    }),
    interpretation: {
      scale: "relative composite — lower is better; compare scenarios to each other, not to absolute event probabilities",
      modeledFactors: ["systolic BP", "HbA1c", "smoking", "activity", "BMI"],
      disclaimer: "Simulation for education and shared decision-making. Not a prediction, not a diagnosis.",
    },
  };
  return ok(result, { requestId });
});
