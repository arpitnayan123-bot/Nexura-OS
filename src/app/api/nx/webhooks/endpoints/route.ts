import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";
import { WEBHOOK_EVENTS, isSafeWebhookUrl } from "@/lib/nx/webhooks";

/* Outbound webhook endpoint registry (integrations config). */

const UpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(80),
  url: z.string().url().max(400).refine(isSafeWebhookUrl, {
    message: "Webhook URL must be https and must not point at private/internal hosts",
  }),
  events: z.array(z.string().max(40)).min(1).max(10),
  active: z.boolean().optional(),
});

export const GET = withRoute("webhooks.endpoints.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "settings.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const [endpoints, deliveries] = await Promise.all([
    db.nxWebhookEndpoint.findMany({ where: { hospitalId }, orderBy: { createdAt: "desc" } }),
    db.nxWebhookDelivery.findMany({
      where: { hospitalId },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);
  return ok(
    {
      supportedEvents: WEBHOOK_EVENTS,
      endpoints: endpoints.map((e) => ({
        ...e,
        secret: `${e.secret.slice(0, 6)}…`,
        events: JSON.parse(e.events || "[]"),
      })),
      recentDeliveries: deliveries,
    },
    { requestId },
  );
});

export const POST = withRoute(
  "webhooks.endpoints.upsert",
  async (req: NextRequest, { requestId }) => {
    const g = await guard(req, "settings.manage");
    if ("response" in g) return g.response;
    const hospitalId = g.session.hospitalId;
    if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
    const body = await parseBody(req, UpsertSchema);
    if ("response" in body) return body.response;
    const d = body.data;
    const secret = `whsec_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    const data = {
      name: d.name,
      url: d.url,
      events: JSON.stringify(d.events),
      active: d.active ?? true,
      secret,
    };
    const endpoint = d.id
      ? await db.nxWebhookEndpoint.update({
          where: { id: d.id },
          data: { name: d.name, url: d.url, events: data.events, active: data.active },
        })
      : await db.nxWebhookEndpoint.create({ data: { ...data, hospitalId } });
    await audit({
      hospitalId,
      actorName: g.session.name,
      actorRole: g.session.role,
      action: d.id ? "webhook.update" : "webhook.create",
      entityType: "nx_webhook_endpoint",
      entityId: endpoint.id,
    });
    return ok(
      {
        id: endpoint.id,
        secret: d.id ? undefined : secret,
        note: d.id ? undefined : "Save this signing secret — shown once.",
      },
      { requestId },
    );
  },
);

export const DELETE = withRoute(
  "webhooks.endpoints.delete",
  async (req: NextRequest, { requestId }) => {
    const g = await guard(req, "settings.manage");
    if ("response" in g) return g.response;
    const hospitalId = g.session.hospitalId;
    if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return fail("missing_id", 400, undefined, requestId);
    await db.nxWebhookEndpoint.deleteMany({ where: { id, hospitalId } });
    return ok({ deleted: true }, { requestId });
  },
);
