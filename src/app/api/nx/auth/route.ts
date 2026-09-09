import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { generateAccessToken } from "@/lib/auth/jwt";
import { getSession, modulesForRole, type NxRole } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — staff login (staffCode + PIN). Demo PIN for all seeded staff: 2468 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const staffCode = String(body.staffCode || "").trim().toUpperCase();
    const pin = String(body.pin || "").trim();
    if (!staffCode || !pin) return NextResponse.json({ error: "missing_credentials" }, { status: 400 });

    const staff = await db.nxStaffUser.findUnique({ where: { staffCode } });
    if (!staff) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    const ok = await bcrypt.compare(pin, staff.pinHash);
    if (!ok) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

    const token = generateAccessToken({
      id: staff.id,
      name: staff.name,
      role: staff.role as never,
      hospitalId: staff.hospitalId,
    });
    const res = NextResponse.json({
      user: { id: staff.id, name: staff.name, role: staff.role, department: staff.department, hospitalId: staff.hospitalId },
      modules: modulesForRole(staff.role as NxRole),
    });
    res.cookies.set("nx_access", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 3600,
    });
    await audit({
      hospitalId: staff.hospitalId,
      actorName: staff.staffCode,
      actorRole: staff.role,
      action: "auth.login",
      entityType: "nx_session",
      detail: { method: "staffCode+pin" },
    });
    return res;
  } catch {
    return NextResponse.json({ error: "login_failed" }, { status: 500 });
  }
}

/** GET — current session */
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ user: null }, { status: 200 });
  const staff = await db.nxStaffUser.findUnique({ where: { id: session.userId } }).catch(() => null);
  if (!staff) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: staff.id, name: staff.name, role: staff.role, department: staff.department, hospitalId: staff.hospitalId, shift: staff.shift },
    modules: modulesForRole(staff.role as NxRole),
  });
}

/** DELETE — logout */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("nx_access", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
