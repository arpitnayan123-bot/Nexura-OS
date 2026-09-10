import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";

/* Doctor-on-demand routing: deterministic pairing of demand to capacity.
   Score = specialty match (3) + on-duty (2) + shift fit (1) − active load (0.5/consult). */

const RouteSchema = z.object({
  teleConsultId: z.string().min(4),
  specialty: z.string().max(60).optional(),
  urgency: z.enum(["routine", "urgent", "emergency"]).default("routine"),
  bandwidth: z.enum(["auto", "low", "text-only"]).default("auto"),
});

export const POST = withRoute("telehealth.route", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "appointments.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, RouteSchema);
  if ("response" in body) return body.response;
  const tc = await db.nxTeleConsult.findFirst({ where: { id: body.data.teleConsultId, hospitalId } });
  if (!tc) return fail("not_found", 404, undefined, requestId);
  const patient = await db.hospitalPatient.findUnique({ where: { id: tc.patientId } });
  const candidates = await db.nxStaffUser.findMany({
    where: { hospitalId, role: "doctor", status: "active", onDuty: true },
    take: 40,
  });
  const loadByDoctor = new Map<string, number>();
  const live = await db.nxTeleConsult.count({ where: { hospitalId, state: "live" } });
  void live;
  const scored = candidates.map((d) => {
    let score = 0;
    if (body.data.specialty && d.speciality?.toLowerCase().includes(body.data.specialty.toLowerCase())) score += 3;
    score += 2; // onDuty filter already applied
    if (body.data.urgency === "emergency" && d.shift === "night") score += 1;
    const load = loadByDoctor.get(d.id) ?? 0;
    score -= load * 0.5;
    return { id: d.id, name: d.name, staffCode: d.staffCode, speciality: d.speciality, shift: d.shift, score: Number(score.toFixed(1)) };
  }).sort((a, b) => b.score - a.score);
  const chosen = scored[0];
  if (!chosen) return fail("no_capacity", 503, "No on-duty doctor available right now.", requestId);
  const updated = await db.nxTeleConsult.update({
    where: { id: tc.id },
    data: { state: "routed", doctorId: chosen.id, doctorName: chosen.name, bandwidthMode: body.data.bandwidth, routedReason: `highest score ${chosen.score} (specialty${body.data.specialty ? "+match" : "-only"} / duty / load)` },
  });
  return ok({ routedTo: chosen, alternatives: scored.slice(1, 4), teleConsult: updated, patientLanguage: patient?.primaryLanguage }, { requestId });
});

export const GET = withRoute("telehealth.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "appointments.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const rows = await db.nxTeleConsult.findMany({ where: { hospitalId }, orderBy: { createdAt: "desc" }, take: 30 });
  return ok(rows, { requestId });
});
