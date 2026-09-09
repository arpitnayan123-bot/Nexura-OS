import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { rateLimit, getRateLimitHeaders } from "./jwt";

/* ============================================================
   NEXURA OS — SECURITY MIDDLEWARE
   Applied to API routes for rate limiting + security headers.
   ============================================================ */

/* ---------- Security Headers ---------- */
export function addSecurityHeaders(res: NextResponse): void {
  // Prevent clickjacking
  res.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME-type sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");
  // XSS protection (legacy browsers)
  res.headers.set("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Content Security Policy (permissive for dev, tighten in prod)
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' ws: wss: https: http://localhost:*"
  );
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

/* ---------- API Rate Limiter ---------- */
export function withRateLimit(
  handler: (req: any, ...args: any[]) => Promise<NextResponse>,
  options: { maxRequests?: number; windowMs?: number } = {}
) {
  const { maxRequests = 100, windowMs = 15 * 60 * 1000 } = options;

  return async (req: any, ...args: any[]): Promise<NextResponse> => {
    // Get client IP (check for forwarded header first)
    const forwarded = req.headers?.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    // Apply rate limit
    const { allowed, remaining, resetAt } = rateLimit(ip, maxRequests, windowMs);

    if (!allowed) {
      const res = NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      );

      // Add rate limit headers
      const headers = getRateLimitHeaders(0, resetAt);
      Object.entries(headers).forEach(([key, value]) => {
        res.headers.set(key, value);
      });

      addSecurityHeaders(res);
      return res;
    }

    // Execute handler
    const res = await handler(req, ...args);

    // Add security + rate limit headers to successful responses
    addSecurityHeaders(res);
    const headers = getRateLimitHeaders(remaining, resetAt);
    Object.entries(headers).forEach(([key, value]) => {
      res.headers.set(key, value);
    });

    return res;
  };
}

/* ---------- Input Validation ---------- */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  // Indian phone: +91 followed by 10 digits, or just 10 digits
  const cleaned = phone.replace(/[\s-]/g, "");
  return /^(\+91)?[6-9]\d{9}$/.test(cleaned);
}

export function sanitizeInput(input: string): string {
  // Remove potential XSS payloads
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

/* ---------- OTP Generation ---------- */
export function generateOTP(): string {
  // Cryptographically secure 6-digit OTP
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

export function generateOTPHash(otp: string, phone: string): string {
  return createHash("sha256")
    .update(`${otp}:${phone}:${Date.now().toString().slice(0, -4)}`)
    .digest("hex");
}
