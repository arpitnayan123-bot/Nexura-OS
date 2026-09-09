import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/connect/connections?doctorId=xxx OR ?patientId=xxx
// Returns connections with lastMessage + unreadCount.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const patientId = searchParams.get("patientId");
    if (!doctorId && !patientId) {
      return NextResponse.json({ error: "no_filter" }, { status: 400 });
    }

    const where: any = { active: true };
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;

    const connections = await db.connectConnection.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, text: true, fromRole: true, fromName: true, createdAt: true, read: true },
        },
      },
    });

    // attach unreadCount (patient messages not yet read by doctor)
    const withCounts = await Promise.all(
      connections.map(async (c) => {
        const unreadCount = await db.connectMessage.count({
          where: { connectionId: c.id, fromRole: "patient", read: false },
        });
        const lastMessage = c.messages[0] || null;
        return {
          ...c,
          lastMessage,
          unreadCount,
          messages: undefined, // strip nested
        };
      })
    );

    return NextResponse.json({ connections: withCounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "connect_list_failed", detail: message }, { status: 500 });
  }
}

// POST /api/connect/connections
// Idempotent: if active connection exists for same doctorId+patientId, update lastConsultDate and return existing.
// Sets whatsappSent=true. Returns {connection, whatsappSent, whatsappMessage}.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      doctorId,
      doctorName,
      doctorSpecialty,
      doctorPhone,
      patientId,
      patientName,
      patientPhone,
      patientAge,
      patientGender,
      source = "clinic",
      sourceRefId,
    } = body as any;

    if (!doctorId || !patientId || !doctorName || !patientName) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Look for existing active connection (idempotent)
    const existing = await db.connectConnection.findFirst({
      where: { doctorId, patientId, active: true },
      orderBy: { updatedAt: "desc" },
    });

    let connection;
    let whatsappSent = false;
    let whatsappMessage: string | null = null;

    if (existing) {
      // Update lastConsultDate + refresh doctor/patient info
      connection = await db.connectConnection.update({
        where: { id: existing.id },
        data: {
          lastConsultDate: new Date(),
          doctorName,
          doctorSpecialty: doctorSpecialty ?? existing.doctorSpecialty,
          doctorPhone: doctorPhone ?? existing.doctorPhone,
          patientName,
          patientPhone: patientPhone ?? existing.patientPhone,
          patientAge: patientAge ?? existing.patientAge,
          patientGender: patientGender ?? existing.patientGender,
          sourceRefId: sourceRefId ?? existing.sourceRefId,
        },
      });

      if (!existing.whatsappSent) {
        whatsappSent = true;
        whatsappMessage = buildWhatsAppMessage(connection);
        await db.connectConnection.update({
          where: { id: existing.id },
          data: { whatsappSent: true, whatsappSentAt: new Date() },
        });
        connection = { ...connection, whatsappSent: true, whatsappSentAt: new Date() };
      } else {
        whatsappMessage = buildWhatsAppMessage(connection);
      }
    } else {
      connection = await db.connectConnection.create({
        data: {
          doctorId,
          doctorName,
          doctorSpecialty: doctorSpecialty ?? null,
          doctorPhone: doctorPhone ?? null,
          patientId,
          patientName,
          patientPhone: patientPhone ?? null,
          patientAge: patientAge ?? null,
          patientGender: patientGender ?? null,
          source,
          sourceRefId: sourceRefId ?? null,
          lastConsultDate: new Date(),
          whatsappSent: true,
          whatsappSentAt: new Date(),
        },
      });
      whatsappSent = true;
      whatsappMessage = buildWhatsAppMessage(connection);
    }

    return NextResponse.json({ connection, whatsappSent, whatsappMessage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "connect_create_failed", detail: message }, { status: 500 });
  }
}

function buildWhatsAppMessage(c: {
  doctorName: string;
  patientName: string;
  patientPhone: string | null;
  doctorSpecialty: string | null;
}): string {
  const greeting = `Hello ${c.patientName}, this is Dr. ${c.doctorName.replace(/^Dr\.?\s*/i, "")}${c.doctorSpecialty ? ` (${c.doctorSpecialty})` : ""} from Nexura Connect.`;
  const body = `Your follow-up channel is now open. You can chat, voice call, or video call me directly through the Nexura patient app. Reply here if you have any questions about your recent consultation or symptoms.`;
  const cta = `Open: https://nexura.ai/connect/patient`;
  return `${greeting}\n\n${body}\n\n${cta}`;
}
