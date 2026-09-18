import { createHmac, timingSafeEqual } from "crypto";

/* Step-up verification tokens (5-min, action-bound, single-purpose).
   Used by privileged actions: billing approval, medication verification,
   prescription signing. See /api/nx/auth/stepup for issuance. */

export const STEPUP_ACTIONS = [
  "billing.approve",
  "medication.verify",
  "prescription.sign",
  "mfa.disable",
] as const;
export type StepUpAction = (typeof STEPUP_ACTIONS)[number];

function stepUpSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET must be set (>=16 chars) in production — step-up HMAC must not use a fallback.",
    );
  }
  return "nexura-os-dev-secret-change-in-prod";
}

export function issueStepUpToken(userId: string, action: StepUpAction, subjectId?: string): string {
  const exp = Date.now() + 5 * 60_000;
  const body = `${userId}|${action}|${subjectId ?? ""}|${exp}`;
  const sig = createHmac("sha256", stepUpSecret()).update(body).digest("hex");
  return `${Buffer.from(body).toString("base64url")}.${sig}`;
}

export function verifyStepUpToken(
  token: string | null | undefined,
  userId: string,
  action: StepUpAction,
  subjectId?: string,
): { ok: boolean; reason?: string } {
  const inspected = inspectStepUpToken(token, action, subjectId);
  if (!inspected.ok) return inspected;
  if (inspected.userId !== userId) return { ok: false, reason: "wrong_user" };
  return { ok: true };
}

/** Signature-validating inspection that RETURNS the bound user — used by
 *  two-person flows (prescription signing) where the caller must compare
 *  the two principals instead of matching one session. */
export function inspectStepUpToken(
  token: string | null | undefined,
  action: StepUpAction,
  subjectId?: string,
): { ok: boolean; reason?: string; userId?: string } {
  if (!token) return { ok: false, reason: "missing_token" };
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return { ok: false, reason: "malformed" };
  const body = Buffer.from(b64, "base64url").toString();
  const expect = createHmac("sha256", stepUpSecret()).update(body).digest("hex");
  const a = Buffer.from(expect),
    b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return { ok: false, reason: "bad_signature" };
  const [uid, act, subj, exp] = body.split("|");
  if (act !== action) return { ok: false, reason: "wrong_action" };
  if ((subj ?? "") !== (subjectId ?? "")) return { ok: false, reason: "wrong_subject" };
  if (Number(exp) < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, userId: uid };
}
