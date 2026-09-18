import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";

/* HaaS onboarding: apply a template to provision a new hospital tenant. */

const OnboardSchema = z.object({
  templateCode: z.string().min(2).max(40),
  hospitalName: z.string().min(2).max(120),
  state: z.string().max(60).optional(),
  district: z.string().max(60).optional(),
  tenantCode: z
    .string()
    .max(48)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  tenantName: z.string().max(120).optional(),
});

export const POST = withRoute("onboard.apply", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "settings.manage");
  if ("response" in g) return g.response;
  const body = await parseBody(req, OnboardSchema);
  if ("response" in body) return body.response;
  const template = await db.nxHospitalTemplate.findUnique({
    where: { code: body.data.templateCode },
  });
  if (!template) return fail("unknown_template", 404, undefined, requestId);
  const config = JSON.parse(template.configJson || "{}") as {
    modules?: string[];
    locales?: string[];
    offlineMode?: boolean;
  };
  let tenantId: string | undefined;
  if (body.data.tenantCode) {
    const tenant = await db.nxTenant.upsert({
      where: { code: body.data.tenantCode },
      create: {
        code: body.data.tenantCode,
        name: body.data.tenantName ?? body.data.hospitalName,
        plan: "standard",
      },
      update: {},
    });
    tenantId = tenant.id;
  }
  const hospital = await db.hospital.create({
    data: {
      name: body.data.hospitalName,
      state: body.data.state,
      district: body.data.district,
      ...(tenantId ? { tenantId } : {}),
    },
  });
  await audit({
    hospitalId: g.session.hospitalId ?? hospital.id,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "onboard.hospital",
    entityType: "hospital",
    entityId: hospital.id,
    detail: { template: template.code, modules: config.modules ?? [] },
  });
  return ok(
    {
      hospitalId: hospital.id,
      appliedTemplate: template.code,
      enabledModules: config.modules ?? [],
      locales: config.locales ?? ["en"],
      offlineMode: Boolean(config.offlineMode),
      nextSteps: [
        "Create departments/wards from the Admin app",
        "Invite staff (staff ops)",
        "Configure escalation policies + AI thresholds in Governance",
      ],
    },
    { requestId, status: 201 },
  );
});
