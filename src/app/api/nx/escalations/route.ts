import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { sweepEscalations, advanceEscalation } from "@/lib/nx/escalation";
import { publish } from "@/lib/nx/bus";

/* Escalation tree: policies + events.
   GET  → policies, recent events (runs an overdue sweep opportunistically)
   POST → { intent: "upsert_policy" | "advance" } */

const PolicySchema = z.object({
  intent: z.literal("upsert_policy"),
  id: z.string().optional(),
  alertType: z.string().min(2).max(60),
  levels: z.array(z.object({
    afterMin: z.number().int().min(0).max(720),
    notifyRoles: z.array(z.string().max(30)).min(1).max(6),
    notifyUsers: z.array(z.string()).max(10).optional(),
    channel: z.string().max(40).optional(),
  })).min(1).max(5),
  active: z.boolean().optional(),
});

const AdvanceSchema = z.object({
  intent: z.literal("advance"),
  eventId: z.string().min(4),
});

export const GET = withRoute("escalations.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const swept = await sweepEscalations(hospitalId);
  const [policies, events] = await Promise.all([
    db.nxEscalationPolicy.findMany({ where: { hospitalId } }),
    db.nxEscalationEvent.findMany({ where: { hospitalId }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  return ok({ policies, events, sweptAdvanced: swept }, { requestId });
});

export const POST = withRoute("escalations.post", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "settings.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const raw = await req.json().catch(() => null);
  const intent = (raw as { intent?: string })?.intent;

  if (intent === "upsert_policy") {
    const body = PolicySchema.safeParse(raw);
    if (!body.success) return fail("invalid_request", 400, body.error.issues.map((i) => i.message).join("; "), requestId);
    const d = body.data;
    const data = {
      alertType: d.alertType,
      levelsJson: JSON.stringify(d.levels),
      active: d.active ?? true,
    };
    const row = d.id
      ? await db.nxEscalationPolicy.update({ where: { id: d.id }, data })
      : await db.nxEscalationPolicy.create({ data: { ...data, hospitalId } });
    return ok(row, { requestId });
  }

  if (intent === "advance") {
    const body = AdvanceSchema.safeParse(raw);
    if (!body.success) return fail("invalid_request", 400, "advance requires eventId", requestId);
    const result = await advanceEscalation(body.data.eventId, g.session.name);
    if (!result.advanced) return fail("cannot_advance", 422, "Event already at top level or unknown.", requestId);
    const ev = await db.nxEscalationEvent.findUnique({ where: { id: body.data.eventId } });
    if (ev) {
      publish({ event: "escalation.advanced", hospitalId: ev.hospitalId, data: { alertType: ev.alertType, level: ev.level } });
    }
    return ok(result, { requestId });
  }

  return fail("unknown_intent", 400, undefined, requestId);
});
