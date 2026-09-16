import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireHospitalContext, withRoute } from "@/lib/nx/api";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PreOpChecklist { consent?: boolean; fasted?: boolean; site_marked?: boolean; allergies_verified?: boolean; blood_arranged?: boolean; equipment_checked?: boolean }

/** GET — operating room schedule + readiness. */
export const GET = withRoute("nx.or.schedule", async (req: NextRequest) => {
  const gate = await requireModule(req, "or");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;

  const surgeries = await db.oTSurgery.findMany({
    where: { hospitalId },
    orderBy: { plannedStartTime: "asc" },
    take: 30,
    include: {
      surgeon: { select: { name: true, specialty: true } },
      anesthetist: { select: { name: true } },
      patient: { select: { fullName: true, age: true, gender: true, bloodGroup: true, allergy: true } },
    },
  });

  const rooms = Array.from(new Set(surgeries.map((s) => s.otRoomNumber)));
  const byRoom = rooms.map((room) => ({
    room,
    cases: surgeries.filter((s) => s.otRoomNumber === room).map((s) => {
      let checklist: PreOpChecklist = {};
      try { checklist = JSON.parse(s.preOpChecklist || "{}"); } catch { /* ignore */ }
      return { ...s, checklist, readiness: computeReadiness(checklist) };
    }),
  }));

  return NextResponse.json({
    rooms: byRoom,
    stats: {
      planned: surgeries.filter((s) => s.status === "planned").length,
      inProgress: surgeries.filter((s) => s.status === "in_progress").length,
      completed: surgeries.filter((s) => s.status === "completed").length,
    },
  });
});

function computeReadiness(c: PreOpChecklist): { pct: number; missing: string[] } {
  const flags: Array<[string, boolean | undefined]> = [
    ["Consent signed", c.consent],
    ["Fasting confirmed", c.fasted],
    ["Site marked", c.site_marked],
    ["Allergies verified", c.allergies_verified],
    ["Blood arranged", c.blood_arranged],
    ["Equipment checked", c.equipment_checked],
  ];
  const missing = flags.filter(([, v]) => !v).map(([k]) => k);
  return { pct: Math.round(((flags.length - missing.length) / flags.length) * 100), missing };
}

/** PATCH — tick checklist item / change surgery status. */
const CHECKLIST_KEYS = ["patient_verified", "consent_signed", "anesthesia_cleared", "equipment_checked"] as const;
export const PATCH = withRoute("nx.or.update", async (req: NextRequest) => {
  const gate = await requireModule(req, "or");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!gate.session.hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  // Tenant-scoped: surgeries outside this hospital are unreachable.
  const surgery = await db.oTSurgery.findFirst({ where: { id: body.id, hospitalId: gate.session.hospitalId } });
  if (!surgery) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.checklistKey) {
    // Whitelist the checklist keys — arbitrary keys must never be persisted.
    if (!(CHECKLIST_KEYS as readonly string[]).includes(body.checklistKey)) {
      return NextResponse.json({ error: "invalid_checklist_key", allowed: CHECKLIST_KEYS }, { status: 400 });
    }
    let checklist: PreOpChecklist = {};
    try { checklist = JSON.parse(surgery.preOpChecklist || "{}"); } catch { /* ignore */ }
    checklist[body.checklistKey as keyof PreOpChecklist] = Boolean(body.value);
    data.preOpChecklist = JSON.stringify(checklist);
  }
  if (body.status) {
    const flow: Record<string, string[]> = { planned: ["in_progress", "cancelled", "postponed"], in_progress: ["completed"], completed: [], cancelled: [], postponed: ["planned"] };
    if (!(flow[surgery.status] || []).includes(body.status)) {
      return NextResponse.json({ error: "invalid_transition", from: surgery.status }, { status: 400 });
    }
    data.status = body.status;
    if (body.status === "in_progress") data.actualStartTime = new Date();
    if (body.status === "completed") data.actualEndTime = new Date();
  }

  const updated = await db.oTSurgery.update({ where: { id: surgery.id }, data });
  await audit({
    hospitalId: surgery.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: body.checklistKey ? "or.checklist" : "or.status", entityType: "OTSurgery", entityId: surgery.id,
    detail: body.checklistKey ? { item: body.checklistKey, value: body.value } : { from: surgery.status, to: body.status },
  });
  return NextResponse.json({ surgery: updated });
});
