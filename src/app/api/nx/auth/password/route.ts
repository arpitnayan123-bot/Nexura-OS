import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyToken } from "@/lib/auth/jwt";
import { audit } from "@/lib/nx/audit";
import { fail, guard, ok, withRoute } from "@/lib/nx/api";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT — change my password (requires current password).
 * POST — request a password reset (email flow; console transport logs the link).
 * reset (PUT with {token,password}) — consume reset token, set new password, revoke sessions.
 */

const ChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, "New password must be at least 10 characters").regex(/[A-Za-z]/, "Include a letter").regex(/[0-9]/, "Include a digit"),
});

export const PUT = withRoute("auth.password.change", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const body = await req.json().catch(() => null) as z.infer<typeof ChangeSchema> | null;
  if (!body) return fail("invalid_json", 400, "Body required.");
  const parsed = ChangeSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message ?? "Invalid input.");

  const user = await db.nxStaffUser.findUnique({ where: { id: g.session.userId } });
  if (!user) return fail("unauthenticated", 401);
  if (!user.passwordHash) return fail("no_password_set", 400, "This account signs in with a staff code + PIN. Set a password from an administrator invite first.");
  const okCurrent = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!okCurrent) return fail("invalid_credentials", 401, "Current password is incorrect.");

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.nxStaffUser.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });
  if (user.hospitalId) {
    await audit({ hospitalId: user.hospitalId, actorName: user.staffCode, actorRole: user.role, action: "auth.password.changed", entityType: "nx_staff_user", entityId: user.id });
  }
  return NextResponse.json({ data: { changed: true } });
});

const RequestSchema = z.object({ email: z.string().email() });
const ConfirmSchema = z.object({ token: z.string().min(10), newPassword: z.string().min(10) });
import crypto from "crypto";

export const POST = withRoute("auth.password.reset.request", async (req: NextRequest) => {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, "A valid email is required.");
  const email = parsed.data.email.toLowerCase().trim();
  const user = await db.nxStaffUser.findFirst({ where: { email } });

  // Always return success shape — never reveal whether the email exists.
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await db.nxPasswordResetToken.create({
      data: { userId: user.id, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3600_000) },
    });
    // EMAIL_TRANSPORT=console (default): the reset link is logged, not emailed — integration point.
    if (env().values.EMAIL_TRANSPORT === "console") {
      log.info("auth", "password_reset.issued", { to: email, resetToken: token, expiresInMinutes: 60 });
    }
    await audit({ hospitalId: user.hospitalId, actorName: user.staffCode, actorRole: user.role, action: "auth.password.reset_requested", entityType: "nx_staff_user", entityId: user.id });
  }
  return NextResponse.json({ data: { requested: true, message: "If that email exists, a reset link has been sent. In demo mode the token appears in the server log." } });
});

export const PATCH = withRoute("auth.password.reset.confirm", async (req: NextRequest) => {
  const parsed = ConfirmSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, "Token and new password required (min 10 chars).");
  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const rec = await db.nxPasswordResetToken.findUnique({ where: { tokenHash } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return fail("invalid_token", 400, "This reset link is invalid or has expired.");
  const user = await db.nxStaffUser.findUnique({ where: { id: rec.userId } });
  if (!user) return fail("invalid_token", 400, "This reset link is invalid.");
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.$transaction([
    db.nxStaffUser.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false, failedAttempts: 0, lockedUntil: null } }),
    db.nxPasswordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    // Security: kill every existing session after a reset
    db.nxSessionRecord.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: "password_reset" } }),
  ]);
  if (user.hospitalId) {
    await audit({ hospitalId: user.hospitalId, actorName: user.staffCode, actorRole: user.role, action: "auth.password.reset_completed", entityType: "nx_staff_user", entityId: user.id });
  }
  return NextResponse.json({ data: { reset: true } });
});
void guard; void verifyToken; void ok;
