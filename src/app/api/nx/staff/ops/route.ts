import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { fail, guard, withRoute } from "@/lib/nx/api";
import { invalidatePermCache } from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   STAFF OPERATIONS — directory, departments, credentials, shifts,
   on-call, workload. Credential expiry alerts surfaced here.
   ============================================================ */

export const GET = withRoute("staff.ops.list", async (req: NextRequest) => {
  const g = await guard(req, "staff.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);

  const [staff, departments, credentials, shifts, workload] = await Promise.all([
    db.nxStaffUser.findMany({
      where: { hospitalId },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        staffCode: true,
        name: true,
        role: true,
        department: true,
        speciality: true,
        phone: true,
        email: true,
        onDuty: true,
        shift: true,
        status: true,
        lastLoginAt: true,
        mfaEnabled: true,
        emailVerifiedAt: true,
      },
    }),
    db.nxDepartment.findMany({
      where: { hospitalId },
      orderBy: { name: "asc" },
      include: { _count: { select: { staff: true } } },
    }),
    db.nxCredential.findMany({
      where: {
        user: { hospitalId },
        expiresAt: { lte: new Date(Date.now() + 90 * 24 * 3600_000) },
      },
      orderBy: { expiresAt: "asc" },
      include: { user: { select: { name: true, staffCode: true } } },
      take: 30,
    }),
    db.nxShiftAssignment.findMany({
      where: { hospitalId, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      orderBy: { date: "asc" },
      include: { user: { select: { name: true, staffCode: true, role: true } } },
      take: 60,
    }),
    db.nxTask.groupBy({
      by: ["assignedToUserId"],
      where: {
        hospitalId,
        status: {
          in: ["new", "assigned", "in_progress", "blocked", "waiting", "escalated", "open"],
        },
        assignedToUserId: { not: null },
      },
      _count: true,
    }),
  ]);

  const onDuty = staff.filter((s) => s.onDuty && s.status === "active").length;
  return NextResponse.json({
    data: {
      staff,
      departments: departments.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        floor: d.floor,
        staff: d._count.staff,
      })),
      credentialAlerts: credentials.map((c) => ({
        id: c.id,
        staff: c.user.name,
        staffCode: c.user.staffCode,
        kind: c.kind,
        name: c.name,
        expiresAt: c.expiresAt,
        verified: c.verified,
        expiringSoon: c.expiresAt < new Date(Date.now() + 30 * 24 * 3600_000),
      })),
      shifts: shifts.map((s) => ({
        id: s.id,
        staff: s.user.name,
        staffCode: s.user.staffCode,
        role: s.user.role,
        date: s.date,
        shift: s.shift,
        onCall: s.onCall,
      })),
      workload: workload.map((w) => ({ userId: w.assignedToUserId, openTasks: w._count })),
      stats: {
        total: staff.length,
        onDuty,
        mfaAdoption: staff.filter((s) => s.mfaEnabled).length,
        unverifiedEmails: staff.filter((s) => s.email && !s.emailVerifiedAt).length,
      },
    },
  });
});

const CredentialSchema = z.object({
  staffUserId: z.string().min(3),
  kind: z.enum(["license", "certification", "training", "badge"]).default("license"),
  name: z.string().min(2).max(160),
  issuedBy: z.string().max(120).optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime(),
});

export const POST = withRoute("staff.credential.create", async (req: NextRequest) => {
  const g = await guard(req, "staff.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = CredentialSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);
  const user = await db.nxStaffUser.findFirst({
    where: { id: parsed.data.staffUserId, hospitalId },
  });
  if (!user) return fail("not_found", 404, "Staff member not found.");
  const cred = await db.nxCredential.create({
    data: {
      staffUserId: user.id,
      kind: parsed.data.kind,
      name: parsed.data.name,
      issuedBy: parsed.data.issuedBy,
      issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : null,
      expiresAt: new Date(parsed.data.expiresAt),
    },
  });
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "staff.credential.create",
    entityType: "nx_credential",
    entityId: cred.id,
    detail: { staff: user.staffCode, name: cred.name },
  });
  return NextResponse.json({ data: { credential: cred } }, { status: 201 });
});

const ShiftSchema = z.object({
  staffUserId: z.string().min(3),
  date: z.string().datetime(),
  shift: z.enum(["morning", "evening", "night"]).default("morning"),
  onCall: z.boolean().default(false),
  note: z.string().max(200).optional(),
});

export const PUT = withRoute("staff.shift.assign", async (req: NextRequest) => {
  const g = await guard(req, "staff.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = ShiftSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);
  const user = await db.nxStaffUser.findFirst({
    where: { id: parsed.data.staffUserId, hospitalId },
  });
  if (!user) return fail("not_found", 404, "Staff member not found.");
  const day = new Date(parsed.data.date);
  day.setHours(0, 0, 0, 0);
  const assignment = await db.nxShiftAssignment.create({
    data: {
      staffUserId: user.id,
      hospitalId,
      date: day,
      shift: parsed.data.shift,
      onCall: parsed.data.onCall,
      note: parsed.data.note,
    },
  });
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "staff.shift.assign",
    entityType: "nx_shift_assignment",
    entityId: assignment.id,
    detail: { staff: user.staffCode, shift: parsed.data.shift, onCall: parsed.data.onCall },
  });
  return NextResponse.json({ data: { assignment } }, { status: 201 });
});

/** PATCH — suspend / reactivate a staff account (users.manage required). */
export const PATCH = withRoute("staff.status", async (req: NextRequest) => {
  const g = await guard(req, "users.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const body = (await req.json().catch(() => ({}))) as {
    staffUserId?: string;
    status?: "active" | "suspended" | "deactivated";
  };
  if (!body.staffUserId || !body.status)
    return fail("invalid_request", 400, "staffUserId and status required.");
  const user = await db.nxStaffUser.findFirst({ where: { id: body.staffUserId, hospitalId } });
  if (!user) return fail("not_found", 404, "Staff member not found.");
  if (user.id === g.session.userId)
    return fail("invalid_request", 422, "You cannot change your own account status.");
  await db.$transaction([
    db.nxStaffUser.update({
      where: { id: user.id },
      data: { status: body.status, failedAttempts: 0, lockedUntil: null },
    }),
    ...(body.status !== "active"
      ? [
          db.nxSessionRecord.updateMany({
            where: { userId: user.id, revokedAt: null },
            data: { revokedAt: new Date(), revokedReason: `account_${body.status}` },
          }),
        ]
      : []),
  ]);
  invalidatePermCache(user.id);
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: `staff.account.${body.status}`,
    entityType: "nx_staff_user",
    entityId: user.id,
    detail: { staff: user.staffCode },
  });
  return NextResponse.json({ data: { status: body.status } });
});
