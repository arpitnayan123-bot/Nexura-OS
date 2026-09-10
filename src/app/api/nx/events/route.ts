import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, fail, withRoute } from "@/lib/nx/api";

/* Event log (CQRS-lite) query API: replay any aggregate's stream. */
export const GET = withRoute("events.stream", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "audit.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const aggregateType = req.nextUrl.searchParams.get("aggregateType");
  const aggregateId = req.nextUrl.searchParams.get("aggregateId");
  if (!aggregateType || !aggregateId) return fail("missing_aggregate", 400, "aggregateType + aggregateId required", requestId);
  const events = await db.nxEventLog.findMany({
    where: { hospitalId, aggregateType, aggregateId },
    orderBy: { seq: "asc" },
    take: 200,
  });
  return ok({ aggregateType, aggregateId, count: events.length, events }, { requestId });
});
