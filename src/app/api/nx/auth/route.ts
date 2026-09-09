import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateAccessToken, verifyToken } from "@/lib/auth/jwt";
import { modulesForRole, roleKeysForUser, type NxRole } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";
import { fail, ipOf, ok, parseBody, withRoute, rateLimit } from "@/lib/nx/api";
import { log } from "@/lib/logger";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "nexura-os-dev-secret-change-in-prod";
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;
const MAX_ATTEMPTS = 5;

/* ============================================================
   NEXURA HOSPITAL OS — AUTH v2
   Two first-class sign-in methods + MFA step-up:
   • staffCode + PIN        (demo fast path, still real auth)
   • email + password       (production path)
   Every attempt → NxLoginAttempt. Progressive lockout.
   Sessions are revocable records (sign out of one / all devices).
   Demo accounts sign in through the exact same flow.
   ============================================================ */

const LoginSchema = z.union([
  z.object({
    method: z.literal("password").optional(),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(1, "Password is required"),
    rememberDevice: z.boolean().optional(),
    mfaCode: z.string().optional(),
    mfaToken: z.string().optional(),
  }),
  z.object({
    method: z.literal("pin").optional(),
    staffCode: z.string().min(2, "Staff code is required"),
    pin: z.string().min(4, "PIN is required"),
    rememberDevice: z.boolean().optional(),
    mfaCode: z.string().optional(),
    mfaToken: z.string().optional(),
  }),
]);

function signMfaToken(userId: string): string {
  return jwt.sign({ userId, purpose: "mfa" }, JWT_SECRET, { expiresIn: "5m" });
}

function readMfaToken(token: string): string | null {
  try {
    const d = jwt.verify(token, JWT_SECRET) as { userId?: string; purpose?: string };
    return d.purpose === "mfa" && d.userId ? d.userId : null;
  } catch {
    return null;
  }
}

async function issueSession(
  user: { id: string; name: string; role: string; department: string | null; hospitalId: string; staffCode: string; linkedPatientId: string | null },
  req: NextRequest,
  opts: { rememberDevice?: boolean; breakGlass?: boolean }
): Promise<NextResponse> {
  const jti = crypto.randomUUID();
  const maxAgeSec = opts.rememberDevice ? REMEMBER_DAYS * 24 * 3600 : SESSION_HOURS * 3600;
  const expiresAt = new Date(Date.now() + maxAgeSec * 1000);
  await db.nxSessionRecord.create({
    data: {
      userId: user.id,
      jti,
      userAgent: req.headers.get("user-agent")?.slice(0, 240) ?? null,
      ip: ipOf(req),
      deviceLabel: opts.rememberDevice ? "Trusted device" : null,
      trustedDevice: Boolean(opts.rememberDevice),
      expiresAt,
    },
  });
  const token = generateAccessToken(
    { id: user.id, name: user.name, role: user.role as never },
    {
      jti,
      staffCode: user.staffCode,
      department: user.department ?? undefined,
      hospitalId: user.hospitalId,
      breakGlass: opts.breakGlass,
    }
  );
  const roleKey = user.role as NxRole;
  const res = ok({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
      hospitalId: user.hospitalId,
      linkedPatientId: user.linkedPatientId,
    },
    roleKeys: roleKeysForUser(user.role),
    modules: modulesForRole(roleKey),
    session: { jti, expiresAt: expiresAt.toISOString(), rememberDevice: Boolean(opts.rememberDevice) },
  });
  res.cookies.set("nx_access", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  });
  await db.nxStaffUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedAttempts: 0, lockedUntil: null },
  });
  return res;
}

