import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";

/* ============================================================
   NEXURA HOSPITAL OS — PERMISSIONS AS DATA
   A single source of truth for roles → permissions.
   Roles are data, permissions are data, scoping is explicit.
   The UI mirrors this matrix, but every API enforces it here.
   ============================================================ */

export type NxRole =
  | "super_admin"
  | "org_admin"
  | "hospital_admin"
  | "dept_admin"
  | "doctor"
  | "nurse"
  | "care_coordinator"
  | "receptionist"
  | "pharmacist"
  | "lab_tech"
  | "radiology_tech"
  | "billing_officer"
  | "inventory_manager"
  | "hr_manager"
  | "patient"
  | "auditor"
  // legacy keys kept working (mapped below)
  | "leadership"
  | "command"
  | "facilities"
  | "admin";

/** Every permission the platform understands. */
export const PERMISSIONS = [
  "patient.demographics.view",
  "patient.clinical.view",
  "patient.restricted.view",
  "patient.create",
  "encounter.create",
  "note.edit",
  "note.sign",
  "medication.order.create",
  "medication.order.view",
  "medication.administer",
  "medication.dispense",
  "beds.manage",
  "bed.assign",
  "appointments.manage",
  "appointments.view",
  "communication.send",
  "billing.view",
  "billing.manage",
  "reports.export",
  "analytics.view",
  "users.manage",
  "roles.manage",
  "staff.manage",
  "settings.manage",
  "audit.view",
  "emergency.access",
  "labs.result.enter",
  "labs.result.verify",
  "imaging.report.write",
  "inventory.manage",
  "tasks.manage",
  "features.manage",
  "delegation.manage",
  "breakglass.invoke",
  "consent.manage",
  "demo.reset",
  "tenants.manage",
  "gateway.manage",
  "security.manage",
] as const;
export type NxPermission = (typeof PERMISSIONS)[number];

export const ROLE_LABELS: Record<NxRole, string> = {
  super_admin: "Platform Super Admin",
  org_admin: "Organization Admin",
  hospital_admin: "Hospital Administrator",
  dept_admin: "Department Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  care_coordinator: "Care Coordinator",
  receptionist: "Receptionist",
  pharmacist: "Pharmacist",
  lab_tech: "Lab Technician",
  radiology_tech: "Radiology Technician",
  billing_officer: "Billing Officer",
  inventory_manager: "Inventory Manager",
  hr_manager: "HR / Staff Manager",
  patient: "Patient",
  auditor: "Read-only Auditor",
  leadership: "Operations Executive",
  command: "Command Center",
  facilities: "Facilities",
  admin: "Administrator (legacy)",
};

/** Role → module gates (OS shells). Kept in sync with permission matrix. */
export const MODULES = [
  "command-center", "patients", "journey", "tasks", "schedule", "beds", "ed",
  "doctor", "nurse", "or", "labs", "pharmacy", "orders", "billing", "inventory",
  "equipment", "analytics", "incidents", "automations", "messages", "audit",
  "integrations", "admin", "staff", "reports",
] as const;
export type NxModule = (typeof MODULES)[number];

const ALL_MODULES = MODULES as unknown as NxModule[];

