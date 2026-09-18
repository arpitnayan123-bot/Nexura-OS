import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionFresh, hasPermission, requirePermission } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";
import { publish } from "@/lib/nx/bus";
import { fail, requireHospitalContext, withRoute } from "@/lib/nx/api";
import { ciFilter } from "@/lib/nx/db-dialect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   CARE COMMUNICATION v2 — context-scoped channels with privacy.
   Channel kinds: shift (handover), department, emergency,
   care-team (patient-scoped), direct.
   Patient-channel messages are only returned to users with
   patient.clinical.view; the channel list marks restricted ones.
   Mentions + read receipts + pinned + severity + live delivery.
   ============================================================ */

export const GET = withRoute("messages.list", async (req: NextRequest) => {
  const g = await requirePermission(req, "communication.send");
  if ("error" in g)
    return NextResponse.json({ error: g.error, detail: g.detail }, { status: g.status });
  const session = g.session;
  const hospitalCtx = await requireHospitalContext(session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") || "shift-handover";
  const q = searchParams.get("q")?.trim();

  const perms = g.perms;
  const canClinical = hasPermission(perms, "patient.clinical.view");

  const messages = await db.nxMessage.findMany({
    where: {
      hospitalId,
      channelKey: channel,
      ...(q ? { body: ciFilter(q) } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 120,
    include: { reads: { select: { userId: true, readAt: true } } },
  });

  // patient-channel privacy: hide bodies from users without clinical view
  const isPatientChannel = channel.startsWith("care-team:");
  const safeMessages = messages.map((m) => ({
    id: m.id,
    sender: m.senderName,
    role: m.senderRole,
    body: isPatientChannel && !canClinical ? "— restricted (patient channel) —" : m.body,
    severity: m.severity,
    mentions: m.mentions ? JSON.parse(m.mentions) : [],
    attachments: m.attachments ? JSON.parse(m.attachments) : [],
    pinned: m.pinned,
    patientId: m.patientId,
    at: m.createdAt,
    readBy: m.reads.length,
  }));

  // channel directory: system channels + live care teams + departments
  const [admissions, departments] = await Promise.all([
    db.hospitalAdmission.findMany({
      where: { hospitalId, dischargeStatus: "active" },
      include: {
        patient: { select: { fullName: true, uhid: true } },
        bed: { include: { ward: true } },
      },
      take: 14,
      orderBy: { admissionDate: "desc" },
    }),
    db.nxDepartment.findMany({ where: { hospitalId }, take: 12 }),
  ]);

  const unread = await db.nxMessage.count({
    where: {
      hospitalId,
      channelKey: channel,
      createdAt: { gt: new Date(Date.now() - 24 * 3600_000) },
      senderName: { not: session.name },
      reads: { none: { userId: session.userId } },
    },
  });

  return NextResponse.json({
    messages: safeMessages,
    unreadInChannel: unread,
    restrictedChannel: isPatientChannel && !canClinical,
    channels: [
      { key: "shift-handover", label: "Shift Handover", kind: "shift" },
      {
        key: "emergency",
        label: "Emergency",
        kind: "emergency" as const,
        severity: "urgent" as const,
      },
      { key: "dept-internal-medicine", label: "Internal Medicine", kind: "department" },
      ...departments
        .filter((d) => !["Internal Medicine"].includes(d.name))
        .map((d) => ({ key: `dept:${d.code}`, label: d.name, kind: "department" })),
      ...admissions.map((a) => ({
        key: `care-team:${a.id}`,
        label: `${a.patient.fullName} · ${a.bed?.bedNumber || "IPD"}`,
        kind: "care-team",
        patientId: a.patientId,
        restricted: !canClinical,
      })),
    ] as Array<{
      key: string;
      label: string;
      kind: string;
      patientId?: string;
      restricted?: boolean;
      severity?: string;
    }>,
  });
});

const PostSchema = z.object({
  channel: z.string().min(2).max(120),
  body: z.string().min(1).max(2000),
  severity: z.enum(["normal", "urgent"]).default("normal"),
  mentions: z.array(z.string().max(40)).max(10).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().max(160),
        size: z.number().int().max(10_000_000),
        mime: z.string().max(80),
      }),
    )
    .max(5)
    .optional(),
  patientId: z.string().optional(),
});

