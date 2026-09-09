import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — secure care-team messages by channel. */
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const hospitalId = session.hospitalId || (await db.hospital.findFirst())?.id;

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") || "shift-handover";

  const messages = await db.nxMessage.findMany({
    where: { hospitalId, channelKey: channel },
    orderBy: { createdAt: "asc" },
    take: 80,
  });

  // channel directory: active care teams + departments
  const admissions = await db.hospitalAdmission.findMany({
    where: { hospitalId, dischargeStatus: "active" },
    include: { patient: { select: { fullName: true, uhid: true } }, bed: { include: { ward: true } } },
    take: 12,
  });

  return NextResponse.json({
    messages: messages.map((m) => ({ id: m.id, sender: m.senderName, role: m.senderRole, body: m.body, at: m.createdAt, patientId: m.patientId })),
    channels: [
      { key: "shift-handover", label: "Shift Handover", kind: "department" },
      { key: "dept-internal-medicine", label: "Internal Medicine", kind: "department" },
      { key: "dept-emergency", label: "Emergency", kind: "department" },
      ...admissions.map((a) => ({
        key: `care-team:${a.id}`,
        label: `${a.patient.fullName} · ${a.bed?.bedNumber || "IPD"}`,
        kind: "care-team",
        patientId: a.patientId,
      })),
    ],
  });
}

/** POST — post a message to a channel (context-aware, audited). */
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const hospitalId = session.hospitalId || (await db.hospital.findFirst())?.id;
  const body = await req.json().catch(() => ({}));
  if (!body.channel || !body.body?.trim()) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const message = await db.nxMessage.create({
    data: {
      hospitalId: hospitalId!,
      channelKey: String(body.channel),
      senderName: session.name,
      senderRole: session.role,
      body: String(body.body).slice(0, 2000),
      patientId: body.patientId || null,
    },
  });
  await audit({
    hospitalId: hospitalId!, actorName: session.name, actorRole: session.role,
    action: "message.post", entityType: "NxMessage", entityId: message.id, patientId: message.patientId || undefined,
    detail: { channel: message.channelKey },
  });
  return NextResponse.json({ message });
}
