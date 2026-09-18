import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { getSessionFresh, type NxSession } from "@/lib/nx/session";
import { withRoute } from "@/lib/nx/api";
import { setAiActor } from "@/lib/ai-actor";

/* ============================================================
   NEXURA OS — PRODUCT SURFACE AUTH CORE (backend-core-1)
   Clinic & Pharmacy API routes historically relied ONLY on the
   edge demo-gate (src/proxy.ts). The edge gate is coarse: it
   cannot check session revocation, idle expiry, or user status,
   and in DEMO_MODE it lets everything through. This module is
   the fine-grained, revocation-aware identity layer every
   product route now goes through.

   Policy:
   - DEMO_MODE=true  → synthetic demo principal, clearly labeled.
     Keeps every demo flow working with zero behavioral change.
   - production      → a FRESH staff session is required
     (nx_access cookie: signature + expiry + user active +
     session record not revoked + idle budget). Patient/portal
     identities (nexura_access, portal_session) are NOT valid
     for staff consoles — clinical consoles are staff-only.
   ============================================================ */

export type ProductSurface = "clinic" | "pharmacy";

export interface DemoPrincipal {
  kind: "demo";
  surface: ProductSurface;
  role: "doctor" | "pharmacist";
  name: string;
}

export interface StaffPrincipal {
  kind: "staff";
  session: NxSession;
}

export type ProductPrincipal = DemoPrincipal | StaffPrincipal;

export type ProductAuthResult = { principal: ProductPrincipal } | { response: NextResponse };

/** True when the route name belongs to a pharmacy surface. */
function surfaceFor(name: string): ProductSurface {
  return name.startsWith("pharmacy.") ? "pharmacy" : "clinic";
}

/**
 * Resolve the caller's product identity.
 * Demo first (cheap, no DB), then the revocation-aware staff session.
 */
export async function resolveProductAuth(
  req: NextRequest,
  surface: ProductSurface,
): Promise<ProductAuthResult> {
  if (isDemoMode()) {
    return {
      principal: {
        kind: "demo",
        surface,
        role: surface === "pharmacy" ? "pharmacist" : "doctor",
        name: surface === "pharmacy" ? "Demo Pharmacist" : "Demo Clinician",
      },
    };
  }

  const session = await getSessionFresh(req);
  if (session) return { principal: { kind: "staff", session } };

  return {
    response: NextResponse.json(
      {
        error: "unauthenticated",
        detail: "Sign in as staff to use this console.",
      },
      { status: 401 },
    ),
  };
}

/**
 * The product-route guard: identical envelope to withRoute
 * (correlation ID, per-route rate limit, structured logs, contained
 * 500s) plus product-auth identity resolution before the handler.
 * Handlers keep their exact existing signature; the resolved
 * principal is available as `ctx.principal` when needed.
 */
export function withProductAuth<P = Record<string, string>>(
  name: string,
  handler: (
    req: NextRequest,
    ctx: { requestId: string; params: Promise<P>; principal: ProductPrincipal },
  ) => Promise<NextResponse>,
  opts?: { rateLimit?: { max: number; windowMs: number } },
) {
  const surface = surfaceFor(name);
  return withRoute<P>(
    name,
    async (req, rctx) => {
      const auth = await resolveProductAuth(req, surface);
      if ("response" in auth) return auth.response;
      // AI attribution on product surfaces: pharmacy/clinic console calls
      // record the verified staff identity in AiUsageLog. The demo
      // principal is labelled honestly as "demo" — synthetic posture, not
      // a person (production always resolves a real staff session here).
      const p = auth.principal;
      setAiActor(
        p.kind === "staff"
          ? { userId: p.session.userId, role: p.session.role }
          : { userId: "demo", role: p.role },
      );
      return handler(req, { ...rctx, principal: auth.principal });
    },
    opts,
  );
}
