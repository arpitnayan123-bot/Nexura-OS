import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/connect/messages?connectionId=xxx
// Returns messages ASC + connection info.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get("connectionId");
    if (!connectionId) return NextResponse.json({ error: "no_connection" }, { status: 400 });

    const [connection, messages] = await Promise.all([
      db.connectConnection.findUnique({ where: { id: connectionId } }),
      db.connectMessage.findMany({
        where: { connectionId },
        orderBy: { createdAt: "asc" },
        take: 500,
      }),
    ]);

    if (!connection) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ connection, messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "messages_list_failed", detail: message }, { status: 500 });
  }
}

// POST /api/connect/messages
// Body: {connectionId, fromRole, fromName?, text, attachmentType?, attachmentUrl?}
// If fromRole="doctor", mark prior patient messages as read.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { connectionId, fromRole = "patient", fromName, text, attachmentType, attachmentUrl } = body as any;
    if (!connectionId || !text || typeof text !== "string") {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (!["patient", "doctor"].includes(fromRole)) {
      return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    }

    const connection = await db.connectConnection.findUnique({ where: { id: connectionId } });
    if (!connection) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const message = await db.connectMessage.create({
      data: {
        connectionId,
        fromRole,
        fromName: fromName ?? null,
        text: text.slice(0, 4000),
        attachmentType: attachmentType ?? null,
        attachmentUrl: attachmentUrl ?? null,
        read: fromRole === "doctor", // doctor-sent are auto-read
        readAt: fromRole === "doctor" ? new Date() : null,
      },
    });

    // If doctor replies, mark all prior patient messages as read
    if (fromRole === "doctor") {
      await db.connectMessage.updateMany({
        where: { connectionId, fromRole: "patient", read: false },
        data: { read: true, readAt: new Date() },
      });
    }

    // touch updatedAt for sorting
    await db.connectConnection.update({ where: { id: connectionId }, data: { updatedAt: new Date() } });

    return NextResponse.json({ message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "message_create_failed", detail: message }, { status: 500 });
  }
}
