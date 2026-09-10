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
  // Hospital admins only see their own tenant's keys; platform roles see all.
  const isPlatform = g.session.role === "super_admin" || g.session.role === "org_admin";
  let tenantFilter: { tenantId?: string } = {};
  if (!isPlatform) {
    const hospital = g.session.hospitalId
      ? await db.hospital.findUnique({ where: { id: g.session.hospitalId }, select: { tenantId: true } })
      : null;
    if (!hospital?.tenantId) return fail("no_tenant_context", 403, "Your hospital is not bound to a tenant.", requestId);
    tenantFilter = { tenantId: hospital.tenantId };
  }
  const keys = await db.nxApiKey.findMany({
    where: tenantFilter,
    orderBy: { createdAt: "desc" },
    include: { tenant: { select: { code: true, name: true } } },
  });
  return ok(keys, { requestId });
});

export const POST = withRoute("gateway.keys.issue", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "gateway.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, IssueSchema);
  if ("response" in body) return body.response;
  // Ownership wall: hospital_admins may only mint keys for their OWN tenant.
  const isPlatform = g.session.role === "super_admin" || g.session.role === "org_admin";
  const callerHospital = g.session.hospitalId
    ? await db.hospital.findUnique({ where: { id: g.session.hospitalId }, select: { tenantId: true } })
    : null;
  if (!isPlatform) {
    if (!callerHospital?.tenantId) return fail("no_tenant_context", 403, "Your hospital is not bound to a tenant.", requestId);
    if (callerHospital.tenantId !== body.data.tenantId) {
      return fail("tenant_forbidden", 403, "You can only issue keys for your own tenant.", requestId);
    }
  }
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
    hospitalId,
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
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("missing_id", 400, undefined, requestId);
  const target = await db.nxApiKey.findUnique({ where: { id }, select: { tenantId: true } });
  if (!target) return fail("not_found", 404, undefined, requestId);
  const isPlatform = g.session.role === "super_admin" || g.session.role === "org_admin";
  if (!isPlatform) {
    const hospital = g.session.hospitalId
      ? await db.hospital.findUnique({ where: { id: g.session.hospitalId }, select: { tenantId: true } })
      : null;
    if (hospital?.tenantId !== target.tenantId) {
      return fail("tenant_forbidden", 403, "This key belongs to another tenant.", requestId);
    }
  }
  const key = await db.nxApiKey.update({ where: { id }, data: { revokedAt: new Date() } }).catch(() => null);
  if (!key) return fail("not_found", 404, undefined, requestId);
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "gateway.key.revoke",
    entityType: "nx_api_key",
    entityId: id,
  });
  return ok({ revoked: true }, { requestId });
});
