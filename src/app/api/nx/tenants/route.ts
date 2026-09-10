import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";
import { parseBranding, parseDomains, parseModules, parseSettings } from "@/lib/nx/tenant";

/* Tenancy management — platform/organization admins only. */

const UpsertSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2).max(48).regex(/^[a-z0-9-]+$/, "lowercase slug"),
  name: z.string().min(2).max(120),
  plan: z.enum(["basic", "standard", "premium", "ngo"]).optional(),
  status: z.enum(["active", "suspended", "offboarding"]).optional(),
  branding: z
    .object({
      primary: z.string().optional(),
      logoText: z.string().max(40).optional(),
      locale: z.string().max(10).optional(),
      defaultTheme: z.enum(["light", "dark"]).optional(),
    })
    .optional(),
  modules: z.array(z.string().max(40)).max(40).optional(),
  domains: z.array(z.string().max(120)).max(20).optional(),
  settings: z
    .object({
      offlineMode: z.boolean().optional(),
      retentionProfile: z.enum(["default", "strict", "long"]).optional(),
      aiThresholds: z.boolean().optional(),
    })
    .optional(),
  hospitalIds: z.array(z.string()).max(50).optional(),
});

export const POST = withRoute("tenants.post", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "tenants.manage");
  if ("response" in g) return g.response;
  const body = await parseBody(req, UpsertSchema);
  if ("response" in body) return body.response;
  const d = body.data;

  const data = {
    code: d.code,
    name: d.name,
    plan: d.plan ?? "standard",
    status: d.status ?? "active",
    brandingJson: d.branding ? JSON.stringify(d.branding) : null,
    modulesJson: d.modules ? JSON.stringify(d.modules) : null,
    domainsJson: d.domains ? JSON.stringify(d.domains) : null,
    settingsJson: d.settings ? JSON.stringify(d.settings) : null,
  };

  let tenant;
  if (d.id) {
    tenant = await db.nxTenant.update({ where: { id: d.id }, data });
  } else {
    const exists = await db.nxTenant.findUnique({ where: { code: d.code } });
    if (exists) return fail("tenant_exists", 409, "A tenant with this code already exists.", requestId);
    tenant = await db.nxTenant.create({ data });
  }

  if (d.hospitalIds) {
    await db.hospital.updateMany({ where: { id: { in: d.hospitalIds } }, data: { tenantId: tenant.id } });
  }
  await audit({
    hospitalId: g.session.hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: d.id ? "tenant.update" : "tenant.create",
    entityType: "nx_tenant",
    entityId: tenant.id,
    detail: { code: tenant.code },
  });
  return ok({
    tenant: {
      ...tenant,
      branding: parseBranding(tenant),
      modules: parseModules(tenant),
      domains: parseDomains(tenant),
      settings: parseSettings(tenant),
    },
  }, { requestId });
});

export const GET = withRoute("tenants.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "tenants.manage");
  if ("response" in g) return g.response;
  const tenants = await db.nxTenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { hospitals: { select: { id: true, name: true } }, apiKeys: { select: { id: true, name: true, revokedAt: true } } },
  });
  return ok(
    tenants.map((t) => ({
      ...t,
      branding: parseBranding(t),
      modules: parseModules(t),
      domains: parseDomains(t),
      settings: parseSettings(t),
      apiKeyCount: t.apiKeys.filter((k) => !k.revokedAt).length,
      apiKeys: undefined,
    })),
    { requestId }
  );
});
