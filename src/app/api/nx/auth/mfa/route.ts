import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyToken } from "@/lib/auth/jwt";
import { audit } from "@/lib/nx/audit";
import { fail, guard, ok, rateLimit, withRoute } from "@/lib/nx/api";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/nx/totp";
import { verifyStepUpToken } from "@/lib/nx/stepup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MFA (TOTP) lifecycle:
 * POST — begin enrollment: generate secret, return otpauth:// URL (not yet active).
 * PUT — activate: verify first code, flip mfaEnabled.
 * DELETE — disable MFA: requires account password.
 */

export const POST = withRoute("auth.mfa.enroll", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const user = await db.nxStaffUser.findUnique({ where: { id: g.session.userId } });
  if (!user) return fail("unauthenticated", 401);
  if (user.mfaEnabled)
    return fail("mfa_already_enabled", 400, "MFA is already active on this account.");
  const secret = generateTotpSecret();
  await db.nxStaffUser.update({
    where: { id: user.id },
    data: { mfaSecret: secret, mfaEnabled: false },
  });
  return ok({
    enrollment: {
      secret,
      otpauthUrl: otpauthUrl(secret, user.email ?? user.staffCode),
      instructions:
        "Add this secret to your authenticator app, then confirm with a 6-digit code to activate.",
    },
  });
});

const ActivateSchema = z.object({ code: z.string().min(6).max(8) });

export const PUT = withRoute("auth.mfa.activate", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const parsed = ActivateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return fail("invalid_request", 400, "A 6-digit authenticator code is required.");
  const user = await db.nxStaffUser.findUnique({ where: { id: g.session.userId } });
  if (!user?.mfaSecret) return fail("mfa_not_enrolled", 400, "Start MFA enrollment first.");
  if (!verifyTotp(user.mfaSecret, parsed.data.code))
    return fail("invalid_mfa_code", 400, "That code didn't match. Try the next one.");
  await db.nxStaffUser.update({ where: { id: user.id }, data: { mfaEnabled: true } });
  if (user.hospitalId) {
    await audit({
      hospitalId: user.hospitalId,
      actorName: user.staffCode,
      actorRole: user.role,
      action: "auth.mfa.enabled",
      entityType: "nx_staff_user",
      entityId: user.id,
    });
  }
  return NextResponse.json({ data: { enabled: true } });
});

export const DELETE = withRoute("auth.mfa.disable", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  // Second-factor boundary: disabling MFA is a privileged action, so it is
  // rate-limited (5 attempts / 15 min) to damper online guessing of the
  // confirmation factor.
  const attempts = rateLimit(`mfa-disable:${g.session.userId}`, 5, 15 * 60_000);
  if (!attempts.allowed) {
    return fail("rate_limited", 429, "Too many attempts — try again later.", requestId);
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const user = await db.nxStaffUser.findUnique({ where: { id: g.session.userId } });
  if (!user) return fail("unauthenticated", 401);
  if (user.passwordHash) {
    // Password-holding accounts keep the original password confirmation path.
    const okPw = body.password ? await bcrypt.compare(body.password, user.passwordHash) : false;
    if (!okPw)
      return fail("invalid_credentials", 401, "Enter your account password to disable MFA.");
  } else {
    // PIN-only accounts have NO password and (while MFA is on) MFA is their
    // only second factor — they must present a fresh, action-bound step-up
    // token (issued by /api/nx/auth/stepup after PIN or TOTP verification)
    // in the x-stepup-token header. Absent/invalid → fail closed.
    const headerToken = req.headers.get("x-stepup-token");
    const stepUp = verifyStepUpToken(headerToken, user.id, "mfa.disable");
    if (!stepUp.ok) {
      return fail(
        "stepup_required",
        401,
        "Verify with your PIN or authenticator code to disable MFA.",
        requestId,
      );
    }
  }
  await db.nxStaffUser.update({
    where: { id: user.id },
    data: { mfaEnabled: false, mfaSecret: null },
  });
  if (user.hospitalId) {
    await audit({
      hospitalId: user.hospitalId,
      actorName: user.staffCode,
      actorRole: user.role,
      action: "auth.mfa.disabled",
      entityType: "nx_staff_user",
      entityId: user.id,
    });
  }
  return NextResponse.json({ data: { disabled: true } });
});
void verifyToken;