export const POST = withRoute("messages.post", async (req: NextRequest) => {
  const g = await requirePermission(req, "communication.send");
  if ("error" in g)
    return NextResponse.json({ error: g.error, detail: g.detail }, { status: g.status });
  const session = g.session;
  const hospitalCtx = await requireHospitalContext(session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);

  const parsed = PostSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);
  const d = parsed.data;

  // Patient-channel privacy: posting to a care-team channel requires clinical view
  if (d.channel.startsWith("care-team:") && !hasPermission(g.perms, "patient.clinical.view")) {
    return NextResponse.json(
      { error: "forbidden", detail: "patient_channel_requires_clinical_view" },
      { status: 403 },
    );
  }
  // Emergency channel posts marked urgent automatically escalate severity
  const severity = d.channel === "emergency" ? "urgent" : d.severity;

  const message = await db.nxMessage.create({
    data: {
      hospitalId,
      channelKey: d.channel,
      senderName: session.name,
      senderRole: session.role,
      senderUserId: session.userId,
      body: d.body.trim(),
      severity,
      mentions: d.mentions ? JSON.stringify(d.mentions) : null,
      attachments: d.attachments ? JSON.stringify(d.attachments) : null,
      patientId:
        d.patientId || (d.channel.startsWith("care-team:") ? d.channel.split(":")[1] : null),
    },
  });

  // Mention notifications
  if (d.mentions?.length) {
    for (const code of d.mentions.slice(0, 5)) {
      const target = await db.nxStaffUser.findFirst({
        where: { hospitalId, staffCode: code.toUpperCase() },
        select: { id: true, name: true },
      });
      if (target) {
        await db.nxNotification.create({
          data: {
            hospitalId,
            userId: target.id,
            title: `${session.name} mentioned you`,
            body: d.body.slice(0, 140),
            level: severity === "urgent" ? "warning" : "info",
            category: "message",
            link: `messages:${d.channel}`,
          },
        });
      }
    }
  }

  await audit({
    hospitalId,
    actorName: session.name,
    actorRole: session.role,
    action: severity === "urgent" ? "message.post.urgent" : "message.post",
    entityType: "NxMessage",
    entityId: message.id,
    patientId: message.patientId || undefined,
    detail: { channel: message.channelKey },
  });
  publish({
    event: "message.new",
    hospitalId,
    channelKey: d.channel,
    toRoles: [
      "super_admin",
      "org_admin",
      "hospital_admin",
      "dept_admin",
      "doctor",
      "nurse",
      "care_coordinator",
      "receptionist",
      "pharmacist",
      "lab_tech",
      "radiology_tech",
      "billing_officer",
      "inventory_manager",
      "hr_manager",
      "leadership",
      "command",
      "facilities",
      "admin",
    ],
    data: {
      id: message.id,
      channel: d.channel,
      sender: session.name,
      severity,
      preview: d.body.slice(0, 80),
    },
  });
  return NextResponse.json({ data: { message } }, { status: 201 });
});

/** PATCH — mark channel read / pin / unpin. */
export const PATCH = withRoute("messages.manage", async (req: NextRequest) => {
  const g = await requirePermission(req, "communication.send");
  if ("error" in g)
    return NextResponse.json({ error: g.error, detail: g.detail }, { status: g.status });
  const session = g.session;
  const body = (await req.json().catch(() => ({}))) as {
    messageId?: string;
    pin?: boolean;
    readChannel?: string;
  };

  if (body.readChannel) {
    const since = new Date(Date.now() - 7 * 24 * 3600_000);
    const unread = await db.nxMessage.findMany({
      where: {
        hospitalId: session.hospitalId!,
        channelKey: body.readChannel,
        senderUserId: { not: session.userId },
        createdAt: { gte: since },
        reads: { none: { userId: session.userId } },
      },
      select: { id: true },
      take: 200,
    });
    if (unread.length) {
      await db.nxMessageRead.createMany({
        data: unread.map((m) => ({ messageId: m.id, userId: session.userId })),
      });
    }
    await db.nxChannelMember
      .updateMany({
        where: { userId: session.userId, channel: { key: body.readChannel } },
        data: { lastReadAt: new Date() },
      })
      .catch(() => {});
    return NextResponse.json({ data: { read: unread.length } });
  }

  if (body.messageId && typeof body.pin === "boolean") {
    const msg = await db.nxMessage.findFirst({
      where: { id: body.messageId, hospitalId: session.hospitalId! },
    });
    if (!msg) return fail("not_found", 404, "Message not found.");
    const updated = await db.nxMessage.update({
      where: { id: msg.id },
      data: { pinned: body.pin },
    });
    await audit({
      hospitalId: session.hospitalId!,
      actorName: session.name,
      actorRole: session.role,
      action: body.pin ? "message.pin" : "message.unpin",
      entityType: "NxMessage",
      entityId: msg.id,
      detail: { channel: msg.channelKey },
    });
    return NextResponse.json({ data: { message: updated } });
  }
  return fail("invalid_request", 400, "Provide readChannel or messageId+pin.");
});
void getSessionFresh;
