import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, parseBody, withRoute, fail } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Saved task views (filters persisted per user). */

export const GET = withRoute("tasks.views.list", async (req: NextRequest) => {
  const g = await guard(req, "tasks.manage");
  if ("response" in g) return g.response;
  const views = await db.nxTaskView.findMany({ where: { userId: g.session.userId }, orderBy: { createdAt: "desc" } });
  return ok({ views: views.map((v) => ({ id: v.id, name: v.name, filters: JSON.parse(v.filters || "{}") })) });
});

const SaveSchema = z.object({
  name: z.string().min(1).max(40),
  filters: z.object({
    status: z.string().optional(),
    priority: z.string().optional(),
    mine: z.boolean().optional(),
    q: z.string().optional(),
  }),
});

export const POST = withRoute("tasks.views.save", async (req: NextRequest) => {
  const g = await guard(req, "tasks.manage");
  if ("response" in g) return g.response;
  const body = await parseBody(req, SaveSchema);
  if ("response" in body) return body.response;
  const existing = await db.nxTaskView.findFirst({ where: { userId: g.session.userId, name: body.data.name } });
  if (existing) {
    await db.nxTaskView.update({ where: { id: existing.id }, data: { filters: JSON.stringify(body.data.filters) } });
    return NextResponse.json({ data: { saved: true, updated: true } });
  }
  await db.nxTaskView.create({ data: { userId: g.session.userId, name: body.data.name, filters: JSON.stringify(body.data.filters) } });
  return NextResponse.json({ data: { saved: true } });
});

export const DELETE = withRoute("tasks.views.delete", async (req: NextRequest) => {
  const g = await guard(req, "tasks.manage");
  if ("response" in g) return g.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("invalid_request", 400, "id required.");
  await db.nxTaskView.deleteMany({ where: { id, userId: g.session.userId } });
  return NextResponse.json({ data: { deleted: true } });
});
void ok;
