import { db } from "@/lib/db";
import { audit as dbAudit } from "@/lib/nx/audit";
import { fire } from "@/lib/nx/automations";
import {
  type AuditProvider,
  type AutomationProvider,
  type CalendarProvider,
  type FeatureFlagProvider,
  type FileStorageProvider,
  type IdentityProvider,
  type MessagingProvider,
  type NexuraProviders,
  type NotificationProvider,
  type SearchProvider,
  type TaskProvider,
} from "./types";

/* ============================================================
   LOCAL ADAPTERS — the dev/demo implementation of every Nexura
   platform contract, backed by this app's own database.
   Remote adapters (production) implement the same interfaces
   against NEXURA_API_URL; Hospital OS code never changes.
   ============================================================ */

export function LocalAdapters(): NexuraProviders {
  const identity: IdentityProvider = {
    name: "local-identity",
    async currentUser({ userId }) {
      const u = await db.nxStaffUser.findUnique({ where: { id: userId }, include: { roleAssignments: true } });
      if (!u) return null;
      return {
        id: u.id,
        displayName: u.name,
        email: u.email,
        roles: [u.role, ...u.roleAssignments.map((r) => r.roleKey)],
        hospitalId: u.hospitalId,
      };
    },
    async listOrganizations({ userId }) {
      const u = await db.nxStaffUser.findUnique({ where: { id: userId }, select: { hospitalId: true } });
      if (!u?.hospitalId) return [];
      const h = await db.hospital.findUnique({ where: { id: u.hospitalId }, include: { organization: true } });
      return h?.organization ? [{ id: h.organization.id, name: h.organization.name }] : h ? [{ id: h.id, name: h.name }] : [];
    },
  };

  const notifications: NotificationProvider = {
    name: "local-notifications",
    async push(input) {
      const n = await db.nxNotification.create({
        data: {
          hospitalId: input.hospitalId,
          userId: input.userId,
          roleKey: input.roleKey,
          title: input.title,
          body: input.body,
          level: input.level,
          category: input.category ?? "system",
          link: input.link,
          patientId: input.patientId,
        },
      });
      return { id: n.id };
    },
    async list({ hospitalId, roleKeys }) {
      return db.nxNotification.findMany({
        where: { hospitalId, OR: [{ userId: null, roleKey: { in: roleKeys } }, { userId: null, roleKey: null }] },
        orderBy: { createdAt: "desc" },
        take: 50,
      }) as never;
    },
    async markRead() {
      return 0; // routed through /api/nx/notifications PATCH which scopes per user
    },
  };

  const calendar: CalendarProvider = {
    name: "local-calendar",
    async eventsFor({ hospitalId, from, to }) {
      const appts = await db.hospitalAppointment.findMany({
        where: { hospitalId, date: { gte: from, lt: to } },
        include: { patient: { select: { fullName: true } }, doctor: { select: { name: true } } },
        take: 200,
      });
      return appts.map((a) => ({
        id: a.id,
        title: `${a.patient.fullName} · ${a.doctor?.name ?? ""}`.trim(),
        at: a.date,
        kind: "appointment" as const,
      }));
    },
  };

  const tasks: TaskProvider = {
    name: "local-tasks",
    async countsFor({ hospitalId }) {
      const active = ["open", "new", "assigned", "in_progress", "blocked", "waiting", "escalated"];
      const [open, critical, overdueRows] = await Promise.all([
        db.nxTask.count({ where: { hospitalId, status: { in: active } } }),
        db.nxTask.count({ where: { hospitalId, priority: "critical", status: { in: active } } }),
        db.nxTask.findMany({ where: { hospitalId, status: { in: active }, dueAt: { lt: new Date() } }, select: { id: true } }),
      ]);
      return { open, critical, overdue: overdueRows.length };
    },
  };

  const messaging: MessagingProvider = {
    name: "local-messaging",
    async unreadFor({ hospitalId, userId }) {
      return db.nxMessage.count({
        where: { hospitalId, createdAt: { gte: new Date(Date.now() - 24 * 3600_000) }, senderUserId: { not: userId }, reads: { none: { userId } } },
      });
    },
  };

  const files: FileStorageProvider = {
    name: "local-files",
    async put({ hospitalId, name, mime, size, data, patientId, ownerId, ownerName }) {
      const f = await db.nxFileObject.create({
        data: { hospitalId, name, mime, size, data: data ?? null, patientId, ownerId, ownerName, scanStatus: "skipped" },
      });
      return { id: f.id, name: f.name, mime: f.mime, size: f.size };
    },
    async get({ id }) {
      const f = await db.nxFileObject.findUnique({ where: { id } });
      return f ? { id: f.id, name: f.name, mime: f.mime, size: f.size } : null;
    },
  };

  const search: SearchProvider = {
    name: "local-search",
    async search({ hospitalId, q, limit = 20 }) {
      if (q.trim().length < 2) return [];
      const like = { contains: q.trim() };
      const [patients, tasks, staff] = await Promise.all([
        db.hospitalPatient.findMany({ where: { hospitalId, OR: [{ fullName: like }, { uhid: like }] }, select: { id: true, fullName: true, uhid: true }, take: 8 }),
        db.nxTask.findMany({ where: { hospitalId, title: like }, select: { id: true, title: true, status: true }, take: 6 }),
        db.nxStaffUser.findMany({ where: { hospitalId, name: like }, select: { id: true, name: true, staffCode: true }, take: 5 }),
      ]);
      return [
        ...patients.map((p) => ({ type: "patient", id: p.id, title: p.fullName, sub: p.uhid, href: `patient:${p.id}` })),
        ...tasks.map((t) => ({ type: "task", id: t.id, title: t.title, sub: t.status, href: `task:${t.id}` })),
        ...staff.map((s) => ({ type: "staff", id: s.id, title: s.name, sub: s.staffCode, href: `staff:${s.id}` })),
      ].slice(0, limit);
    },
  };

  const audit: AuditProvider = {
    name: "local-audit",
    async record(args) {
      await dbAudit(args);
    },
  };

  const automation: AutomationProvider = {
    name: "local-automation",
    async fire(args) {
      await fire(args.triggerType as Parameters<typeof fire>[0], {
        hospitalId: args.hospitalId,
        actorName: args.actorName,
        actorRole: args.actorRole,
        patientId: args.patientId,
        patientName: args.patientName,
        relatedId: args.relatedId,
        detail: args.detail,
      });
    },
  };

  const features: FeatureFlagProvider = {
    name: "local-features",
    async isEnabled(key, fallback = false) {
      const flag = await db.nxFeatureFlag.findUnique({ where: { key } }).catch(() => null);
      return flag ? flag.enabled : fallback;
    },
    async all() {
      const flags = await db.nxFeatureFlag.findMany();
      return Object.fromEntries(flags.map((f) => [f.key, f.enabled]));
    },
  };

  return { identity, notifications, calendar, tasks, messaging, files, search, audit, automation, features };
}
