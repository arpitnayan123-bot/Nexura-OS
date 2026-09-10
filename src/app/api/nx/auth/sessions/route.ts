import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { fail, guard, ok, withRoute } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET — list my active sessions (devices). DELETE — revoke one session or all others. */

export const GET = withRoute("auth.sessions.list", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const sessions = await db.nxSessionRecord.findMany({
    where: { userId: g.session.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, jti: true, userAgent: true, ip: true, createdAt: true, lastSeenAt: true, expiresAt: true, trustedDevice: true },
  });
  const token = req.cookies.get("nx_access")?.value;
  const currentJti = token ? (verifyToken(token) as { jti?: string } | null)?.jti : null;
  return ok({
    sessions: sessions.map((s) => ({
      id: s.id,
      current: s.jti === currentJti,
      device: s.trustedDevice ? "Trusted device" : "Browser session",
      userAgent: s.userAgent?.slice(0, 120) ?? null,
      ip: s.ip,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      expiresAt: s.expiresAt,
    })),
  });
});

const RevokeSchema = z.object({ sessionId: z.string().optional(), all: z.boolean().optional() });

export const DELETE = withRoute("auth.sessions.revoke", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const body = (await req.json().catch(() => ({}))) as { sessionId?: string; all?: boolean };
  const token = req.cookies.get("nx_access")?.value;
  const currentJti = token ? (verifyToken(token) as { jti?: string } | null)?.jti : null;

  let count = 0;
  if (body.all) {
    const r = await db.nxSessionRecord.updateMany({
      where: { userId: g.session.userId, revokedAt: null, jti: { not: currentJti ?? "" } },
      data: { revokedAt: new Date(), revokedReason: "logout_all" },
    });
    count = r.count;
  } else if (body.sessionId) {
    const rec = await db.nxSessionRecord.findFirst({ where: { id: body.sessionId, userId: g.session.userId } });
    if (!rec) return fail("not_found", 404, "Session not found.");
    if (rec.jti === currentJti) return fail("cannot_revoke_current", 400, "Use sign-out for the current device.");
    await db.nxSessionRecord.update({ where: { id: rec.id }, data: { revokedAt: new Date(), revokedReason: "revoked_by_user" } });
    count = 1;
  } else {
    return fail("invalid_request", 400, "Provide sessionId or all:true.");
  }

  const user = await db.nxStaffUser.findUnique({ where: { id: g.session.userId } });
  if (user?.hospitalId) {
    await audit({
      hospitalId: user.hospitalId,
      actorName: user.staffCode,
      actorRole: user.role,
      action: "auth.session.revoke",
      entityType: "nx_session",
      detail: { count, all: Boolean(body.all) },
    });
  }
  return NextResponse.json({ data: { revoked: count } });
});
