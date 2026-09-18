import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { parseSteps, advanceRun, stepOverdue } from "@/lib/nx/pathway";
import { audit } from "@/lib/nx/audit";

/* Clinical pathways: definitions (DSL) + runs.
   GET  → defs + active/recent runs (with live SLA overdue flags)
   POST → { intent: "create_def" | "start" | "advance" } */

const DefSchema = z.object({
  intent: z.literal("create_def"),
  code: z.string().min(2).max(60),
  name: z.string().min(2).max(120),
  specialty: z.string().max(60).optional(),
  steps: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        title: z.string().min(1).max(120),
        withinMin: z.number().int().min(1).max(2880),
        critical: z.boolean().optional(),
        requires: z.array(z.string().max(40)).max(8).optional(),
        ownerRole: z.string().max(30).optional(),
        detail: z.string().max(200).optional(),
      }),
    )
    .min(2)
    .max(15),
});

const StartSchema = z.object({
  intent: z.literal("start"),
  defId: z.string().min(4),
  patientId: z.string().optional(),
  patientName: z.string().optional(),
});

const AdvanceSchema = z.object({
  intent: z.literal("advance"),
  runId: z.string().min(4),
  stepId: z.string().min(1),
  action: z.enum(["complete", "skip", "escalate"]),
  evidence: z.string().max(200).optional(),
});

export const GET = withRoute("pathways.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const [defs, runs] = await Promise.all([
    db.nxPathwayDef.findMany({ where: { hospitalId, active: true }, orderBy: { code: "asc" } }),
    db.nxPathwayRun.findMany({ where: { hospitalId }, orderBy: { startedAt: "desc" }, take: 30 }),
  ]);
  const now = new Date();
  return ok(
    {
      definitions: defs.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        specialty: d.specialty,
        version: d.version,
        steps: parseSteps(d.stepsJson),
      })),
      runs: runs.map((r) => {
        const def = defs.find((d) => d.id === r.defId);
        const steps = def ? parseSteps(def.stepsJson) : [];
        const current = steps.find((s) => s.id === r.currentStep);
        return {
          ...r,
          pathway: def?.name,
          stepOverdue: current ? stepOverdue(current, r.startedAt, now) : false,
          progressPct: steps.length
            ? Math.round(
                (steps.filter((s) =>
                  (JSON.parse(r.stateJson || "{}").completed ?? []).includes(s.id),
                ).length /
                  steps.length) *
                  100,
              )
            : 0,
        };
      }),
    },
    { requestId },
  );
});

export const POST = withRoute("pathways.post", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const raw = await req.json().catch(() => null);
  const intent = (raw as { intent?: string })?.intent;

  if (intent === "create_def") {
    const body = DefSchema.safeParse(raw);
    if (!body.success)
      return fail(
        "invalid_request",
        400,
        body.error.issues.map((i) => i.message).join("; "),
        requestId,
      );
    // cycles guard: requires must reference EARLIER steps only
    const seen = new Set<string>();
    for (const s of body.data.steps) {
      if ((s.requires ?? []).some((r) => !seen.has(r))) {
        return fail(
          "forward_dependency",
          422,
          `Step "${s.id}" depends on a later step — pathways flow forward.`,
          requestId,
        );
      }
      seen.add(s.id);
    }
    const def = await db.nxPathwayDef.create({
      data: {
        hospitalId,
        code: body.data.code,
        name: body.data.name,
        specialty: body.data.specialty,
        stepsJson: JSON.stringify(body.data.steps),
      },
    });
    await audit({
      hospitalId,
      actorName: g.session.name,
      actorRole: g.session.role,
      action: "pathway.def.create",
      entityType: "nx_pathway_def",
      entityId: def.id,
    });
    return ok({ id: def.id }, { requestId, status: 201 });
  }

  if (intent === "start") {
    const body = StartSchema.safeParse(raw);
    if (!body.success) return fail("invalid_request", 400, "start requires defId", requestId);
    const def = await db.nxPathwayDef.findFirst({ where: { id: body.data.defId, hospitalId } });
    if (!def) return fail("unknown_definition", 404, undefined, requestId);
    const { startRun } = await import("@/lib/nx/pathway");
    const run = await startRun(def.id, {
      hospitalId,
      patientId: body.data.patientId,
      patientName: body.data.patientName,
      startedBy: g.session.name,
    });
    await audit({
      hospitalId,
      actorName: g.session.name,
      actorRole: g.session.role,
      action: "pathway.run.start",
      entityType: "nx_pathway_run",
      entityId: run.runId,
      detail: { code: def.code },
    });
    return ok({ runId: run.runId, firstStep: run.firstStep }, { requestId, status: 201 });
  }

  if (intent === "advance") {
    const body = AdvanceSchema.safeParse(raw);
    if (!body.success)
      return fail("invalid_request", 400, "advance requires runId/stepId/action", requestId);
    const result = await advanceRun(body.data.runId, {
      stepId: body.data.stepId,
      action: body.data.action,
      evidence: body.data.evidence,
      actorName: g.session.name,
    });
    if (!result.ok) return fail(result.reason ?? "advance_failed", 422, result.reason, requestId);
    return ok(result, { requestId });
  }

  return fail("unknown_intent", 400, "intent must be create_def | start | advance", requestId);
});
