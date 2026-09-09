import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, parseBody, withRoute } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Dashboard widget personalization (per user, per module). */

export const GET = withRoute("prefs.get", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const prefs = await db.nxUserPrefs.findUnique({ where: { userId: g.session.userId } });
  return ok({ prefs: prefs ? { widgets: JSON.parse(prefs.widgets || "{}"), density: prefs.density } : { widgets: {}, density: null } });
});

const SaveSchema = z.object({
  widgets: z.record(z.string(), z.union([z.boolean(), z.array(z.string())])).optional(),
  density: z.enum(["comfortable", "compact"]).optional(),
});

export const PUT = withRoute("prefs.save", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const body = await parseBody(req, SaveSchema);
  if ("response" in body) return body.response;
  const data = { widgets: body.data.widgets ? JSON.stringify(body.data.widgets) : undefined, density: body.data.density };
  await db.nxUserPrefs.upsert({
    where: { userId: g.session.userId },
    update: data,
    create: { userId: g.session.userId, widgets: data.widgets ?? "{}", density: data.density },
  });
  return NextResponse.json({ data: { saved: true } });
});
void ok;
