import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { fail, guard, withRoute } from "@/lib/nx/api";
import {
  PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  invalidatePermCache,
  type NxRole,
} from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   PERMISSION MATRIX MANAGEMENT (roles.manage)
   GET — the full matrix + per-user grants/delegations.
   POST — grant/revoke a user role (audited, cache-invalidating).
   PATCH — grant/revoke an explicit permission allow/deny.
   ============================================================ */

export const GET = withRoute("permissions.matrix", async (req: NextRequest) => {
  const g = await guard(req, "roles.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);

  const matrix = Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => ({
    role,
    label: ROLE_LABELS[role as NxRole],
    permissions: perms,
  }));
  const userId = req.nextUrl.searchParams.get("userId");
  const [staff, assignments, grants, delegations] = await Promise.all([
    db.nxStaffUser.findMany({
      where: { hospitalId },
      select: { id: true, staffCode: true, name: true, role: true, department: true },
      orderBy: { name: "asc" },
    }),
    db.nxUserRoleAssignment.findMany({
      where: { user: { hospitalId }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { user: { select: { staffCode: true, name: true } } },
    }),
    db.nxPermissionGrant.findMany({
      where: { user: { hospitalId }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { user: { select: { staffCode: true, name: true } } },
    }),
    db.nxDelegation.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
        OR: [{ granter: { hospitalId } }, { delegate: { hospitalId } }],
      },
      include: {
        granter: { select: { staffCode: true, name: true } },
        delegate: { select: { staffCode: true, name: true } },
      },
    }),
  ]);
  return NextResponse.json({
    data: {
      permissions: PERMISSIONS,
      matrix,
      staff: userId ? staff.filter((s) => s.id === userId) : staff,
      assignments,
      grants,
      delegations,
    },
  });
});

const RoleSchema = z.object({
  userId: z.string().min(3),
  roleKey: z.string().min(2),
  action: z.enum(["assign", "revoke"]),
  expiresAt: z.string().datetime().optional(),
});

export const POST = withRoute("permissions.role.assign", async (req: NextRequest) => {
  const g = await guard(req, "roles.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = RoleSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);
  const user = await db.nxStaffUser.findFirst({ where: { id: parsed.data.userId, hospitalId } });
  if (!user) return fail("not_found", 404, "Staff member not found.");
  if (!(parsed.data.roleKey in ROLE_PERMISSIONS))
    return fail("invalid_request", 400, "Unknown role key.");
  // Privilege-escalation wall: a granter may never assign a role broader than
  // their own (hospital_admin cannot mint super_admin/org_admin).
  const isPlatform = g.session.role === "super_admin" || g.session.role === "org_admin";
  if (!isPlatform && parsed.data.action === "assign") {
    const granterPerms = ROLE_PERMISSIONS[g.session.role] ?? [];
    const targetPerms =
      ROLE_PERMISSIONS[parsed.data.roleKey as keyof typeof ROLE_PERMISSIONS] ?? [];
    const exceeds = targetPerms.some((perm) => !granterPerms.includes(perm));
    if (exceeds)
      return fail("privilege_escalation", 403, "You cannot assign a role broader than your own.");
  }

  if (parsed.data.action === "assign") {
    const existing = await db.nxUserRoleAssignment.findFirst({
      where: {
        userId: user.id,
        roleKey: parsed.data.roleKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (existing) return NextResponse.json({ data: { already: true } });
    await db.nxUserRoleAssignment.create({
      data: {
        userId: user.id,
        roleKey: parsed.data.roleKey,
        grantedBy: g.session.name,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });
  } else {
    await db.nxUserRoleAssignment.deleteMany({
      where: { userId: user.id, roleKey: parsed.data.roleKey },
    });
  }
  invalidatePermCache(user.id);
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: `permission.role.${parsed.data.action}`,
    entityType: "nx_staff_user",
    entityId: user.id,
    detail: {
      roleKey: parsed.data.roleKey,
      staff: user.staffCode,
      expiresAt: parsed.data.expiresAt ?? null,
    },
  });
  return NextResponse.json({ data: { done: true } });
});

const GrantSchema = z.object({
  userId: z.string().min(3),
  permission: z.string().min(3),
  effect: z.enum(["allow", "deny"]).default("allow"),
  reason: z.string().max(300).optional(),
  hours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .optional(),
});

export const PATCH = withRoute("permissions.grant", async (req: NextRequest) => {
  const g = await guard(req, "roles.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = GrantSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);
  if (!(PERMISSIONS as readonly string[]).includes(parsed.data.permission))
    return fail("invalid_request", 400, "Unknown permission key.");
  const user = await db.nxStaffUser.findFirst({ where: { id: parsed.data.userId, hospitalId } });
  if (!user) return fail("not_found", 404, "Staff member not found.");

  await db.nxPermissionGrant.deleteMany({
    where: { userId: user.id, permission: parsed.data.permission },
  });
  if (parsed.data.effect === "allow" || parsed.data.reason) {
    await db.nxPermissionGrant.create({
      data: {
        userId: user.id,
        permission: parsed.data.permission,
        effect: parsed.data.effect,
        reason: parsed.data.reason,
        grantedBy: g.session.name,
        expiresAt: parsed.data.hours ? new Date(Date.now() + parsed.data.hours * 3600_000) : null,
      },
    });
  }
  invalidatePermCache(user.id);
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: `permission.${parsed.data.effect}`,
    entityType: "nx_staff_user",
    entityId: user.id,
    detail: {
      permission: parsed.data.permission,
      staff: user.staffCode,
      reason: parsed.data.reason ?? null,
    },
  });
  return NextResponse.json({ data: { done: true } });
});

/** DELETE — revoke a delegation early. */
export const DELETE = withRoute("permissions.delegation.revoke", async (req: NextRequest) => {
  const g = await guard(req, "delegation.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("invalid_request", 400, "id required.");
  const del = await db.nxDelegation.findFirst({
    where: { id, OR: [{ granter: { hospitalId } }, { delegate: { hospitalId } }] },
  });
  if (!del) return fail("not_found", 404, "Delegation not found.");
  await db.nxDelegation.update({ where: { id }, data: { revokedAt: new Date() } });
  invalidatePermCache(del.toUserId);
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "permission.delegation.revoke",
    entityType: "nx_delegation",
    entityId: id,
  });
  return NextResponse.json({ data: { revoked: true } });
});
