import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { verifyTotp } from "@/lib/nx/totp";

/* ============================================================
   NEXURA OS v5 — STEP-UP VERIFICATION for privileged actions.
   High-risk operations (billing approval over threshold, medication
   verification/dispensing, prescription signing) require a fresh
   second factor: PIN re-entry or TOTP. Returns a 5-minute,
   action-bound, single-purpose token consumed by the guarded route
   via `consumeStepUp()`. Replay across actions/tokens is rejected.
   ============================================================ */

const STEPUP_ACTIONS = ["billing.approve", "medication.verify", "prescription.sign"] as const;
export type StepUpAction = (typeof STEPUP_ACTIONS)[number];

const ReqSchema = z.object({
  action: z.enum(STEPUP_ACTIONS),
  method: z.enum(["pin", "totp"]),
  code: z.string().min(4).max(8),
  subjectId: z.string().max(80).optional(), // e.g. prescription/order id being signed
});

function stepUpSecret(): string {
  return process.env.JWT_SECRET || "nexura-os-dev-secret-change-in-prod";
}

export function issueStepUpToken(userId: string, action: StepUpAction, subjectId?: string): string {
  const exp = Date.now() + 5 * 60_000;
  const body = `${userId}|${action}|${subjectId ?? ""}|${exp}`;
  const sig = createHmac("sha256", stepUpSecret()).update(body).digest("hex");
  return `${Buffer.from(body).toString("base64url")}.${sig}`;
}

export function verifyStepUpToken(token: string | null | undefined, userId: string, action: StepUpAction, subjectId?: string): { ok: boolean; reason?: string } {
  if (!token) return { ok: false, reason: "missing_token" };
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return { ok: false, reason: "malformed" };
  const body = Buffer.from(b64, "base64url").toString();
  const expect = createHmac("sha256", stepUpSecret()).update(body).digest("hex");
  if (sig !== expect) return { ok: false, reason: "bad_signature" };
  const [uid, act, subj, exp] = body.split("|");
  if (uid !== userId) return { ok: false, reason: "wrong_user" };
  if (act !== action) return { ok: false, reason: "wrong_action" };
  if ((subj ?? "") !== (subjectId ?? "")) return { ok: false, reason: "wrong_subject" };
  if (Number(exp) < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true };
}

export const POST = withRoute("auth.stepup", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
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
