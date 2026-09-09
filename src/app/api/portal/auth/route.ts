import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "portal_session";
const DEMO_OTP = "1234";
const COOKIE_MAX_AGE_DAYS = 30;

/**
 * GET  /api/portal/auth           — returns current logged-in PortalUser (or {user:null})
 * POST /api/portal/auth
 *      {action:"send_otp", phone} — returns {sent:true, otp:"1234"} (demo)
 *      {phone, otp}               — verifies OTP, finds-or-creates user, sets 30-day cookie
 * DELETE /api/portal/auth         — clears session
 */
export async function GET() {
  try {
    const store = await cookies();
    const userId = store.get(SESSION_COOKIE)?.value;
    if (!userId) return NextResponse.json({ user: null });

    const user = await db.portalUser.findUnique({
      where: { id: userId },
      select: {
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
      },
    });

    if (!user) {
      const res = NextResponse.json({ user: null });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[portal/auth] GET error", err);
    return NextResponse.json({ user: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // ---- action: send_otp ----
    if (body.action === "send_otp" || body.sendOtp) {
      const phone = String(body.phone || "").trim();
      if (!phone || phone.length < 10) {
        return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
      }
      // Demo: return the OTP so the frontend can auto-fill it
      return NextResponse.json({ sent: true, otp: DEMO_OTP, demo: true });
    }

    // ---- verify OTP ----
    const phone = String(body.phone || "").trim();
    const otp = String(body.otp || "").trim();
    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone and OTP are required" }, { status: 400 });
    }
    if (otp !== DEMO_OTP) {
      return NextResponse.json({ error: "Invalid OTP. Demo OTP is 1234." }, { status: 401 });
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
    res.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("[portal/auth] POST error", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
