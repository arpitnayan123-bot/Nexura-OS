import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectGate } from "@/lib/nx/connect-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/connect/queue?doctorId=xxx
// Returns grouped by mode: {queue:{chat:[],voice:[],video:[]}, totalWaiting}.
export async function GET(req: NextRequest) {
  const __gate = connectGate(req);
  if (__gate) return __gate;
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const where: any = { status: "waiting" };
    if (doctorId) where.connection = { doctorId };

    const entries = await db.connectQueue.findMany({
      where,
      orderBy: { joinedAt: "asc" },
      take: 200,
      include: {
        connection: {
          select: {
            id: true,
            doctorId: true,
            doctorName: true,
            doctorSpecialty: true,
            patientId: true,
            patientName: true,
            patientPhone: true,
            patientAge: true,
            patientGender: true,
            source: true,
          },
        },
      },
    });

    const grouped = { chat: [] as any[], voice: [] as any[], video: [] as any[] };
    for (const e of entries) {
      const mode = (grouped as any)[e.requestedMode] ?? grouped.chat;
      mode.push(e);
    }

    return NextResponse.json({
      queue: grouped,
      totalWaiting: entries.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "queue_list_failed", detail: message }, { status: 500 });
  }
}

// POST /api/connect/queue
// Body: {connectionId, requestedMode, reason?}
// Creates a waiting entry.
export async function POST(req: NextRequest) {
  const __gate = connectGate(req);
  if (__gate) return __gate;
  try {
    const body = await req.json().catch(() => ({}));
    const { connectionId, requestedMode = "chat", reason } = body as any;
    if (!connectionId) return NextResponse.json({ error: "no_connection" }, { status: 400 });
    if (!["chat", "voice", "video"].includes(requestedMode)) {
      return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
    }

    const connection = await db.connectConnection.findUnique({ where: { id: connectionId } });
    if (!connection) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const entry = await db.connectQueue.create({
      data: {
        connectionId,
        requestedMode,
        reason: reason ?? null,
        status: "waiting",
      },
    });

    return NextResponse.json({ queue: entry });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "queue_create_failed", detail: message }, { status: 500 });
  }
}

// PATCH /api/connect/queue
// Body: {queueId, doctorId}
// Sets status="picked_up", pickedUpAt, pickedUpByDoctorId.
export async function PATCH(req: NextRequest) {
  const __gate = connectGate(req);
  if (__gate) return __gate;
  try {
    const body = await req.json().catch(() => ({}));
    const { queueId, doctorId } = body as any;
    if (!queueId || !doctorId) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

    const existing = await db.connectQueue.findUnique({ where: { id: queueId } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.status !== "waiting") {
      return NextResponse.json({ error: "already_picked", status: existing.status }, { status: 409 });
    }

    const queue = await db.connectQueue.update({
      where: { id: queueId },
      data: { status: "picked_up", pickedUpAt: new Date(), pickedUpByDoctorId: doctorId },
    });

    return NextResponse.json({ queue });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "queue_update_failed", detail: message }, { status: 500 });
  }
}
