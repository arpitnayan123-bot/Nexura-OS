import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, fail, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";
import { idleBudgetMin } from "@/lib/nx/session";

/* Session lifecycle management: list active sessions, remote logout. */

export const GET = withRoute("auth.sessions.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view"); // any authenticated staff
  if ("response" in g) return g.response;
  const sessions = await db.nxSessionRecord.findMany({
    where: { userId: g.session.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
  });
  return ok(
    sessions.map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel ?? s.userAgent?.slice(0, 60) ?? "Unknown device",
      ip: s.ip,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      expiresAt: s.expiresAt,
      breakGlass: s.breakGlass,
      current: s.jti === g.session.jti,
      idleBudgetMin: idleBudgetMin(g.session.role),
    })),
    { requestId }
  );
});

export const DELETE = withRoute("auth.sessions.revoke", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("missing_id", 400, undefined, requestId);
  const target = await db.nxSessionRecord.findFirst({ where: { id, userId: g.session.userId } });
  if (!target) return fail("not_found", 404, undefined, requestId);
  await db.nxSessionRecord.update({ where: { id }, data: { revokedAt: new Date(), revokedReason: "remote_logout" } });
  await audit({
    hospitalId: g.session.hospitalId ?? "",
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "session.remote_logout",
    entityType: "nx_session_record",
    entityId: id,
  });
  return ok({ revoked: true }, { requestId });
});
