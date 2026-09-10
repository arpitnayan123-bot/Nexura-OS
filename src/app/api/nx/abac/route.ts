import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";

/* ABAC policy management (security.manage). Policies are evaluated by
   src/lib/nx/abac.ts and enforced in sensitive routes. */

const UpsertSchema = z.object({
  id: z.string().optional(),
  role: z.string().max(40).nullable().optional(),
  effect: z.enum(["allow", "deny"]),
  action: z.string().max(20), // read|write|sign|dispense|approve|*
  resource: z.string().max(20), // patients|notes|orders|billing|medications|*
  deptScope: z.array(z.string().max(60)).max(20).optional(),
  wardScope: z.array(z.string().max(60)).max(20).optional(),
  patientScope: z.enum(["any", "assigned", "ward"]).optional(),
  timeWindows: z.array(z.object({
    days: z.array(z.number().int().min(1).max(7)).max(7).optional(),
    from: z.string().regex(/^\d{2}:\d{2}$/),
    to: z.string().regex(/^\d{2}:\d{2}$/),
  })).max(6).optional(),
  active: z.boolean().optional(),
  note: z.string().max(300).optional(),
});

export const GET = withRoute("abac.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "security.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const rows = await db.nxAbacPolicy.findMany({ where: { hospitalId }, orderBy: { createdAt: "desc" } });
  return ok(
    rows.map((r) => ({
      ...r,
      deptScope: JSON.parse(r.deptScope || "[]"),
      wardScope: JSON.parse(r.wardScope || "[]"),
      timeWindows: JSON.parse(r.timeWindows || "[]"),
    })),
    { requestId }
  );
});

export const POST = withRoute("abac.upsert", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "security.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, UpsertSchema);
  if ("response" in body) return body.response;
  const d = body.data;
  const data = {
    role: d.role ?? null,
    effect: d.effect,
    action: d.action,
    resource: d.resource,
    deptScope: d.deptScope ? JSON.stringify(d.deptScope) : null,
    wardScope: d.wardScope ? JSON.stringify(d.wardScope) : null,
    patientScope: d.patientScope ?? "any",
    timeWindows: d.timeWindows ? JSON.stringify(d.timeWindows) : null,
    active: d.active ?? true,
    note: d.note,
  };
  const row = d.id
    ? await db.nxAbacPolicy.update({ where: { id: d.id }, data })
    : await db.nxAbacPolicy.create({ data: { ...data, hospitalId } });
  return ok(row, { requestId });
});

export const DELETE = withRoute("abac.delete", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "security.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("missing_id", 400, undefined, requestId);
  await db.nxAbacPolicy.deleteMany({ where: { id, hospitalId } });
  return ok({ deleted: true }, { requestId });
});
