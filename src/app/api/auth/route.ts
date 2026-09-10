import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAccessToken, generateRefreshToken, setSessionCookies, clearSessionCookies, verifyToken } from "@/lib/auth/jwt";
import { generateOTP, validatePhone, sanitizeInput, addSecurityHeaders } from "@/lib/auth/middleware";
import { rateLimit } from "@/lib/auth/jwt";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory OTP store (Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ---- SEND OTP ----
    if (action === "send_otp") {
      const phone = sanitizeInput(body.phone || "");
      if (!validatePhone(phone)) {
        const res = NextResponse.json({ error: "Invalid phone", message: "Enter a valid Indian phone number" }, { status: 400 });
        addSecurityHeaders(res);
        return res;
      }

      const { allowed } = rateLimit(`otp-send:${phone}`, 3, 5 * 60 * 1000);
      if (!allowed) {
        const res = NextResponse.json({ error: "Rate limit", message: "Wait 5 minutes before requesting another OTP" }, { status: 429 });
        addSecurityHeaders(res);
        return res;
      }

      const otp = generateOTP();
      otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });
      // SECURITY: OTPs are never logged and never echoed in API responses —
      // delivery is via the SMS/email provider integration point only.
      console.log(`[OTP] issued for ${phone.slice(0, 4)}***`);

      const res = NextResponse.json({ sent: true, message: "OTP sent" });
      addSecurityHeaders(res);
      return res;
    }

    // ---- VERIFY OTP ----
    if (action === "verify_otp") {
      const phone = sanitizeInput(body.phone || "");
      const otp = body.otp?.toString().trim();
      if (!phone || !otp) {
        const res = NextResponse.json({ error: "Missing fields" }, { status: 400 });
        addSecurityHeaders(res);
        return res;
      }

      const stored = otpStore.get(phone);
      if (!stored || Date.now() > stored.expiresAt) {
        otpStore.delete(phone);
        const res = NextResponse.json({ error: "OTP expired", message: "Request a new OTP" }, { status: 400 });
        addSecurityHeaders(res);
        return res;
      }

      if (stored.attempts >= 5) {
        otpStore.delete(phone);
        const res = NextResponse.json({ error: "Too many attempts" }, { status: 429 });
        addSecurityHeaders(res);
        return res;
      }

      if (stored.otp !== otp) {
        stored.attempts++;
        otpStore.set(phone, stored);
        const res = NextResponse.json({ error: "Invalid OTP", message: `${5 - stored.attempts} attempts left` }, { status: 400 });
        addSecurityHeaders(res);
        return res;
      }

      otpStore.delete(phone);

      let portalUser = await db.portalUser.findUnique({ where: { phone } });
      if (!portalUser) {
        portalUser = await db.portalUser.create({ data: { phone, fullName: "New Patient", isOnboarded: false, lastLoginAt: new Date() } });
      } else {
        await db.portalUser.update({ where: { id: portalUser.id }, data: { lastLoginAt: new Date() } });
      }

      const user = { id: portalUser.id, phone: portalUser.phone, name: portalUser.fullName, role: "patient" as const };
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      const res = NextResponse.json({ user: { id: portalUser.id, name: portalUser.fullName, phone: portalUser.phone, isOnboarded: portalUser.isOnboarded }, message: "Login successful" });
      setSessionCookies(res, accessToken, refreshToken);
      addSecurityHeaders(res);
      return res;
    }

    // ---- LOGOUT ----
    if (action === "logout") {
      const res = NextResponse.json({ message: "Logged out" });
      clearSessionCookies(res);
      addSecurityHeaders(res);
      return res;
    }

    const res = NextResponse.json({ error: "Invalid action" }, { status: 400 });
    addSecurityHeaders(res);
    return res;
  } catch (e: any) {
    console.error("[auth] failed:", e?.message);
    const res = NextResponse.json({ error: "auth_failed" }, { status: 500 });
    addSecurityHeaders(res);
    return res;
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nexura_access")?.value;
    if (!token) return NextResponse.json({ user: null });

    const decoded = verifyToken(token);
    if (!decoded) {
      const refreshToken = cookieStore.get("nexura_refresh")?.value;
      if (!refreshToken) return NextResponse.json({ user: null });
      const refreshDecoded = verifyToken(refreshToken);
      // Only refresh-scope tokens may mint a new access token.
      if (!refreshDecoded || (refreshDecoded as unknown as { type?: string }).type !== "refresh") {
        return NextResponse.json({ user: null });
      }

      const portalUser = await db.portalUser.findUnique({ where: { id: refreshDecoded.userId } });
      if (!portalUser) return NextResponse.json({ user: null });

      const newAccessToken = generateAccessToken({ id: portalUser.id, phone: portalUser.phone, name: portalUser.fullName, role: "patient" });
      const res = NextResponse.json({ user: { id: portalUser.id, name: portalUser.fullName, phone: portalUser.phone, isOnboarded: portalUser.isOnboarded } });
      res.cookies.set("nexura_access", newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 15 * 60, path: "/" });
      addSecurityHeaders(res);
      return res;
    }

    const portalUser = await db.portalUser.findUnique({ where: { id: decoded.userId } });
    if (!portalUser) return NextResponse.json({ user: null });

    const res = NextResponse.json({ user: { id: portalUser.id, name: portalUser.fullName, phone: portalUser.phone, email: portalUser.email, isOnboarded: portalUser.isOnboarded } });
    addSecurityHeaders(res);
    return res;
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ message: "Logged out" });
  clearSessionCookies(res);
  return res;
}
