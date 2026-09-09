import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** GET — intelligent work queue. Deterministic priority order + transparent reasons. */
export async function GET(req: NextRequest) {
  const gate = requireModule(req, "tasks");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;
  if (!hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "active";
  const mine = searchParams.get("mine");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { hospitalId };
  where.status = status === "active" ? { in: ["open", "in_progress", "blocked"] } : status;
  if (mine) where.ownerRole = mine;
  if (type) where.type = type;

  const tasks = await db.nxTask.findMany({ where, orderBy: [{ createdAt: "desc" }], take: 100 });
  const now = Date.now();
  const enriched = tasks
    .map((t) => {
      const overdue = t.dueAt ? new Date(t.dueAt).getTime() < now : false;
      const dueMins = t.dueAt ? Math.round((new Date(t.dueAt).getTime() - now) / 60000) : null;
      return { ...t, overdue, dueMins, _rank: PRIORITY_RANK[t.priority] ?? 2 };
    })
    .sort((a, b) => {
      if (a._rank !== b._rank) return a._rank - b._rank;
      const av = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const bv = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return av - bv;
    })
    .map(({ _rank, ...t }) => t);

  const counts = {
    open: await db.nxTask.count({ where: { hospitalId, status: "open" } }),
    inProgress: await db.nxTask.count({ where: { hospitalId, status: "in_progress" } }),
    blocked: await db.nxTask.count({ where: { hospitalId, status: "blocked" } }),
    critical: await db.nxTask.count({ where: { hospitalId, priority: "critical", status: { in: ["open", "in_progress", "blocked"] } } }),
    overdue: enriched.filter((t) => t.overdue).length,
    doneToday: await db.nxTask.count({ where: { hospitalId, status: "done", completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  };

  return NextResponse.json({ tasks: enriched, counts });
}

/** POST — create a task. */
export async function POST(req: NextRequest) {
  const gate = requireModule(req, "tasks");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;
  const body = await req.json().catch(() => ({}));
  if (!body.title) return NextResponse.json({ error: "missing_title" }, { status: 400 });

  const task = await db.nxTask.create({
    data: {
      hospitalId: hospitalId!,
      title: String(body.title),
      detail: body.detail || null,
      type: body.type || "task",
      priority: ["low", "medium", "high", "critical"].includes(body.priority) ? body.priority : "medium",
      ownerRole: body.ownerRole || null,
      ownerName: body.ownerName || null,
      patientId: body.patientId || null,
      patientName: body.patientName || null,
      patientUhid: body.patientUhid || null,
      location: body.location || null,
      dueAt: body.dueMinutes ? new Date(Date.now() + Number(body.dueMinutes) * 60000) : null,
      reason: body.reason || `Created by ${gate.session.name}`,
      sourceModule: "tasks",
    },
  });
  await audit({
    hospitalId: hospitalId!, actorName: gate.session.name, actorRole: gate.session.role,
    action: "task.create", entityType: "NxTask", entityId: task.id, patientId: task.patientId || undefined,
    detail: { title: task.title, priority: task.priority },
  });
  return NextResponse.json({ task });
}

/** PATCH — update status / assign / escalate. */
export async function PATCH(req: NextRequest) {
  const gate = requireModule(req, "tasks");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const task = await db.nxTask.findUnique({ where: { id: body.id } });
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.status) {
    data.status = body.status;
    if (body.status === "done") data.completedAt = new Date();
  }
  if (body.ownerName) { data.ownerName = body.ownerName; data.ownerRole = body.ownerRole || task.ownerRole; }
  if (body.escalate) data.escalationLevel = task.escalationLevel + 1;
  if (body.priority) data.priority = body.priority;

  const updated = await db.nxTask.update({ where: { id: task.id }, data });
  await audit({
    hospitalId: task.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: `task.${body.escalate ? "escalate" : body.status || "assign"}`, entityType: "NxTask", entityId: task.id,
    patientId: task.patientId || undefined, detail: { from: task.status, to: updated.status },
  });
  return NextResponse.json({ task: updated });
}
