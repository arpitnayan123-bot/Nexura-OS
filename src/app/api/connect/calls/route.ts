import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectGate, connectPartyDenied, connectCallsListDenied, doctorOnly } from "@/lib/nx/connect-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/connect/calls?doctorId=xxx OR ?connectionId=xxx
// Returns call logs (most recent first).
export async function GET(req: NextRequest) {
  const __gate = connectGate(req);
  if (__gate) return __gate;
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const connectionId = searchParams.get("connectionId");
    if (!doctorId && !connectionId) {
      return NextResponse.json({ error: "no_filter" }, { status: 400 });
    }

    const where: any = {};
    if (connectionId) where.connectionId = connectionId;
    if (doctorId) where.connection = { doctorId };

    // p2-hardening-1: caller must be a party to the threads they read.
    const listDenied = await connectCallsListDenied(req, { connectionId, doctorId });
    if (listDenied) return listDenied;

    const calls = await db.connectCall.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { connection: { select: { id: true, doctorName: true, patientName: true, patientId: true, doctorId: true } } },
    });

    return NextResponse.json({ calls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "calls_list_failed", detail: message }, { status: 500 });
  }
}

// POST /api/connect/calls
// Body: {connectionId, type:"voice"|"video", initiatedBy}
// Creates a call with status="initiated".
export async function POST(req: NextRequest) {
  const __gate = connectGate(req);
  if (__gate) return __gate;
  try {
    const body = await req.json().catch(() => ({}));
    const { connectionId, type = "video", initiatedBy = "patient" } = body as any;
    if (!connectionId) return NextResponse.json({ error: "no_connection" }, { status: 400 });
    if (!["voice", "video"].includes(type)) return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    if (!["patient", "doctor"].includes(initiatedBy)) return NextResponse.json({ error: "invalid_initiator" }, { status: 400 });

    const connection = await db.connectConnection.findUnique({ where: { id: connectionId } });
    if (!connection) return NextResponse.json({ error: "not_found" }, { status: 404 });
    // p2-hardening-1: caller must be a party to THIS thread.
    const party = await connectPartyDenied(req, connection);
    if (party) return party;

    const call = await db.connectCall.create({
      data: {
        connectionId,
        type,
        status: "initiated",
        initiatedBy,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ call });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "call_create_failed", detail: message }, { status: 500 });
  }
}

// PATCH /api/connect/calls
// Body: {callId, status, durationSec?, callSummary?, prescriptionJson?}
// Sets answeredAt/endedAt based on status. Clinician-only: summaries
// and prescription payloads are clinician-authored clinical records.
export async function PATCH(req: NextRequest) {
  const __gate = connectGate(req);
  if (__gate) return __gate;
  const denied = doctorOnly(req);
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    const { callId, status, durationSec, callSummary, prescriptionJson } = body as any;
    if (!callId || !status) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

    const existing = await db.connectCall.findUnique({ where: { id: callId } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const data: any = { status };
    if (status === "answered" && !existing.answeredAt) data.answeredAt = new Date();
    if (status === "ended" || status === "missed" || status === "cancelled") {
      data.endedAt = new Date();
      if (typeof durationSec === "number") data.durationSec = durationSec;
    }
    if (typeof callSummary === "string") data.callSummary = callSummary;
    if (prescriptionJson !== undefined) data.prescriptionJson = prescriptionJson;

    const call = await db.connectCall.update({ where: { id: callId }, data });
    return NextResponse.json({ call });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "call_update_failed", detail: message }, { status: 500 });
  }
}