export const POST = withRoute("auth.login", async (req) => {
  const ip = ipOf(req);

  // IP-level progressive rate limit: 20 attempts / 10 min / IP
  const ipRl = rateLimit(`login-ip:${ip}`, 20, 10 * 60_000);
  if (!ipRl.allowed) {
    return fail("rate_limited", 429, "Too many sign-in attempts from this network. Try again later.", undefined, {
      "Retry-After": String(Math.ceil((ipRl.resetAt - Date.now()) / 1000)),
    });
  }

  const body = await parseBody(req, LoginSchema);
  if ("response" in body) return body.response;
  const creds = body.data;

  const isPassword = "email" in creds;
  const identifier = isPassword ? creds.email.toLowerCase().trim() : creds.staffCode.toUpperCase().trim();

  const user = await db.nxStaffUser.findFirst({
    where: isPassword ? { email: { equals: identifier, } } : { staffCode: identifier },
  });

  const auditAttempt = async (success: boolean, reason: string, userId?: string) => {
    await db.nxLoginAttempt.create({
      data: {
        staffCode: identifier,
        userId: userId ?? user?.id ?? null,
        method: isPassword ? "password" : "pin",
        success,
        reason,
        ip,
        userAgent: req.headers.get("user-agent")?.slice(0, 240) ?? null,
      },
    });
    if (!success) {
      log.warn("auth", "login.failed", { staffCode: identifier, reason });
    }
  };

  if (!user) {
    await auditAttempt(false, "unknown_account");
    // Constant-shape error; never reveal whether the account exists
    return fail("invalid_credentials", 401, "Incorrect credentials.");
  }

  // Account state gates
  if (user.status === "suspended") {
    await auditAttempt(false, "suspended");
    return fail("account_suspended", 403, "This account is suspended. Contact your hospital administrator.");
  }
  if (user.status === "deactivated") {
    await auditAttempt(false, "deactivated");
    return fail("account_deactivated", 403, "This account has been deactivated.");
  }

  // Progressive account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await auditAttempt(false, "locked");
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return fail("account_locked", 423, `Account temporarily locked after repeated failures. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
  }

  // --- MFA step 2 ---
  if (creds.mfaToken) {
    const mfaUserId = readMfaToken(creds.mfaToken);
    if (!mfaUserId || mfaUserId !== user.id) return fail("invalid_mfa_token", 401, "MFA session expired. Sign in again.");
    if (!user.mfaSecret || !creds.mfaCode) return fail("mfa_required", 401, "Enter your authenticator code.", undefined);
    const { verifyTotp } = await import("@/lib/nx/totp");
    if (!verifyTotp(user.mfaSecret, creds.mfaCode)) {
      await auditAttempt(false, "mfa_failed");
      return fail("invalid_mfa_code", 401, "That authenticator code didn't match. Try the next code.");
    }
    await auditAttempt(true, "ok_mfa");
    if (user.hospitalId) {
      await audit({ hospitalId: user.hospitalId, actorName: user.staffCode, actorRole: user.role, action: "auth.login", entityType: "nx_session", detail: { method: isPassword ? "password+mfa" : "pin+mfa" } });
    }
    return issueSession(user, req, { rememberDevice: creds.rememberDevice });
  }

  // --- Verify primary credential ---
  let credOk = false;
  if (isPassword) {
    if (!user.passwordHash) {
      await auditAttempt(false, "no_password_set");
      return fail("invalid_credentials", 401, "Incorrect credentials.");
    }
    credOk = await bcrypt.compare(creds.password, user.passwordHash);
  } else {
    credOk = await bcrypt.compare(creds.pin, user.pinHash);
  }

  if (!credOk) {
    const attempts = user.failedAttempts + 1;
    const lockMins = attempts >= MAX_ATTEMPTS ? Math.min(30, 2 ** (attempts - MAX_ATTEMPTS + 1)) : 0;
    await db.nxStaffUser.update({
      where: { id: user.id },
      data: { failedAttempts: attempts, lockedUntil: lockMins ? new Date(Date.now() + lockMins * 60000) : null },
    });
    await auditAttempt(false, lockMins ? "locked_now" : "invalid_credentials");
    if (lockMins) {
      return fail("account_locked", 423, `Too many failed attempts. Account locked for ${lockMins} minute${lockMins === 1 ? "" : "s"}.`);
    }
    const left = MAX_ATTEMPTS - attempts;
    return fail("invalid_credentials", 401, left <= 2 ? `Incorrect credentials. ${left} attempt${left === 1 ? "" : "s"} before temporary lock.` : "Incorrect credentials.");
  }

  // --- MFA step 1: user has MFA on, issue step-up token ---
  if (user.mfaEnabled && user.mfaSecret && !creds.mfaCode) {
    return ok({ mfa_required: true, mfa_token: signMfaToken(user.id) });
  }

  await auditAttempt(true, "ok");
  if (user.hospitalId) {
    await audit({ hospitalId: user.hospitalId, actorName: user.staffCode, actorRole: user.role, action: "auth.login", entityType: "nx_session", detail: { method: isPassword ? "password" : "pin" } });
  }
  const res = await issueSession(user, req, { rememberDevice: creds.rememberDevice });
  if (env().values.DEMO_MODE) {
    // annotate demo flag in body without touching cookie logic
    const data = (res as unknown as { _payload?: unknown });
    void data;
  }
  return res;
});

/** GET — current session snapshot (profile, effective roles, demo flag). */
export const GET = withRoute("auth.me", async (req) => {
  const token = req.cookies.get("nx_access")?.value;
  if (!token) return fail("unauthenticated", 401);
  const decoded = verifyToken(token);
  if (!decoded) return fail("unauthenticated", 401);
  const user = await db.nxStaffUser.findUnique({ where: { id: decoded.userId } });
  if (!user || user.status !== "active") return fail("unauthenticated", 401);
  const sessionRec = (decoded as { jti?: string }).jti
    ? await db.nxSessionRecord.findUnique({ where: { jti: (decoded as unknown as { jti: string }).jti } })
    : null;
  if (sessionRec && (sessionRec.revokedAt || sessionRec.expiresAt < new Date())) return fail("session_revoked", 401, "Your session was signed out.");
  return ok({
    user: {
      id: user.id,
      name: user.name,
      staffCode: user.staffCode,
      email: user.email,
      role: user.role,
      department: user.department,
      hospitalId: user.hospitalId,
      linkedPatientId: user.linkedPatientId,
      mfaEnabled: user.mfaEnabled,
      emailVerified: Boolean(user.emailVerifiedAt),
      mustChangePassword: user.mustChangePassword,
    },
    roleKeys: roleKeysForUser(user.role),
    modules: modulesForRole(user.role as NxRole),
    demo: env().values.DEMO_MODE,
    session: sessionRec ? { expiresAt: sessionRec.expiresAt, breakGlass: sessionRec.breakGlass } : null,
  });
});
