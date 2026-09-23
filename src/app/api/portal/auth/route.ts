import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";
import { signServiceToken, verifyServiceToken } from "@/lib/auth/jwt";
import { rateLimit, ipOf } from "@/lib/nx/api";
import { isDemoMode } from "@/lib/env";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "portal_session";
const DEMO_OTP = "1234";
const COOKIE_MAX_AGE_DAYS = 30;
const OTP_TTL_MS = 5 * 60_000;

/**
 * Portal sessions are SIGNED service-scope JWTs (30 days) — a bare user id in
 * the cookie would let anyone impersonate any patient by guessing ids.
 *
 * OTP lifecycle: each send generates a fresh 6-digit code stored as a salted
 * hash with a 5-minute TTL and a 3-attempt budget. In DEMO_MODE the code is
 * also returned in the response (auto-fill) and the well-known 1234 is
 * accepted so the demo never breaks across process restarts. In production
 * the code is delivered out-of-band (SMS/email — see EMAIL_TRANSPORT) and is
 * never echoed by the API.
 */

interface OtpEntry {
  hash: string;
  expiresAt: number;
  attempts: number;
}
const g = globalThis as unknown as { __nxPortalOtps?: Map<string, OtpEntry> };
const otpStore = g.__nxPortalOtps ?? new Map<string, OtpEntry>();
g.__nxPortalOtps = otpStore;

function otpHash(phone: string, code: string): string {
  return createHash("sha256").update(`portal-otp:${phone}:${code}`).digest("hex");
}

function issueOtp(phone: string): string {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  otpStore.set(phone, {
    hash: otpHash(phone, code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  // Opportunistic sweep of expired entries
  if (otpStore.size > 500) {
    const now = Date.now();
    for (const [k, v] of otpStore) if (v.expiresAt < now) otpStore.delete(k);
  }
  return code;
}

function verifyIssuedOtp(phone: string, code: string): boolean {
  const entry = otpStore.get(phone);
  if (!entry || entry.expiresAt < Date.now()) {
    otpStore.delete(phone);
    return false;
  }
  entry.attempts += 1;
  if (entry.attempts > 3) {
    otpStore.delete(phone);
    return false;
  }
  const good = entry.hash === otpHash(phone, code);
  if (good) otpStore.delete(phone);
  return good;
}

const PUBLIC_USER_SELECT = {
  id: true,
  phone: true,
  fullName: true,
  email: true,
  dob: true,
  gender: true,
  bloodGroup: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  abhaId: true,
  profilePhoto: true,
  hospitalPatientUhid: true,
  familyHeadId: true,
  relationToHead: true,
  isOnboarded: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

/**
 * GET  /api/portal/auth           — returns current logged-in PortalUser (or {user:null})
 * POST /api/portal/auth
 *      {action:"send_otp", phone} — {sent:true, otp?} (otp only in demo mode)
 *      {phone, otp}               — verifies OTP, finds-or-creates user, sets 30-day signed cookie
 * DELETE /api/portal/auth         — clears session
 */
export async function GET() {
  try {
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE)?.value;
    if (!raw) return NextResponse.json({ user: null });

    const claims = verifyServiceToken<{ sub: string }>(raw);
    if (!claims) {
      const res = NextResponse.json({ user: null });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    const user = await db.portalUser.findUnique({
      where: { id: claims.sub },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) {
      const res = NextResponse.json({ user: null });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    return NextResponse.json({ user });
  } catch (err) {
    log.error("portal", "auth.get", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ user: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const demo = isDemoMode();
    const ip = ipOf(req);

    // ---- action: send_otp ----
    if (body.action === "send_otp" || body.sendOtp) {
      const phone = String(body.phone || "").trim();
      if (!phone || phone.length < 10) {
        return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
      }
      const rl = rateLimit(`portal-otp:${ip}`, 5, 15 * 60_000);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Too many OTP requests. Try again later." },
          { status: 429 },
        );
      }
      const code = issueOtp(phone);
      if (demo) {
        // Demo only: return the OTP so the frontend can auto-fill it.
        return NextResponse.json({ sent: true, otp: code, demo: true });
      }
      // Production integration point: deliver `code` via SMS/EMAIL provider
      // (EMAIL_TRANSPORT). It is never echoed in the API response.
      const { sendSms } = await import("@/lib/sms");
      const result = await sendSms({
        to: phone,
        body: `Your Nexura OS Portal login code is: ${code}. Valid for 5 minutes.`,
      });

      log.info("portal", "otp.issued", {
        phoneMasked: phone.slice(0, 4) + "***",
        transport: result.transport,
        delivered: result.delivered,
      });
      return NextResponse.json({ sent: result.delivered });
    }

    // ---- verify OTP ----
    const phone = String(body.phone || "").trim();
    const otp = String(body.otp || "").trim();
    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone and OTP are required" }, { status: 400 });
    }
    const rl = rateLimit(`portal-verify:${ip}`, 10, 15 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const valid = verifyIssuedOtp(phone, otp) || (demo && otp === DEMO_OTP);
    if (!valid) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 401 });
    }

    // find-or-create user
    let user = await db.portalUser.findUnique({ where: { phone } });
    if (!user) {
      user = await db.portalUser.create({
        data: {
          phone,
          fullName: phone === "+919820099880" ? "Suresh Nair" : "New Patient",
          isOnboarded: false,
        },
      });
    } else {
      user = await db.portalUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const res = NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
        email: user.email,
        dob: user.dob,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        abhaId: user.abhaId,
        profilePhoto: user.profilePhoto,
        hospitalPatientUhid: user.hospitalPatientUhid,
        familyHeadId: user.familyHeadId,
        relationToHead: user.relationToHead,
        isOnboarded: user.isOnboarded,
      },
    });
    res.cookies.set(SESSION_COOKIE, signServiceToken({ sub: user.id }, `${COOKIE_MAX_AGE_DAYS}d`), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS,
      path: "/",
    });
    return res;
  } catch (err) {
    log.error("portal", "auth.post", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
