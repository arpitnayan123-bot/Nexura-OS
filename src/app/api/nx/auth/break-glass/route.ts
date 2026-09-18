import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateAccessToken, verifyToken } from "@/lib/auth/jwt";
import { audit } from "@/lib/nx/audit";
import { fail, guard, ok, withRoute } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BREAK-GLASS emergency access.
 * POST {patientId, reason, minutes?<=60} → time-boxed emergency grant; re-issues the
 * session token with breakGlass=true. Prominent warning, mandatory reason, full audit.
 * GET — active break-glass events (auditors/admins).
 * DELETE {eventId} — revoke early.
 */

const InvokeSchema = z.object({
  patientId: z.string().min(3),
  reason: z
    .string()
    .min(10, "A specific reason (min 10 chars) is mandatory for break-glass access"),
  minutes: z.number().int().min(5).max(60).optional(),
});

export const POST = withRoute("auth.breakglass.invoke", async (req: NextRequest) => {
  // Break-glass is a privileged capability, not something any clinician gets by
  // default — it requires the dedicated `breakglass.invoke` permission.
  const g = await guard(req, "breakglass.invoke");
  if ("response" in g) return g.response;
  if (!g.session.hospitalId) return fail("invalid_request", 400, "No hospital context.");
  const parsed = InvokeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return fail(
      "invalid_request",
      400,
      parsed.data ? "Invalid request." : (parsed.error.issues[0]?.message ?? "Invalid request."),
    );
  const minutes = parsed.data.minutes ?? 30;

  const user = await db.nxStaffUser.findUnique({ where: { id: g.session.userId } });
  if (!user) return fail("unauthenticated", 401);

  const patient = await db.hospitalPatient.findFirst({
    where: { id: parsed.data.patientId, hospitalId: g.session.hospitalId },
  });
  if (!patient) return fail("not_found", 404, "Patient not found in your hospital.");

  const expiresAt = new Date(Date.now() + minutes * 60000);
  const ev = await db.nxBreakGlassEvent.create({
    data: {
      hospitalId: g.session.hospitalId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      patientId: patient.id,
      patientName: patient.fullName,
      reason: parsed.data.reason,
      expiresAt,
    },
  });

  // Re-issue session token with breakGlass flag (keeps same jti/session record)
  const token = req.cookies.get("nx_access")?.value;
  const decoded = token ? verifyToken(token) : null;
  const jti = decoded ? (decoded as { jti?: string }).jti : undefined;
  if (jti)
    await db.nxSessionRecord.update({ where: { jti }, data: { breakGlass: true } }).catch(() => {});

  await audit({
    hospitalId: g.session.hospitalId,
    actorName: user.staffCode,
    actorRole: user.role,
    action: "breakglass.invoke",
    entityType: "patient",
    entityId: patient.id,
    patientId: patient.id,
    detail: { reason: parsed.data.reason, minutes, eventId: ev.id },
  });

  const res = NextResponse.json({
    data: {
      breakGlass: true,
      eventId: ev.id,
      expiresAt,
      patient: { id: patient.id, name: patient.fullName, uhid: patient.uhid },
      warning:
        "EMERGENCY ACCESS ACTIVE. Every action is audited and reviewed. Access auto-expires.",
    },
  });
  const newToken = generateAccessToken(
    { id: user.id, name: user.name, role: user.role as never },
    {
      jti,
      staffCode: user.staffCode,
      department: user.department ?? undefined,
      hospitalId: user.hospitalId,
      breakGlass: true,
    },
  );
  res.cookies.set("nx_access", newToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
});

export const GET = withRoute("auth.breakglass.list", async (req: NextRequest) => {
  const g = await guard(req, "audit.view");
  if ("response" in g) return g.response;
  if (!g.session.hospitalId) return fail("no_hospital", 400);
  const events = await db.nxBreakGlassEvent.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() }, hospitalId: g.session.hospitalId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ events });
});

export const DELETE = withRoute("auth.breakglass.revoke", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const body = (await req.json().catch(() => ({}))) as { eventId?: string };
  if (!body.eventId) return fail("invalid_request", 400, "eventId required.");
  const ev = await db.nxBreakGlassEvent.findFirst({
    where: { id: body.eventId, userId: g.session.userId, revokedAt: null },
  });
  if (!ev) return fail("not_found", 404, "Break-glass event not found.");
  await db.nxBreakGlassEvent.update({ where: { id: ev.id }, data: { revokedAt: new Date() } });
  // Re-issue clean token
  const token = req.cookies.get("nx_access")?.value;
  const decoded = token ? verifyToken(token) : null;
  const jti = decoded ? (decoded as { jti?: string }).jti : undefined;
  const user = await db.nxStaffUser.findUnique({ where: { id: g.session.userId } });
  const res = NextResponse.json({ data: { revoked: true } });
  if (decoded && user && jti) {
    await db.nxSessionRecord
      .update({ where: { jti }, data: { breakGlass: false } })
      .catch(() => {});
    const newToken = generateAccessToken(
      { id: user.id, name: user.name, role: user.role as never },
      {
        jti,
        staffCode: user.staffCode,
        department: user.department ?? undefined,
        hospitalId: user.hospitalId,
        breakGlass: false,
      },
    );
    res.cookies.set("nx_access", newToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 3600,
      secure: process.env.NODE_ENV === "production",
    });
  }
  if (g.session.hospitalId) {
    await audit({
      hospitalId: g.session.hospitalId,
      actorName: g.session.staffCode ?? g.session.name,
      actorRole: g.session.role,
      action: "breakglass.revoke",
      entityType: "breakglass",
      entityId: ev.id,
      patientId: ev.patientId ?? undefined,
    });
  }
  return res;
});
void ok;
