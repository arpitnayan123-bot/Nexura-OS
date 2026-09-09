import { NextRequest, NextResponse } from "next/server";

/* ============================================================
   EDGE MIDDLEWARE — security headers + request correlation IDs.
   Note: full CSP is delivered here in report-friendly form;
   tighten to enforce mode after frontend audit (see SECURITY.md).
   Auth checks happen at the API layer (cookie JWT + session
   records); Next 16 middleware cannot access Prisma, so
   revocation-aware checks stay server-side in the routes.
   ============================================================ */

export default function proxy(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("x-request-id", requestId);

  // Security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  // CSP: report-only in dev; images allow data: + https (AI illustrations); styles need 'unsafe-inline' for Tailwind runtime
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
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
