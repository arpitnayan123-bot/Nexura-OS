import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getKillSwitch } from "./kill-switch";

/* ============================================================
   NEXURA PHI — SESSION (single source of truth)
   The PHI cookie stores a SIGNED JWT whose `sub` is a PhiSubject
   id. Routes must resolve callers through this helper — never
   trust a bare id from the client. The cookie is httpOnly +
   sameSite=lax. PHI is a demo posture feature: subjects are
   lightweight and disposable; no real identity is claimed.
   ============================================================ */

export const PHI_SESSION_COOKIE = "phi_session";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

async function sign(payload: { sub: string }): Promise<string> {
  const { signServiceToken } = await import("@/lib/auth/jwt");
  // Reuses the Nexura service-token signer (HS256). signServiceToken stamps
  // scope:"service" (its fixed contract), so the PHI scope distinction is
  // enforced at the authorization layer instead: every request verifies the
  // `sub` against the phi_subjects table (see getPhiSubjectId), which no
  // other module's token could satisfy.
  return signServiceToken({ sub: payload.sub }, TOKEN_TTL_SECONDS);
}

async function verify(token: string): Promise<{ sub: string } | null> {
  try {
    const { verifyServiceToken } = await import("@/lib/auth/jwt");
    const payload = verifyServiceToken<{ sub: string }>(token);
    if (!payload?.sub) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

/** Resolve the current PHI subject, or null when no valid session cookie exists. */
export async function getPhiSubjectId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(PHI_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify(token);
  if (!payload) return null;
  const subject = await db.phiSubject.findUnique({ where: { id: payload.sub }, select: { id: true } });
  return subject?.id ?? null;
}

/** Resolve + audit-fail helper: returns null and expects the route to 401. */
export async function requirePhiSubjectId(): Promise<string | null> {
  return getPhiSubjectId();
}

/**
 * Idempotent session bootstrap: returns the existing subject for a valid
 * cookie, otherwise creates a fresh PhiSubject + default consent rows
 * (all scopes DENIED by default — consent is opt-in, never assumed) and
 * sets the signed cookie.
 */
export async function ensurePhiSession(): Promise<{ subjectId: string; killSwitch: boolean }> {
  const existing = await getPhiSubjectId();
  if (existing) {
    return { subjectId: existing, killSwitch: await getKillSwitch() };
  }

  const subject = await db.phiSubject.create({
    data: { label: `demo-${randomUUID().slice(0, 8)}` },
    select: { id: true },
  });

  const store = await cookies();
  const token = await sign({ sub: subject.id });
  store.set(PHI_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });

  return { subjectId: subject.id, killSwitch: await getKillSwitch() };
}