/** The permission matrix. Roles are data — edit here, nowhere else. */
export const ROLE_PERMISSIONS: Record<NxRole, readonly NxPermission[]> = {
  super_admin: PERMISSIONS,
  org_admin: PERMISSIONS.filter((p) => p !== "demo.reset"),
  hospital_admin: [
    "patient.demographics.view", "patient.clinical.view", "patient.restricted.view", "patient.create",
    "encounter.create", "note.edit", "note.sign", "medication.order.create", "medication.order.view",
    "beds.manage", "bed.assign", "appointments.manage", "appointments.view", "communication.send",
    "billing.view", "billing.manage", "reports.export", "analytics.view", "users.manage", "roles.manage",
    "staff.manage", "settings.manage", "audit.view", "emergency.access", "labs.result.enter",
    "labs.result.verify", "imaging.report.write", "inventory.manage", "tasks.manage", "features.manage",
    "delegation.manage", "breakglass.invoke", "consent.manage", "security.manage", "gateway.manage",
  ],
  dept_admin: [
    "patient.demographics.view", "patient.clinical.view", "patient.create", "encounter.create",
    "note.edit", "note.sign", "medication.order.create", "medication.order.view", "beds.manage",
    "bed.assign", "appointments.manage", "appointments.view", "communication.send", "analytics.view",
    "staff.manage", "tasks.manage", "reports.export", "audit.view", "emergency.access", "delegation.manage",
  ],
  doctor: [
    "patient.demographics.view", "patient.clinical.view", "patient.restricted.view", "patient.create",
    "encounter.create", "note.edit", "note.sign", "medication.order.create", "medication.order.view",
    "bed.assign", "appointments.manage", "appointments.view", "communication.send", "labs.result.verify",
    "imaging.report.write", "tasks.manage", "analytics.view", "emergency.access", "breakglass.invoke",
    "consent.manage", "reports.export",
  ],
  nurse: [
    "patient.demographics.view", "patient.clinical.view", "encounter.create", "note.edit",
    "medication.order.view", "medication.administer", "beds.manage", "bed.assign",
    "appointments.view", "communication.send", "labs.result.enter", "tasks.manage",
    "emergency.access", "breakglass.invoke", "consent.manage",
  ],
  care_coordinator: [
    "patient.demographics.view", "patient.clinical.view", "encounter.create", "appointments.manage",
    "appointments.view", "communication.send", "tasks.manage", "consent.manage", "analytics.view",
  ],
  receptionist: [
    "patient.demographics.view", "patient.create", "appointments.manage", "appointments.view",
    "communication.send", "billing.view", "tasks.manage",
  ],
  pharmacist: [
    "patient.demographics.view", "patient.clinical.view", "medication.order.view",
    "medication.dispense", "inventory.manage", "communication.send", "tasks.manage",
  ],
  lab_tech: [
    "patient.demographics.view", "patient.clinical.view", "labs.result.enter",
    "communication.send", "tasks.manage",
  ],
  radiology_tech: [
    "patient.demographics.view", "patient.clinical.view", "imaging.report.write",
    "communication.send", "tasks.manage",
  ],
  billing_officer: [
    "patient.demographics.view", "billing.view", "billing.manage", "reports.export",
    "communication.send", "tasks.manage", "analytics.view",
  ],
  inventory_manager: [
    "inventory.manage", "tasks.manage", "communication.send", "reports.export", "analytics.view",
  ],
  hr_manager: [
    "staff.manage", "users.manage", "tasks.manage", "communication.send", "analytics.view",
  ],
  patient: [
    "patient.demographics.view", // scoped to own record at the API layer
    "appointments.view",
  ],
  auditor: [
    "patient.demographics.view", "audit.view", "analytics.view", "reports.export",
  ],
  // ---- legacy roles (kept working, mapped to sensible sets) ----
  leadership: [
    "patient.demographics.view", "billing.view", "billing.manage", "reports.export", "analytics.view",
    "audit.view", "appointments.view", "features.manage", "settings.manage", "staff.manage",
  ],
  command: [
    "patient.demographics.view", "patient.clinical.view", "beds.manage", "bed.assign", "tasks.manage",
    "appointments.manage", "appointments.view", "communication.send", "emergency.access",
    "audit.view", "analytics.view",
  ],
  facilities: [
    "beds.manage", "tasks.manage", "communication.send", "inventory.manage",
  ],
  admin: PERMISSIONS,
};

/** Legacy primary-role key → canonical role keys. Multiple roles per user supported. */
export const LEGACY_ROLE_MAP: Record<string, NxRole[]> = {
  admin: ["hospital_admin"],
  leadership: ["leadership"],
  command: ["command"],
  facilities: ["facilities"],
  doctor: ["doctor"],
  nurse: ["nurse"],
  lab: ["lab_tech"],
  pharmacist: ["pharmacist"],
  reception: ["receptionist"],
  billing: ["billing_officer"],
};

/** Resolve the full role-key list for a user: legacy primary role + explicit assignments. */
export function roleKeysForUser(primaryRole: string, assignments?: { roleKey: string }[]): NxRole[] {
  const keys = new Set<NxRole>();
  const legacy = LEGACY_ROLE_MAP[primaryRole];
  if (legacy) legacy.forEach((k) => keys.add(k));
  else if (primaryRole in ROLE_PERMISSIONS) keys.add(primaryRole as NxRole);
  assignments?.forEach((a) => {
    if (a.roleKey in ROLE_PERMISSIONS) keys.add(a.roleKey as NxRole);
  });
  return Array.from(keys);
}

export interface PermissionContext {
  departmentId?: string | null;
  patientId?: string | null;
  patientDepartmentId?: string | null;
}

export interface EffectivePermissions {
  roleKeys: NxRole[];
  permissions: Set<NxPermission>;
  sources: Map<string, string>; // permission → why (role|grant|delegation|breakglass)
}

