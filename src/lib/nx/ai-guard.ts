import { NextRequest, NextResponse } from "next/server";
import { rateLimit, ipOf, fail, newRequestId } from "./api";
import { isDemoMode } from "@/lib/env";
import { getSession } from "./session";
import { getAuthUser } from "@/lib/auth/jwt";

/* ============================================================
   NEXURA — AI ENDPOINT GATE
   Every LLM call costs real money and can be abused for prompt
   spam. This gate applies, in order:
   1. Per-IP rate limit (default 20 requests / 5 minutes).
   2. In production (DEMO_MODE off): an authenticated session is
      required — nx staff session or legacy access token. Demo
      mode keeps the public marketing tools usable.
   Call it at the top of any AI route handler:
     const gate = aiGate(req); if (gate) return gate;
   ============================================================ */

export function aiGate(
  req: NextRequest,
  opts?: { max?: number; windowMs?: number },
): NextResponse | null {
  const max = opts?.max ?? 20;
  const windowMs = opts?.windowMs ?? 5 * 60_000;
  const rl = rateLimit(`ai:${ipOf(req)}`, max, windowMs);
  if (!rl.allowed) {
    return fail(
      "rate_limited",
      429,
      "Too many AI requests — please wait a moment.",
      newRequestId(),
      {
        "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
      },
    );
  }
  if (!isDemoMode()) {
    const session = getSession(req);
    const legacy = getAuthUser(req);
    if (!session && !legacy) {
      return fail("unauthenticated", 401, "Sign in to use AI features.", newRequestId());
    }
  }
  return null;
}
