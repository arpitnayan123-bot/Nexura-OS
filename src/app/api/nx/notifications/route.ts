import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, paginate, pageMeta, withRoute, fail } from "@/lib/nx/api";
import { roleKeysForUser } from "@/lib/nx/session";
import { publish } from "@/lib/nx/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   NOTIFICATIONS — persistent, role-broadcast or targeted.
   GET: inbox (mine + broadcasts to my roles), unread count.
   PATCH: mark read / read-all. POST: create (system events).
   ============================================================ */

export const GET = withRoute("notifications.list", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const p = paginate(req, { perPage: 30, maxPerPage: 100 });
  const roleKeys = roleKeysForUser(g.session.role).map(String);

  const where = {
    hospitalId,
    OR: [
      { userId: g.session.userId },
      { userId: null, roleKey: { in: roleKeys } },
      { userId: null, roleKey: null },
    ],
  };
  const [rows, total, unread] = await Promise.all([
    db.nxNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: p.skip,
      take: p.take,
    }),
    db.nxNotification.count({ where }),
    db.nxNotification.count({ where: { ...where, readAt: null } }),
  ]);
  // Bare shape: the OS notification center reads top-level fields
  return NextResponse.json({ notifications: rows, unread, meta: pageMeta(p, total) });
});

const CreateSchema = z.object({
  title: z.string().min(2).max(160),
  body: z.string().max(1000).optional(),
  level: z.enum(["info", "success", "warning", "critical"]).default("info"),
  category: z.string().max(30).default("system"),
  toUserId: z.string().optional(),
  toRoleKey: z.string().optional(),
  link: z.string().max(200).optional(),
  patientId: z.string().optional(),
});

export const POST = withRoute("notifications.create", async (req: NextRequest) => {
  const g = await guard(req, "communication.send");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const body = (await req.json().catch(() => null)) as z.infer<typeof CreateSchema> | null;
  if (!body) return fail("invalid_json", 400);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);

  const n = await db.nxNotification.create({
    data: {
      hospitalId,
      userId: parsed.data.toUserId,
      roleKey: parsed.data.toRoleKey,
      title: parsed.data.title,
      body: parsed.data.body,
      level: parsed.data.level,
      category: parsed.data.category,
      link: parsed.data.link,
      patientId: parsed.data.patientId,
    },
  });
  publish({
    event: "notification.new",
    hospitalId,
    ...(parsed.data.toUserId
      ? { toUsers: [parsed.data.toUserId] }
      : parsed.data.toRoleKey
        ? { toRoles: [parsed.data.toRoleKey] }
        : {}),
    data: { id: n.id, title: n.title, level: n.level, category: n.category, link: n.link },
  });
  return NextResponse.json({ data: { notification: n } }, { status: 201 });
});

const PatchSchema = z.object({ id: z.string().optional(), all: z.boolean().optional() });

export const PATCH = withRoute("notifications.read", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400);
  const roleKeys = roleKeysForUser(g.session.role).map(String);
  const scope = {
    hospitalId,
    OR: [
      { userId: g.session.userId },
      { userId: null, roleKey: { in: roleKeys } },
      { userId: null, roleKey: null },
    ],
  };
  if (parsed.data.all) {
    const r = await db.nxNotification.updateMany({
      where: { ...scope, readAt: null },
      data: { readAt: new Date() },
    });
    return ok({ read: r.count });
  }
  if (!parsed.data.id) return fail("invalid_request", 400, "id or all required.");
  await db.nxNotification.updateMany({
    where: { ...scope, id: parsed.data.id, readAt: null },
    data: { readAt: new Date() },
  });
  return ok({ read: 1 });
});
void ok;
