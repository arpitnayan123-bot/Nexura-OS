import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";
import { generateApiKey, GATEWAY_SCOPES } from "@/lib/nx/gateway";

/* Partner API key management (gateway.manage). Plaintext is returned exactly once. */

const IssueSchema = z.object({
  name: z.string().min(2).max(80),
  tenantId: z.string().min(4),
  scopes: z.array(z.enum(GATEWAY_SCOPES)).min(1),
  rateLimitPerMin: z.number().int().min(10).max(600).optional(),
});

export const GET = withRoute("gateway.keys.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "gateway.manage");
  if ("response" in g) return g.response;
  const keys = await db.nxApiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { tenant: { select: { code: true, name: true } } },
  });
  return ok(keys, { requestId });
});

export const POST = withRoute("gateway.keys.issue", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "gateway.manage");
  if ("response" in g) return g.response;
  const body = await parseBody(req, IssueSchema);
  if ("response" in body) return body.response;
  const tenant = await db.nxTenant.findUnique({ where: { id: body.data.tenantId } });
  if (!tenant) return fail("tenant_not_found", 404, undefined, requestId);
  const { plaintext, prefix, hash } = generateApiKey();
  const key = await db.nxApiKey.create({
    data: {
      tenantId: body.data.tenantId,
      name: body.data.name,
      prefix,
      keyHash: hash,
      scopes: JSON.stringify(body.data.scopes),
      rateLimitPerMin: body.data.rateLimitPerMin ?? 60,
    },
  });
  await audit({
    hospitalId: g.session.hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "gateway.key.issue",
    entityType: "nx_api_key",
    entityId: key.id,
    detail: { tenant: tenant.code, scopes: body.data.scopes },
  });
  return ok({ id: key.id, prefix, plaintext, scopes: body.data.scopes, warning: "Store this secret now — it is never shown again." }, { requestId });
});

export const DELETE = withRoute("gateway.keys.revoke", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "gateway.manage");
  if ("response" in g) return g.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("missing_id", 400, undefined, requestId);
  const key = await db.nxApiKey.update({ where: { id }, data: { revokedAt: new Date() } }).catch(() => null);
  if (!key) return fail("not_found", 404, undefined, requestId);
  await audit({
    hospitalId: g.session.hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "gateway.key.revoke",
    entityType: "nx_api_key",
    entityId: id,
  });
  return ok({ revoked: true }, { requestId });
});
