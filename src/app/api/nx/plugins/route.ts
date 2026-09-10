import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";

/* Plugin registry: extend functionality without core source changes.
   Manifests declare permissions + UI slots; enabling is explicit and
   audited. Loaders treat plugins as read-only panels over scoped APIs. */

const KNOWN_SLOTS = ["patient_record", "ed_board", "command_center", "billing", "pharmacy_queue", "labs"];

const UpsertSchema = z.object({
  code: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(80),
  version: z.string().min(1).max(20),
  vendor: z.string().max(80).optional(),
  permissions: z.array(z.string().max(40)).max(10),
  slots: z.array(z.string().max(30)).max(5),
  enabled: z.boolean().optional(),
});

export const GET = withRoute("plugins.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "settings.manage");
  if ("response" in g) return g.response;
  const plugins = await db.nxPlugin.findMany({ orderBy: { name: "asc" } });
  return ok({
    plugins: plugins.map((p) => ({
      id: p.id, code: p.code, name: p.name, version: p.version, vendor: p.vendor,
      permissions: JSON.parse(p.permissionsJson || "[]"),
      entry: JSON.parse(p.entryJson || "{}"),
      enabled: p.enabled,
    })),
    knownSlots: KNOWN_SLOTS,
    sandboxPolicy: "plugins render panels via scoped APIs only; no direct DB access; every permission grant is listed here and audited on change",
  }, { requestId });
});

export const POST = withRoute("plugins.upsert", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "settings.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, UpsertSchema);
  if ("response" in body) return body.response;
  const d = body.data;
  const badSlot = d.slots.find((s) => !KNOWN_SLOTS.includes(s));
  if (badSlot) return fail("unknown_slot", 422, `Slot "${badSlot}" not offered by the shell.`, requestId);
  const entry = { kind: "panel", slots: d.slots };
  const plugin = await db.nxPlugin.upsert({
    where: { code: d.code },
    create: { code: d.code, name: d.name, version: d.version, vendor: d.vendor, permissionsJson: JSON.stringify(d.permissions), entryJson: JSON.stringify(entry), enabled: d.enabled ?? false },
    update: { name: d.name, version: d.version, vendor: d.vendor, permissionsJson: JSON.stringify(d.permissions), entryJson: JSON.stringify(entry), enabled: d.enabled ?? false },
  });
  await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: `plugin.${d.enabled ? "enable" : "register"}`, entityType: "nx_plugin", entityId: plugin.id, detail: { code: d.code, permissions: d.permissions } });
  return ok(plugin, { requestId });
});
