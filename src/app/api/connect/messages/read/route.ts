import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectGate, connectPartyDenied } from "@/lib/nx/connect-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/connect/messages/read
// Body: {connectionId, readByRole}
// Marks all messages from the OTHER role as read.
export async function PATCH(req: NextRequest) {
  const __gate = connectGate(req);
  if (__gate) return __gate;
  try {
    const body = await req.json().catch(() => ({}));
    const { connectionId, readByRole } = body as any;
    if (!connectionId || !["doctor", "patient"].includes(readByRole)) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    // p2-hardening-1: only a party to this thread may mark it read.
    const connection = await db.connectConnection.findUnique({
      where: { id: connectionId },
      select: { doctorId: true, patientId: true },
    });
    if (!connection) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const party = await connectPartyDenied(req, connection);
    if (party) return party;

    // If doctor is reading, mark patient messages as read. And vice-versa.
    const oppositeRole = readByRole === "doctor" ? "patient" : "doctor";
    const result = await db.connectMessage.updateMany({
      where: { connectionId, fromRole: oppositeRole, read: false },
      data: { read: true, readAt: new Date() },
    });

    return NextResponse.json({ ok: true, marked: result.count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "mark_read_failed", detail: message }, { status: 500 });
  }
}
