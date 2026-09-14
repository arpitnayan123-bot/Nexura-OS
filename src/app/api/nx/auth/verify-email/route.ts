import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { fail, ok, withRoute } from "@/lib/nx/api";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email verification flow.
 * POST {email} → issue verification token (console transport logs it in demo).
 * PATCH {token} → mark email verified.
 */

const RequestSchema = z.object({ email: z.string().email() });
const ConfirmSchema = z.object({ token: z.string().min(10) });

export const POST = withRoute("auth.email.verify.request", async (req: NextRequest) => {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, "A valid email is required.");
  const user = await db.nxStaffUser.findFirst({ where: { email: parsed.data.email.toLowerCase().trim() } });
  if (user && !user.emailVerifiedAt) {
    const token = crypto.randomBytes(32).toString("hex");
    await db.nxEmailVerificationToken.create({
      data: { userId: user.id, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 24 * 3600_000) },
    });
    // TODO(otp-delivery): console is the demo delivery channel — see password/route.ts.
    // Keep the live token OUT of the structured log (persists to server.log).
    if (env().values.EMAIL_TRANSPORT === "console") {
      log.info("auth", "email_verification.issued", { to: user.email, expiresInHours: 24 });
      console.log(`[DEMO EMAIL DELIVERY] email verification token for ${user.email}: ${token}`);
    }
  }
  return NextResponse.json({ data: { requested: true, message: "If that email exists and is unverified, a verification link has been sent." } });
});

export const PATCH = withRoute("auth.email.verify.confirm", async (req: NextRequest) => {
  const parsed = ConfirmSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, "Verification token required.");
  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const rec = await db.nxEmailVerificationToken.findUnique({ where: { tokenHash } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return fail("invalid_token", 400, "This verification link is invalid or expired.");
  const user = await db.nxStaffUser.findUnique({ where: { id: rec.userId } });
  if (!user) return fail("invalid_token", 400, "This verification link is invalid.");
  await db.$transaction([
    db.nxStaffUser.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }),
    db.nxEmailVerificationToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);
  if (user.hospitalId) {
    await audit({ hospitalId: user.hospitalId, actorName: user.staffCode, actorRole: user.role, action: "auth.email.verified", entityType: "nx_staff_user", entityId: user.id });
  }
  return NextResponse.json({ data: { verified: true } });
});
void ok;
