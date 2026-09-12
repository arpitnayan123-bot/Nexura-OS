/* ============================================================
 * NEXURA DIY — API SHARED GUARD
 * Every /api/diy route: authenticate (portal JWT or guest JWT)
 * → authorize (same-user only) → validate body → rate limit →
 * consent enforcement. Fail-closed everywhere. DELETE bodies
 * are valid too (consent withdrawal sends scopes).
 * ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, ipOf } from "@/lib/nx/api";
import { getDiyUser, getActiveConsentScopes, hasScopes } from "@/lib/diy/auth";
import { REQUIRED_SCOPES, type ConsentScope } from "@/lib/diy/types";
import { DIY_ERROR_CODES } from "@/lib/diy/schemas";

export interface GuardOk<T> {
  ok: true;
  userId: string;
  body: T;
}

export function guardFail(
  code: keyof typeof DIY_ERROR_CODES,
  message: string,
  status = 400,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    { error: { code: DIY_ERROR_CODES[code], message, ...extra } },
    { status }
  );
}

type BodyValidator = (raw: unknown) => { success: true; data: unknown } | { success: false; error: string };

export function zodBody<S extends { safeParse: (v: unknown) => { success: true; data: unknown } | { success: false; error: { issues: { message?: string }[] } } }>(
  schema: S
): BodyValidator {
  return (raw) => {
    const r = schema.safeParse(raw);
    return r.success
      ? { success: true, data: r.data }
      : { success: false, error: r.error.issues[0]?.message ?? "Invalid request body" };
  };
}

export async function guard(
  req: NextRequest,
  opts: {
    body?: BodyValidator;
    consent?: keyof typeof REQUIRED_SCOPES;
    rate?: { max: number; windowMs: number };
  } = {}
): Promise<GuardOk<unknown> | NextResponse> {
  const user = await getDiyUser({ id: true, fullName: true });
  if (!user) return guardFail("UNAUTHENTICATED", "Open Nexura DIY to start — no sign-in needed.", 401);

  const rate = opts.rate ?? { max: 30, windowMs: 60_000 };
  const rl = rateLimit(`diy:${user.id}:${new URL(req.url).pathname}`, rate.max, rate.windowMs);
  if (!rl.allowed) {
    return guardFail("RATE_LIMITED", "Too many requests — slow down a moment.", 429, { resetAt: rl.resetAt });
  }

  let body: unknown = undefined;
  if (opts.body || (req.method !== "GET" && req.method !== "HEAD")) {
    try {
      body = await req.json();
    } catch {
      if (opts.body) return guardFail("INVALID_BODY", "Request body must be valid JSON.");
    }
    if (opts.body && body !== undefined) {
      const check = opts.body(body);
      if (!check.success) return guardFail("INVALID_BODY", check.error);
      body = check.data;
    }
  }

  if (opts.consent) {
    const scopes = await getActiveConsentScopes(user.id);
    const required: ConsentScope[] = REQUIRED_SCOPES[opts.consent];
    if (!hasScopes(scopes, required)) {
      return guardFail("CONSENT_REQUIRED", "Consent is required for this action.", 403, {
        missingScopes: required.filter((r) => !scopes.has(r)),
      });
    }
  }

  return { ok: true, userId: user.id, body };
}

export { ipOf };
