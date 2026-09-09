import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { publish } from "@/lib/nx/bus";
import { fail, guard, ipOf, ok, paginate, pageMeta, parseBody, withRoute } from "@/lib/nx/api";
import { PERMISSIONS } from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   WORK QUEUE v2 — task workflow engine
   Statuses: new|assigned|in_progress|blocked|waiting|escalated|done|cancelled
   (+ legacy aliases open→new, in_progress). Comments, checklists,
   handoff, SLA, recurrence, saved views, bulk ops — all server-validated.
   ============================================================ */

const ACTIVE_STATUSES = ["new", "assigned", "in_progress", "blocked", "waiting", "escalated", "open"];

const CreateSchema = z.object({
  title: z.string().min(2).max(200),
  detail: z.string().max(4000).optional(),
  type: z.enum(["task", "order", "review", "approval", "result", "escalation", "followup", "transport", "cleaning", "handover"]).default("task"),
  category: z.enum(["clinical", "operational", "administrative", "infection", "medication"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  ownerRole: z.string().max(40).optional(),
  ownerName: z.string().max(80).optional(),
  assignedToUserId: z.string().optional(),
  department: z.string().max(80).optional(),
  patientId: z.string().optional(),
  patientUhid: z.string().optional(),
  encounterId: z.string().optional(),
  location: z.string().max(80).optional(),
  dueAt: z.string().datetime().optional(),
  slaMinutes: z.number().int().min(5).max(60 * 24 * 7).optional(),
  checklist: z.array(z.object({ text: z.string().min(1).max(200), done: z.boolean().default(false) })).max(20).optional(),
  recurrence: z.enum(["none", "daily", "weekly", "weekdays"]).optional(),
  sourceModule: z.string().max(40).optional(),
  relatedId: z.string().optional(),
});

const PatchSchema = z.object({
  id: z.string().min(3),
  status: z.enum(["new", "assigned", "in_progress", "blocked", "waiting", "escalated", "done", "cancelled", "open"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  ownerRole: z.string().optional(),
  ownerName: z.string().optional(),
  assignedToUserId: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  completionNote: z.string().max(2000).optional(),
  waitingReason: z.string().max(300).optional(),
  blockedReason: z.string().max(300).optional(),
  checklist: z.array(z.object({ text: z.string(), done: z.boolean() })).optional(),
  handoffTo: z.string().max(80).optional(),
  comment: z.string().min(1).max(2000).optional(),
});

const BulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
  action: z.enum(["status", "priority", "assign", "delete"]),
  value: z.string().optional(),
});

function statusNow(old?: string | null): string {
  // Normalize legacy "open" → "new"
  if (old === "open") return "new";
  return old ?? "new";
}

export const GET = withRoute("tasks.list", async (req: NextRequest) => {
  const g = await guard(req, "tasks.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const p = paginate(req, { perPage: 50, maxPerPage: 200 });
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const priority = sp.get("priority");
  const mine = sp.get("mine"); // "1" = assigned to me (v2); role key = ownerRole (legacy)
  const type = sp.get("type");
  const view = sp.get("view");

  let savedView: { name: string; filters: Record<string, string> } | null = null;
  if (view) {
    const rec = await db.nxTaskView.findFirst({ where: { userId: g.session.userId, name: view } });
    if (rec) savedView = { name: rec.name, filters: JSON.parse(rec.filters || "{}") };
  }
  const eff = { ...(savedView?.filters ?? {}) };
  const statusParam = status ?? eff.status;
  const ACTIVE = [...ACTIVE_STATUSES];
  const where: Record<string, unknown> = { hospitalId };
  if (statusParam && statusParam !== "active" && statusParam !== "all") {
    where.status = statusParam.includes(",") ? { in: statusParam.split(",").flatMap((s) => (s === "open" ? ["open", "new"] : [s])) } : statusParam === "open" ? { in: ["open", "new"] } : statusParam;
  } else if (statusParam !== "all") {
    where.status = { in: ACTIVE };
  }
  const priorityParam = priority ?? eff.priority;
  if (priorityParam) where.priority = { in: priorityParam.split(",") };
  if (mine === "1") where.assignedToUserId = g.session.userId;
  else if (mine) where.ownerRole = mine;
  if (type) where.type = type;
  if (p.q) where.OR = [{ title: { contains: p.q } }, { patientName: { contains: p.q } }, { patientUhid: { contains: p.q } }];

  const [rows, total] = await Promise.all([
    db.nxTask.findMany({
      where,
      orderBy: [{ priority: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      skip: p.skip,
      take: p.take,
      include: { comments: { orderBy: { createdAt: "desc" }, take: 3 } },
    }),
    db.nxTask.count({ where }),
  ]);

  const now = Date.now();
  const enriched = rows.map((t) => {
    const overdue = t.dueAt ? new Date(t.dueAt).getTime() < now && !["done", "cancelled"].includes(t.status) : false;
    const dueMins = t.dueAt ? Math.round((new Date(t.dueAt).getTime() - now) / 60000) : null;
    return { ...t, overdue, dueMins, checklist: t.checklist ? JSON.parse(t.checklist) : [] };
  });

  // Backward-compatible counts (legacy statuses + new ones)
  const activeIn = ["open", "new", "assigned", "in_progress", "blocked", "waiting", "escalated"];
  const [cOpen, cInProgress, cBlocked, cCritical, cDoneToday] = await Promise.all([
    db.nxTask.count({ where: { hospitalId, status: { in: ["open", "new"] } } }),
    db.nxTask.count({ where: { hospitalId, status: "in_progress" } }),
    db.nxTask.count({ where: { hospitalId, status: "blocked" } }),
    db.nxTask.count({ where: { hospitalId, priority: "critical", status: { in: activeIn } } }),
    db.nxTask.count({ where: { hospitalId, status: "done", completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);

  // Legacy top-level shape consumed by OS shell badges + modules
  return NextResponse.json({
    tasks: enriched,
    counts: {
      open: cOpen,
      inProgress: cInProgress,
      blocked: cBlocked,
      critical: cCritical,
      overdue: enriched.filter((t) => t.overdue).length,
      doneToday: cDoneToday,
    },
    meta: pageMeta(p, total),
  });
});

export const POST = withRoute("tasks.create", async (req: NextRequest) => {
  const g = await guard(req, "tasks.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const body = await parseBody(req, CreateSchema);
  if ("response" in body) return body.response;

  let patientName: string | undefined;
  if (body.data.patientId) {
    const pat = await db.hospitalPatient.findFirst({ where: { id: body.data.patientId, hospitalId }, select: { fullName: true, uhid: true } });
    if (!pat) return fail("not_found", 404, "Patient not found in this hospital.");
    patientName = pat.fullName;
  }

  const task = await db.nxTask.create({
    data: {
      hospitalId,
      title: body.data.title,
      detail: body.data.detail,
      type: body.data.type,
      category: body.data.category,
      priority: body.data.priority,
      status: body.data.assignedToUserId || body.data.ownerRole ? "assigned" : "new",
      ownerRole: body.data.ownerRole,
      ownerName: body.data.ownerName,
      assignedToUserId: body.data.assignedToUserId,
      department: body.data.department,
      patientId: body.data.patientId,
      patientUhid: body.data.patientUhid,
      patientName,
      encounterId: body.data.encounterId,
      location: body.data.location,
      dueAt: body.data.dueAt ? new Date(body.data.dueAt) : null,
      slaMinutes: body.data.slaMinutes,
      checklist: body.data.checklist ? JSON.stringify(body.data.checklist) : null,
      recurrence: body.data.recurrence && body.data.recurrence !== "none" ? body.data.recurrence : null,
      recurrenceNext: body.data.recurrence === "daily" ? new Date(Date.now() + 24 * 3600_000) : null,
      sourceModule: body.data.sourceModule ?? "tasks",
      relatedId: body.data.relatedId,
      reason: "manually created",
    },
  });

  await audit({ hospitalId, actorName: g.session.staffCode ?? g.session.name, actorRole: g.session.role, action: "task.create", entityType: "nx_task", entityId: task.id, patientId: task.patientId ?? undefined });
  publish({ event: "task.created", hospitalId, toRoles: ["command", "nurse", "doctor", "admin", "hospital_admin", "dept_admin"], data: { id: task.id, title: task.title, priority: task.priority } });
  return NextResponse.json({ data: { task }, task }, { status: 201 }); // dual envelope: legacy top-level + standard data
});

export const PATCH = withRoute("tasks.update", async (req: NextRequest) => {
  const g = await guard(req, "tasks.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const body = await parseBody(req, PatchSchema);
  if ("response" in body) return body.response;
  const d = body.data;

  const task = await db.nxTask.findFirst({ where: { id: d.id, hospitalId } });
  if (!task) return fail("not_found", 404, "Task not found.");

  // Comments work even on closed tasks; status transitions validated below
  if (d.comment) {
    const c = await db.nxTaskComment.create({
      data: { taskId: task.id, authorName: g.session.name, authorRole: g.session.role, body: d.comment },
    });
    return NextResponse.json({ data: { comment: c }, comment: c });
  }

  const data: Record<string, unknown> = {};
  const from = statusNow(task.status);
  if (d.status) {
    const to = statusNow(d.status);
    const ALLOWED: Record<string, string[]> = {
      new: ["assigned", "in_progress", "cancelled", "blocked", "waiting", "escalated"],
      assigned: ["in_progress", "blocked", "waiting", "escalated", "done", "cancelled"],
      in_progress: ["blocked", "waiting", "escalated", "done", "cancelled"],
      blocked: ["in_progress", "waiting", "escalated", "cancelled"],
      waiting: ["in_progress", "assigned", "escalated", "cancelled"],
      escalated: ["in_progress", "assigned", "done", "cancelled"],
      done: ["in_progress"], // reopen (audited)
      cancelled: ["new"],
    };
    if (!ALLOWED[from]?.includes(to)) {
      return fail("invalid_transition", 422, `Cannot move task from "${from}" to "${to}".`);
    }
    data.status = to;
    if (to === "in_progress") data.startedAt = task.startedAt ?? new Date();
    if (to === "escalated") {
      data.escalatedAt = new Date();
      data.escalationLevel = task.escalationLevel + 1;
    }
    if (to === "done") {
      data.completedAt = new Date();
      if (d.completionNote) data.completionNote = d.completionNote;
      // Recurring task → spawn next occurrence
      if (task.recurrence) {
        const addMs = task.recurrence === "daily" ? 24 * 3600_000 : task.recurrence === "weekly" ? 7 * 24 * 3600_000 : 0;
        if (addMs) {
          await db.nxTask.create({
            data: {
              hospitalId, title: task.title, detail: task.detail, type: task.type, category: task.category,
              priority: task.priority, status: "new", ownerRole: task.ownerRole, ownerName: task.ownerName,
              assignedToUserId: task.assignedToUserId, department: task.department, patientId: task.patientId,
              patientName: task.patientName, patientUhid: task.patientUhid, location: task.location,
              dueAt: task.dueAt ? new Date(task.dueAt.getTime() + addMs) : null, slaMinutes: task.slaMinutes,
              checklist: task.checklist, recurrence: task.recurrence,
              recurrenceNext: new Date(Date.now() + addMs), sourceModule: "recurrence", reason: "recurring task",
            },
          });
        }
      }
    }
    if (to === "cancelled" || to === "new") data.completedAt = null;
    if (d.waitingReason && to === "waiting") data.waitingReason = d.waitingReason;
    if (d.blockedReason && to === "blocked") data.blockedReason = d.blockedReason;
    if (d.handoffTo && (to === "assigned" || to === "in_progress")) {
      data.handoffFrom = task.ownerName ?? g.session.name;
      data.handoffTo = d.handoffTo;
    }
  }
  if (d.priority) data.priority = d.priority;
  if (d.ownerRole) data.ownerRole = d.ownerRole;
  if (d.ownerName) data.ownerName = d.ownerName;
  if (d.assignedToUserId !== undefined) {
    data.assignedToUserId = d.assignedToUserId;
    if (d.assignedToUserId && from === "new") data.status = "assigned";
  }
  if (d.dueAt !== undefined) data.dueAt = d.dueAt ? new Date(d.dueAt) : null;
  if (d.checklist) data.checklist = JSON.stringify(d.checklist);

  const updated = await db.nxTask.update({ where: { id: task.id }, data });
  await audit({
    hospitalId, actorName: g.session.staffCode ?? g.session.name, actorRole: g.session.role,
    action: d.status ? `task.status.${statusNow(d.status)}` : "task.update",
    entityType: "nx_task", entityId: task.id, patientId: task.patientId ?? undefined,
    detail: { from, to: d.status ?? from, note: d.completionNote ?? d.waitingReason ?? d.blockedReason ?? undefined },
  });
  publish({ event: "task.updated", hospitalId, toRoles: ["command", "nurse", "doctor", "admin", "hospital_admin", "dept_admin"], data: { id: task.id, status: data.status ?? from, title: task.title } });
  return NextResponse.json({ data: { task: updated }, task: updated }); // dual envelope
});

export const PUT = withRoute("tasks.bulk", async (req: NextRequest) => {
  const g = await guard(req, "tasks.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const body = (await req.json().catch(() => null)) as z.infer<typeof BulkSchema> | null;
  if (!body) return fail("invalid_json", 400);
  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);

  const filter = { id: { in: parsed.data.ids }, hospitalId };
  let count = 0;
  if (parsed.data.action === "delete") {
    const r = await db.nxTask.deleteMany({ where: filter });
    count = r.count;
  } else if (parsed.data.action === "status" && parsed.data.value) {
    const r = await db.nxTask.updateMany({ where: { ...filter, status: { notIn: ["done", "cancelled"] } }, data: { status: statusNow(parsed.data.value) } });
    count = r.count;
  } else if (parsed.data.action === "priority" && parsed.data.value) {
    const r = await db.nxTask.updateMany({ where: filter, data: { priority: parsed.data.value } });
    count = r.count;
  } else if (parsed.data.action === "assign" && parsed.data.value) {
    const r = await db.nxTask.updateMany({ where: filter, data: { assignedToUserId: parsed.data.value, status: "assigned" } });
    count = r.count;
  } else {
    return fail("invalid_request", 400, "Missing action value.");
  }
  await audit({ hospitalId, actorName: g.session.staffCode ?? g.session.name, actorRole: g.session.role, action: `task.bulk.${parsed.data.action}`, entityType: "nx_task", detail: { count, ids: parsed.data.ids.length } });
  return NextResponse.json({ updated: count });
});
