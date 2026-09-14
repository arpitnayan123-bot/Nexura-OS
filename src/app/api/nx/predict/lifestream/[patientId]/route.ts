import { NextRequest } from "next/server";
import { guard, ok, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { patientInScope } from "@/lib/nx/patient-scope";

/* GET /api/nx/predict/lifestream/[patientId] — the unified Patient
   Life Stream: vitals, labs, meds, notes, bio-signals, SDoH and
   behavioral events on one clean timeline. */
export const GET = withRoute<{ patientId: string }>(
  "pie.lifestream",
  async (req: NextRequest, ctx) => {
    const g = await guard(req, "patient.clinical.view");
    if ("response" in g) return g.response;
    const { patientId } = await ctx.params;
    if (!(await patientInScope(patientId, g.session))) {
      return ok({ error: "patient_not_found" }, { requestId: g.requestId, status: 404 });
    }
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [events, bios] = await Promise.all([
      db.pieLifeStreamEvent.findMany({ where: { patientId, ts: { gte: since } }, orderBy: { ts: "desc" }, take: 200 }),
      db.pieBioSignal.findMany({ where: { patientId, capturedAt: { gte: since } }, orderBy: { capturedAt: "desc" }, take: 300 }),
    ]);
    const stream = [
      ...events.map((e) => ({
        source: e.source, kind: e.kind, title: e.title, value: e.value, unit: e.unit,
        severity: e.severity, outlier: e.outlier, ts: e.ts.toISOString(),
      })),
      ...bios.map((b) => ({
        source: "bio", kind: "signal", title: b.metric, value: b.value, unit: b.unit,
        severity: null, outlier: false, ts: b.capturedAt.toISOString(),
      })),
    ].sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return ok({ count: stream.length, stream }, { requestId: g.requestId });
  }
);
