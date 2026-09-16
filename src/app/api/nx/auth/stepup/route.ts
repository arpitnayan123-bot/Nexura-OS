import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, rateLimit, withRoute } from "@/lib/nx/api";
import { verifyTotp } from "@/lib/nx/totp";

/* ============================================================
   NEXURA OS v5 — STEP-UP VERIFICATION for privileged actions.
   High-risk operations (billing approval over threshold, medication
   verification/dispensing, prescription signing) require a fresh
   second factor: PIN re-entry or TOTP. Returns a 5-minute,
   action-bound, single-purpose token consumed by the guarded route
   via `consumeStepUp()`. Replay across actions/tokens is rejected.
   ============================================================ */

const ReqSchema = z.object({
  action: z.enum(STEPUP_ACTIONS),
  method: z.enum(["pin", "totp"]),
  code: z.string().min(4).max(8),
  subjectId: z.string().max(80).optional(), // e.g. prescription/order id being signed
});

import { issueStepUpToken } from "@/lib/nx/stepup";
import { STEPUP_ACTIONS } from "@/lib/nx/stepup";

export const POST = withRoute("auth.stepup", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  // Brute-force damper: a hijacked session gets 5 verification attempts per
  // 15 minutes — PIN/TOTP guessing cannot be iterated online. Success and
  // token issuance behavior are unchanged.
  const attempts = rateLimit(`stepup:${g.session.userId}`, 5, 15 * 60_000);
  if (!attempts.allowed) {
    return fail("rate_limited", 429, "Too many verification attempts — try again later.", requestId);
  }
  const body = await parseBody(req, ReqSchema);
  if ("response" in body) return body.response;
  const user = await db.nxStaffUser.findUnique({ where: { id: g.session.userId } });
  if (!user) return fail("no_user", 401, undefined, requestId);
  let verified = false;
  if (body.data.method === "pin") {
    verified = user.pinHash ? await bcrypt.compare(body.data.code, user.pinHash).catch(() => false) : false;
  } else {
    verified = user.mfaSecret && user.mfaEnabled ? verifyTotp(user.mfaSecret, body.data.code) : false;
  }
  if (!verified) {
    await db.nxStaffUser.update({ where: { id: user.id }, data: { failedAttempts: { increment: 1 } } }).catch(() => {});
    return fail("stepup_failed", 401, "Verification code incorrect.", requestId);
  }
  await db.nxStaffUser.update({ where: { id: user.id }, data: { failedAttempts: 0 } }).catch(() => {});
  return ok({ token: issueStepUpToken(user.id, body.data.action, body.data.subjectId), ttlSeconds: 300 }, { requestId });
});
