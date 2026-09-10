import { NextRequest } from "next/server";
import { guard, ok, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { runRadar } from "@/modules/pi-engine/engine";

/* GET /api/nx/predict/radar — Crisis Radar: all active patients
   sorted by Time-to-Decay with band, confidence and drivers. */
export const GET = withRoute("pie.radar", async (req: NextRequest) => {
  const g = await guard(req, "analytics.view");
  if ("response" in g) return g.response;
  const hospital = await db.hospital.findFirst({ select: { id: true } });
  if (!hospital) return ok({ rows: [], generatedAt: new Date().toISOString() }, { requestId: g.requestId });
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? "50");
  const rows = await runRadar(hospital.id, Math.min(200, Math.max(1, limit)));
  return ok({ rows, generatedAt: new Date().toISOString() }, { requestId: g.requestId });
});