/** Compute a user's effective permissions: roles + explicit grants + live delegations + break-glass. */
export async function effectivePermissions(
  userId: string,
  primaryRole: string,
  hospitalId?: string | null,
  opts?: { breakGlass?: boolean; patientId?: string | null }
): Promise<EffectivePermissions> {
  const [assignments, grants, delegations, breakGlassEvents] = await Promise.all([
    db.nxUserRoleAssignment.findMany({
      where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    }),
    db.nxPermissionGrant.findMany({
      where: {
        userId,
        effect: "allow",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
    db.nxDelegation.findMany({
      where: { toUserId: userId, revokedAt: null, expiresAt: { gt: new Date() } },
    }),
    opts?.breakGlass
      ? db.nxBreakGlassEvent.findMany({
          where: { userId, revokedAt: null, expiresAt: { gt: new Date() }, patientId: opts.patientId ?? undefined },
        })
      : Promise.resolve([]),
  ]);

  const roleKeys = roleKeysForUser(primaryRole, assignments);
  const permissions = new Set<NxPermission>();
  const sources = new Map<string, string>();

  for (const rk of roleKeys) {
    for (const p of ROLE_PERMISSIONS[rk] ?? []) {
      permissions.add(p);
      if (!sources.has(p)) sources.set(p, `role:${rk}`);
    }
  }
  for (const g of grants) {
    if ((PERMISSIONS as readonly string[]).includes(g.permission)) {
      permissions.add(g.permission as NxPermission);
      sources.set(g.permission, "grant");
    }
  }
  for (const d of delegations) {
    if (d.roleKey && d.roleKey in ROLE_PERMISSIONS) {
      for (const p of ROLE_PERMISSIONS[d.roleKey as NxRole]) {
        permissions.add(p);
        sources.set(p, `delegation:${d.roleKey}`);
      }
    }
    if (d.permission && (PERMISSIONS as readonly string[]).includes(d.permission)) {
      permissions.add(d.permission as NxPermission);
      sources.set(d.permission, "delegation");
    }
  }
  if (breakGlassEvents.length > 0) {
    // Break-glass grants emergency clinical read access for the patient in question
    permissions.add("patient.clinical.view");
    permissions.add("emergency.access");
    sources.set("patient.clinical.view", "breakglass");
  }

  return { roleKeys, permissions, sources };
}

export interface NxSession {
  userId: string;
  name: string;
  role: NxRole;
  department?: string;
  hospitalId?: string;
  staffCode?: string;
  jti?: string;
  breakGlass?: boolean;
}

/** Cache of effective permissions per request cycle (per process, short TTL). */
const permCache = new Map<string, { perms: EffectivePermissions; at: number }>();
const PERM_CACHE_TTL = 30_000;

export async function permsForSession(session: NxSession): Promise<EffectivePermissions> {
  const key = `${session.userId}:${session.hospitalId}:${session.breakGlass ? "bg" : ""}`;
  const cached = permCache.get(key);
  if (cached && Date.now() - cached.at < PERM_CACHE_TTL) return cached.perms;
  const perms = await effectivePermissions(session.userId, session.role, session.hospitalId, {
    breakGlass: session.breakGlass,
  });
  permCache.set(key, { perms, at: Date.now() });
  if (permCache.size > 500) {
    const cutoff = Date.now() - PERM_CACHE_TTL;
    for (const [k, v] of permCache) if (v.at < cutoff) permCache.delete(k);
  }
  return perms;
}

export function invalidatePermCache(userId?: string) {
  if (!userId) permCache.clear();
  else for (const k of permCache.keys()) if (k.startsWith(userId)) permCache.delete(k);
}

export function hasPermission(perms: EffectivePermissions, permission: NxPermission): boolean {
  return perms.permissions.has(permission);
}

/** Deny overrides: explicit deny grants always win. */
export async function deniedPermissions(userId: string): Promise<Set<string>> {
  const denies = await db.nxPermissionGrant.findMany({
    where: { userId, effect: "deny", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
  return new Set(denies.map((d) => d.permission));
}

/** Extract and verify the Nx session from the request cookie (sync, JWT-only). */
export function getSession(req: NextRequest): NxSession | null {
  const token = req.cookies.get("nx_access")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const raw = decoded as unknown as {
    department?: string;
    hospitalId?: string;
    staffCode?: string;
    jti?: string;
    breakGlass?: boolean;
  };
  return {
    userId: decoded.userId,
    name: decoded.name,
    role: decoded.role as NxRole,
    hospitalId: raw.hospitalId,
    department: raw.department,
    staffCode: raw.staffCode,
    jti: raw.jti,
    breakGlass: raw.breakGlass,
  };
}

/** Session-aware fetch: verifies the JWT *and* checks the session record is
 *  not revoked, not expired, AND not idle-expired (inactivity auto sign-out).
 *  Idle budget: privileged roles 90 min, everyone else NX_SESSION_IDLE_MIN
 *  (default 720). Keeps night-shift terminals from becoming account-sharing
 *  hazards without nagging clinicians mid-round. */
const IDLE_MIN_BY_ROLE: Partial<Record<string, number>> = {
  super_admin: 90, org_admin: 90, hospital_admin: 120, billing_officer: 120,
};
export function idleBudgetMin(role: string): number {
  const env = Number(process.env.NX_SESSION_IDLE_MIN || 0);
  if (env > 0) return env;
  return IDLE_MIN_BY_ROLE[role] ?? 720;
}
export async function getSessionFresh(req: NextRequest): Promise<NxSession | null> {
  const session = getSession(req);
  if (!session) return null;
  const user = await db.nxStaffUser.findUnique({ where: { id: session.userId } }).catch(() => null);
  if (!user || user.status !== "active") return null;
  if (session.jti) {
    const rec = await db.nxSessionRecord.findUnique({ where: { jti: session.jti } }).catch(() => null);
    if (!rec || rec.revokedAt || rec.expiresAt < new Date()) return null;
    const idleMs = idleBudgetMin(session.role) * 60_000;
    if (Date.now() - rec.lastSeenAt.getTime() > idleMs) {
      db.nxSessionRecord.update({ where: { id: rec.id }, data: { revokedAt: new Date(), revokedReason: "idle_timeout" } }).catch(() => {});
      return null;
    }
    // Throttled lastSeen update (at most once a minute per session)
    if (Date.now() - rec.lastSeenAt.getTime() > 60_000) {
      db.nxSessionRecord.update({ where: { id: rec.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
    }
  }
  return session;
}

export function modulesForRole(roleInput: NxRole | string): NxModule[] {
  const role = (LEGACY_ROLE_MAP[roleInput]?.[0] ?? roleInput) as NxRole;
  // Module gates derived from the permission matrix so the OS shell stays in sync.
  const p = ROLE_PERMISSIONS[role] ?? [];
  const mods: NxModule[] = [];
  const has = (x: NxPermission) => p.includes(x);
  if (has("analytics.view")) { if (role !== "auditor") mods.push("command-center"); mods.push("analytics"); }
  if (has("patient.clinical.view") || has("patient.demographics.view")) mods.push("patients");
  if (has("tasks.manage")) mods.push("tasks");
  if (has("appointments.manage") || has("appointments.view")) mods.push("schedule");
  if (has("beds.manage") || has("bed.assign")) mods.push("beds");
  if (has("emergency.access")) mods.push("ed");
  if (role === "doctor") mods.push("doctor", "journey", "orders", "or");
  if (role === "nurse") mods.push("nurse", "journey", "orders");
  if (has("labs.result.enter") || has("labs.result.verify")) mods.push("labs", "orders");
  if (has("medication.dispense") || has("medication.order.view")) mods.push("pharmacy");
  if (has("imaging.report.write")) mods.push("orders");
  if (has("billing.view")) mods.push("billing");
  if (has("inventory.manage")) mods.push("inventory", "equipment");
  if (has("communication.send")) mods.push("messages");
  if (has("audit.view")) mods.push("audit");
  if (has("users.manage") || has("staff.manage") || has("roles.manage")) mods.push("admin");
  if (role === "command" || role === "admin" || role === "hospital_admin") mods.push("incidents", "journey", "or");
  if (role === "auditor") mods.push("audit", "analytics");
  return Array.from(new Set(mods)).filter((m) => MODULES.includes(m));
}

export function canAccessModule(role: NxRole | string, module: string): boolean {
  return modulesForRole(role).includes(module as NxModule);
}

/**
 * The one guard to rule API routes: auth + session validity + permission.
 * Returns either a session or a structured error you can return directly.
 */
export async function requirePermission(
  req: NextRequest,
  permission: NxPermission,
  ctx?: PermissionContext
): Promise<{ session: NxSession; perms: EffectivePermissions } | { error: string; status: number; detail?: string }> {
  const session = await getSessionFresh(req);
  if (!session) return { error: "unauthenticated", status: 401 };
  const perms = await permsForSession(session);
  if (!hasPermission(perms, permission)) {
    // Patient scoping: a `patient` role may only touch their own record — enforced at call sites.
    if (session.role === "patient") {
      return { error: "forbidden", status: 403, detail: "patient_scoped_only" };
    }
    return { error: "forbidden", status: 403, detail: `missing_permission:${permission}` };
  }
  const denies = await deniedPermissions(session.userId);
  if (denies.has(permission)) return { error: "forbidden", status: 403, detail: "explicit_deny" };
  void ctx;
  return { session, perms };
}

/** Legacy module gate, now revocation-aware, kept for existing routes. */
export async function requireModule(
  req: NextRequest,
  module: string
): Promise<{ session: NxSession } | { error: string; status: number }> {
  const session = await getSessionFresh(req);
  if (!session) return { error: "unauthenticated", status: 401 };
  if (session.role !== "admin" && !canAccessModule(session.role, module)) {
    return { error: "forbidden_module", status: 403 };
  }
  return { session };
}
