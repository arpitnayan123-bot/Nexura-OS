/* ============================================================
 * NEXURA DIY — IDENTITY + CONSENT HELPERS
 * Resolution order: portal_session (signed JWT) wins; else the
 * diy_guest cookie (also a signed JWT, backed by a REAL
 * PortalUser row "guest-<id>", phone unique) so every existing
 * guard/consent/audit path works unchanged with zero extra
 * migrations. Guest data is browser-scoped and honestly labeled.
 * ============================================================ */

import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { signServiceToken, verifyServiceToken } from "@/lib/auth/jwt";
import { getPortalUser, PORTAL_SESSION_COOKIE } from "@/lib/portal-session";
import { CONSENT_POLICY_VERSION, type ConsentScope } from "./types";

export const DIY_GUEST_COOKIE = "diy_guest";
const GUEST_TTL_S = 60 * 60 * 24 * 30; // 30 days

/** Resolve the acting DIY user: portal session first, then guest. */
export async function getDiyUser(select?: Record<string, boolean>) {
  const portal = await getPortalUser(select);
  if (portal) return portal;
  const store = await cookies();
  const token = store.get(DIY_GUEST_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyServiceToken<{ sub: string; kind?: string }>(token);
  if (!payload?.sub || payload.kind !== "diy_guest") return null;
  return db.portalUser.findUnique({
    where: { id: payload.sub },
    ...(select ? { select } : {}),
  });
}

/** Provision (or reuse) a guest identity and set its cookie. */
export async function ensureGuestSession(): Promise<{ userId: string; created: boolean }> {
  const store = await cookies();
  const existing = store.get(DIY_GUEST_COOKIE)?.value;
  if (existing) {
    const payload = verifyServiceToken<{ sub: string; kind?: string }>(existing);
    if (payload?.sub && payload.kind === "diy_guest") {
      const user = await db.portalUser.findUnique({ where: { id: payload.sub }, select: { id: true } });
      if (user) return { userId: user.id, created: false };
    }
  }
  const suffix = randomBytes(6).toString("hex");
  const user = await db.portalUser.create({
    data: {
      phone: `guest-${Date.now().toString(36)}-${suffix}`,
      fullName: "Nexura DIY Guest",
      isOnboarded: true,
    },
    select: { id: true },
  });
  const token = signServiceToken({ sub: user.id, kind: "diy_guest" }, `${GUEST_TTL_S}s`);
  store.set(DIY_GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: GUEST_TTL_S,
  });
  return { userId: user.id, created: true };
}

/** Is the current identity a guest (vs signed-in portal user)? */
export async function isGuestUser(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(DIY_GUEST_COOKIE)?.value);
}

/* ---------- consent ---------- */

export async function getActiveConsentScopes(userId: string): Promise<Set<ConsentScope>> {
  const rows = await db.diyConsent.findMany({
    where: { userId, withdrawnAt: null },
    select: { consentType: true },
  });
  return new Set(rows.map((r) => r.consentType as ConsentScope));
}

export function hasScopes(active: Set<ConsentScope>, required: ConsentScope[]): boolean {
  return required.every((r) => active.has(r));
}

export const CURRENT_POLICY_VERSION = CONSENT_POLICY_VERSION;
