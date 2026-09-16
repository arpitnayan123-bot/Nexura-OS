import { cookies } from "next/headers";
import { verifyServiceToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { setAiActor } from "@/lib/ai-actor";

/* ============================================================
   NEXURA — PORTAL SESSION RESOLVER (single source of truth)
   The portal cookie stores a SIGNED service-scope JWT (issued by
   /api/portal/auth), never a bare user id. Every /api/portal route
   MUST resolve its caller through this helper — reading the cookie
   value as a database id both fails closed today and one refactor
   away from full patient impersonation.
   ============================================================ */

export const PORTAL_SESSION_COOKIE = "portal_session";

export async function getPortalUser(select?: Record<string, boolean>) {
  const store = await cookies();
  const token = store.get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyServiceToken<{ sub: string }>(token);
  if (!payload?.sub) return null;
  // Attribute every AI call this request makes to the verified portal
  // identity (AiUsageLog per-request attribution — ai-actor context).
  // Captured from the SIGNED token, before any DB resolution.
  setAiActor({ userId: payload.sub, role: "patient" });
  return db.portalUser.findUnique({
    where: { id: payload.sub },
    ...(select ? { select } : {}),
  });
}

/** Minimal identity for ownership checks (blood bookings, family, AI). */
export async function getPortalCaller() {
  return getPortalUser({ id: true, fullName: true, phone: true, familyHeadId: true, hospitalPatientUhid: true });
}
