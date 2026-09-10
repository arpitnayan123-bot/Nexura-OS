import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";

/* HITL feedback loop: clinicians correct/accept/reject AI outputs; every
   correction is telemetry for prompt iteration and the daily report. */

const FeedbackSchema = z.object({
  interactionId: z.string().min(4),
  verdict: z.enum(["accepted", "corrected", "rejected"]),
  correction: z.string().max(4000).optional(),
  notes: z.string().max(500).optional(),
});

export const POST = withRoute("ai.feedback", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, FeedbackSchema);
  if ("response" in body) return body.response;
  const interaction = await db.nxAIInteraction.findFirst({ where: { id: body.data.interactionId, hospitalId } });
  if (!interaction) return fail("unknown_interaction", 404, undefined, requestId);
  const row = await db.nxAiFeedback.create({
    data: {
      hospitalId,
      interactionId: body.data.interactionId,
      staffName: g.session.name,
      staffRole: g.session.role,
      verdict: body.data.verdict,
      correction: body.data.correction,
      notes: body.data.notes,
    },
  });
  await db.nxAIInteraction.update({ where: { id: interaction.id }, data: { status: body.data.verdict === "rejected" ? "review_required" : interaction.status } }).catch(() => {});
  await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: "ai.feedback", entityType: "nx_ai_interaction", entityId: interaction.id, detail: { verdict: body.data.verdict } });
  return ok(row, { requestId, status: 201 });
});

export const GET = withRoute("ai.feedback.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "audit.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const rows = await db.nxAiFeedback.findMany({ where: { hospitalId }, orderBy: { createdAt: "desc" }, take: 50 });
  return ok(rows, { requestId });
});
