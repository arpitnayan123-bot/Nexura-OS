import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const type =
      typeof body?.type === "string" && body.type === "appointment"
        ? "appointment"
        : "early_access";

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "invalid_email" },
        { status: 400 }
      );
    }

    const name = typeof body?.name === "string" ? body.name.trim() : null;
    const specialty =
      typeof body?.specialty === "string" ? body.specialty.trim() : null;
    const slot = typeof body?.slot === "string" ? body.slot.trim() : null;
    const reason =
      typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : null;
    const date =
      typeof body?.date === "string" ? body.date : null;

    const lead = await db.lead.create({
      data: { email, name, type, specialty, slot, reason, date },
    });

    return NextResponse.json({
      ok: true,
      message: type === "appointment" ? "appointment_booked" : "reserved",
      id: lead.id,
    });
  } catch (err) {
    // Fallback: keep working even if the DB is unavailable in this request
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { ok: false, error: "server_error", detail: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [earlyAccess, appointments] = await Promise.all([
      db.lead.count({ where: { type: "early_access" } }),
      db.lead.count({ where: { type: "appointment" } }),
    ]);
    return NextResponse.json({ earlyAccess, appointments });
  } catch {
    return NextResponse.json({ earlyAccess: 0, appointments: 0 });
  }
}
