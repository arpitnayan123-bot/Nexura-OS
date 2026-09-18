import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";

/* ============================================================
   EDGE MIDDLEWARE — security headers, request correlation IDs,
   global API rate limiting, and the production gate for demo
   product surfaces.

   Notes:
   - Full CSP is delivered here in report-friendly form; tighten
     to enforce mode after frontend audit (see SECURITY.md).
   - Framing is deliberately permissive: the platform preview
     embeds this app in a cross-origin iframe. Dev allows any
     ancestor; production allows same-origin + https gateways.
   - Auth checks happen at the API layer (cookie JWT + session
     records); middleware cannot access Prisma, so revocation-
     aware checks stay server-side in the routes.
   ============================================================ */

/* ---------- Edge-safe JWT signature check (HS256) ----------
   Middleware runs on the edge runtime where `jsonwebtoken` is
   unavailable. This verifies structure, HMAC signature, and
   expiry using Web Crypto — enough for a presence gate; full
   revocation-aware verification still happens in the routes. */
function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function verifyJwtEdge(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [head, payload, sig] = parts;
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(head)));
    if (header?.alg !== "HS256") return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(sig) as unknown as ArrayBuffer,
      new TextEncoder().encode(`${head}.${payload}`),
    );
    if (!valid) return false;
    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

/* ---------- Global API rate limiting (per IP) ----------
   EDGE-RUNTIME PRE-FILTER: middleware runs on the edge runtime where
   TCP clients (ioredis) are unavailable, so this bucket is per-isolate
   by nature — a fast 600 req/min burst guard, NOT the authoritative
   limit. The distributed, cross-instance limiter lives in
   src/lib/rate-limit.ts (Redis INCR/EXPIRE) and is enforced at the
   Node route layer (auth surfaces, OTP send, expensive handlers).
   globalThis keeps the bucket table stable across dev-HMR reloads. */
interface Bucket {
  count: number;
  resetAt: number;
}
const g = globalThis as unknown as { __nxApiBuckets?: Map<string, Bucket> };
const buckets = g.__nxApiBuckets ?? new Map<string, Bucket>();
g.__nxApiBuckets = buckets;

const API_RATE = { max: 600, windowMs: 60_000 };

function apiRateLimited(ip: string): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = buckets.get(ip);
  if (!entry || entry.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + API_RATE.windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return { limited: false, retryAfter: 0 };
  }
  entry.count += 1;
  return {
    limited: entry.count > API_RATE.max,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/** Demo product families — open in DEMO_MODE, session-gated in production. */
const PRODUCT_API_PREFIXES = [
  "/api/pharmacy",
  "/api/clinic",
  "/api/connect",
  "/api/know-your-health",
  "/api/assistant",
  "/api/portal",
];
/** Portal login itself must stay reachable to establish a session. */
const PRODUCT_AUTH_PATHS = ["/api/portal/auth"];

export default async function proxy(req: NextRequest) {
  const requestId =
    req.headers.get("x-request-id") || `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  const { pathname } = req.nextUrl;
  // Rightmost XFF hop = the value our trusted platform proxy appended — the
  // only IP a client cannot spoof (first hop is attacker-controlled).
  const xffParts =
    req.headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const ip = xffParts[xffParts.length - 1] || req.headers.get("x-real-ip") || "local";

  // ---- request body cap (DoS guard before any route parses JSON) ----
  // Largest legitimate body: KYH vision tools (~11.2MB base64 in JSON).
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (pathname.startsWith("/api/") && contentLength > 13 * 1024 * 1024) {
    return new NextResponse(
      JSON.stringify({
        error: "payload_too_large",
        detail: "Request body exceeds the 13MB limit.",
      }),
      {
        status: 413,
        headers: { "content-type": "application/json", "x-request-id": requestId },
      },
    );
  }

  // ---- global API rate limit (all /api/* requests) ----
  let early: NextResponse | null = null;
  if (pathname.startsWith("/api/")) {
    const rl = apiRateLimited(ip);
    if (rl.limited) {
      early = NextResponse.json(
        { error: "rate_limited", detail: "Too many requests — slow down.", meta: { requestId } },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
  }

  // ---- production gate for demo product surfaces ----
  if (
    !early &&
    !isDemoMode() &&
    PRODUCT_API_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !PRODUCT_AUTH_PATHS.includes(pathname)
  ) {
    const cookies = req.cookies;
    const candidates = ["nx_access", "nexura_access", "portal_session"]
      .map((n) => cookies.get(n)?.value)
      .filter((v): v is string => Boolean(v));
    const secret = process.env.JWT_SECRET || "";
    const anyValid = secret
      ? await Promise.all(candidates.map((t) => verifyJwtEdge(t, secret))).then((rs) =>
          rs.some(Boolean),
        )
      : false;
    if (!anyValid) {
      early = NextResponse.json(
        { error: "unauthenticated", detail: "Sign in to use this surface.", meta: { requestId } },
        { status: 401 },
      );
    }
  }

  const res = early ?? NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("x-request-id", requestId);

  // Security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  // Framing: the platform preview embeds this app in a cross-origin iframe.
  // X-Frame-Options: DENY / frame-ancestors 'none' make the browser show
  // "refused to connect" inside the preview — so framing stays permissive here.
  // Dev/demo: any ancestor. Production: same-origin plus https gateways.
  const frameAncestors = process.env.NODE_ENV === "production" ? "'self' https:" : "*";
  // CSP: report-only in dev; images allow data: + https (AI illustrations); styles need 'unsafe-inline' for Tailwind runtime
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Content-Security-Policy", csp);
  } else {
    res.headers.set("Content-Security-Policy-Report-Only", csp);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|woff2?)).*)"],
};
