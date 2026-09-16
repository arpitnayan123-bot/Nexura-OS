import { NextRequest } from "next/server";
import { guard, ok, requireHospitalContext, withRoute } from "@/lib/nx/api";
import { runRadar } from "@/modules/pi-engine/engine";

/* GET /api/nx/predict/radar — Crisis Radar: all active patients
   sorted by Time-to-Decay with band, confidence and drivers. */
export const GET = withRoute("pie.radar", async (req: NextRequest) => {
  const g = await guard(req, "analytics.view");
  if ("response" in g) return g.response;
  // Hospital boundary: the radar renders the CALLER's hospital — the old
  // `db.hospital.findFirst()` always rendered whichever hospital sorted first.
  const hctx = await requireHospitalContext(g.session);
  if ("response" in hctx) return hctx.response;
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? "50");
  const rows = await runRadar(hctx.hospitalId, Math.min(200, Math.max(1, limit)));
  return ok({ rows, generatedAt: new Date().toISOString() }, { requestId: g.requestId });
});
