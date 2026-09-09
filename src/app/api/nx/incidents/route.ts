import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — incident & escalation center. */
export async function GET(req: NextRequest) {
  const gate = await requireModule(req, "incidents");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");

  const where: Record<string, unknown> = { hospitalId };
  if (status) where.status = { in: status.split(",") };
  if (severity) where.severity = { in: severity.split(",") };

  const incidents = await db.nxIncident.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
  const counts = {
    open: incidents.filter((i) => i.status === "open").length,
    critical: incidents.filter((i) => i.severity === "critical" && !["resolved", "closed"].includes(i.status)).length,
    investigating: incidents.filter((i) => i.status === "investigating").length,
    resolved30d: await db.nxIncident.count({ where: { hospitalId, resolvedAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
  };
  return NextResponse.json({ incidents, counts });
}

/** POST — report incident. */
export async function POST(req: NextRequest) {
  const gate = await requireModule(req, "incidents");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;
  const body = await req.json().catch(() => ({}));
  if (!body.title) return NextResponse.json({ error: "missing_title" }, { status: 400 });

  const incident = await db.nxIncident.create({
    data: {
      hospitalId: hospitalId!,
      title: String(body.title),
      description: body.description || null,
      severity: ["info", "minor", "major", "critical"].includes(body.severity) ? body.severity : "minor",
      category: body.category || "operational",
      location: body.location || null,
      patientId: body.patientId || null,
      reportedBy: gate.session.name,
    },
  });
  await audit({
    hospitalId: hospitalId!, actorName: gate.session.name, actorRole: gate.session.role,
    action: "incident.report", entityType: "NxIncident", entityId: incident.id, patientId: incident.patientId || undefined,
    detail: { severity: incident.severity, category: incident.category },
  });
  return NextResponse.json({ incident });
}

/** PATCH — acknowledge / investigate / resolve. */
export async function PATCH(req: NextRequest) {
  const gate = await requireModule(req, "incidents");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const incident = await db.nxIncident.findUnique({ where: { id: body.id } });
  if (!incident) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: Record<string, unknown> = { status: body.status || "acknowledged" };
  if (data.status === "acknowledged" && !incident.acknowledgedAt) data.acknowledgedAt = new Date();
  if (data.status === "resolved" || data.status === "closed") data.resolvedAt = new Date();

  const updated = await db.nxIncident.update({ where: { id: incident.id }, data });
  await audit({
    hospitalId: incident.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: `incident.${data.status}`, entityType: "NxIncident", entityId: incident.id, patientId: incident.patientId || undefined,
    detail: { from: incident.status, to: updated.status },
  });
  return NextResponse.json({ incident: updated });
}
