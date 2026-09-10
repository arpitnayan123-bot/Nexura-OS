import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";

/* EHR document versioning with tracked edits (SBAR, care plans, discharge docs). */

const CreateSchema = z.object({
  entityType: z.enum(["sbar", "journey_summary", "care_plan", "discharge"]),
  entityId: z.string().min(4),
  content: z.string().min(2).max(20_000),
  changeKind: z.enum(["create", "edit", "coauthor", "sign"]).optional(),
  tracked: z.array(z.object({ field: z.string().max(60), from: z.string().max(2000), to: z.string().max(2000) })).max(30).optional(),
});

export const GET = withRoute("docs.versions.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!entityType || !entityId) return fail("missing_params", 400, "entityType + entityId required", requestId);
  const versions = await db.nxDocVersion.findMany({
    where: { hospitalId, entityType, entityId },
    orderBy: { createdAt: "asc" },
  });
  return ok(versions, { requestId });
});

export const POST = withRoute("docs.versions.create", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "note.edit");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, CreateSchema);
  if ("response" in body) return body.response;
  const d = body.data;
  const latest = await db.nxDocVersion.findFirst({
    where: { hospitalId, entityType: d.entityType, entityId: d.entityId },
    orderBy: { version: "desc" },
  });
  const version = await db.nxDocVersion.create({
    data: {
      hospitalId,
      entityType: d.entityType,
      entityId: d.entityId,
      version: (latest?.version ?? 0) + 1,
      changeKind: d.changeKind ?? "edit",
      authorName: g.session.name,
      authorRole: g.session.role,
      content: d.content,
      trackedJson: d.tracked ? JSON.stringify(d.tracked) : null,
    },
  });
  await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: "doc.version", entityType: d.entityType, entityId: d.entityId, detail: { version: version.version, kind: version.changeKind } });
  return ok(version, { requestId, status: 201 });
});
