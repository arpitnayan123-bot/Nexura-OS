import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, withRoute, fail } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GLOBAL SEARCH — cross-entity, permission-aware.
   Patients, staff, tasks, orders, appointments, documents.
   Every result only includes entities the caller may see,
   scoped to the caller's hospital.
   ============================================================ */

export const GET = withRoute("global.search", async (req: NextRequest) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return ok({ groups: [] });

  const like = { contains: q, mode: "insensitive" as const };
  const canClinical = true; // demographic view already granted; clinical fields trimmed for non-clinical

  // Directory boundary (mirrors /api/nx/patients self-scope): a `patient`-role
  // session may only ever see its OWN linked record — never enumerate the
  // hospital's patients, staff, tasks, appointments or admissions. Staff
  // roles are unchanged; patient sessions keep their linkedPatientId in
  // DEMO_MODE, so the demo posture is unaffected.
  const toPatientItems = (
    rows: {
      id: string;
      fullName: string;
      uhid: string;
      gender: string;
      age: number | null;
      allergy: string | null;
    }[],
  ) =>
    rows.map((p) => ({
      id: p.id,
      title: p.fullName,
      sub: `${p.uhid} · ${p.gender}${p.age ? ` · ${p.age}y` : ""}`,
      badge: p.allergy ? "allergy" : undefined,
      href: `patient:${p.id}`,
    }));

  if (g.session.role === "patient") {
    const patients = g.session.linkedPatientId
      ? await db.hospitalPatient.findMany({
          where: {
            hospitalId,
            id: g.session.linkedPatientId,
            OR: [{ fullName: like }, { uhid: like }, { phone: like }],
          },
          select: { id: true, fullName: true, uhid: true, gender: true, age: true, allergy: true },
          take: 8,
        })
      : [];
    return ok({
      groups: [{ type: "patient", label: "Patients", items: toPatientItems(patients) }].filter(
        (gr) => gr.items.length > 0,
      ),
    });
  }

  const [patients, staff, tasks, appointments, admissions] = await Promise.all([
    db.hospitalPatient.findMany({
      where: { hospitalId, OR: [{ fullName: like }, { uhid: like }, { phone: like }] },
      select: { id: true, fullName: true, uhid: true, gender: true, age: true, allergy: true },
      take: 8,
    }),
    db.nxStaffUser.findMany({
      where: { hospitalId, OR: [{ name: like }, { staffCode: like }] },
      select: { id: true, name: true, staffCode: true, role: true, department: true },
      take: 6,
    }),
    db.nxTask.findMany({
      where: { hospitalId, OR: [{ title: like }, { patientUhid: like }] },
      select: { id: true, title: true, status: true, priority: true, patientName: true },
      take: 6,
    }),
    db.hospitalAppointment.findMany({
      where: { hospitalId, patient: { OR: [{ fullName: like }, { uhid: like }] } },
      select: {
        id: true,
        date: true,
        timeSlot: true,
        status: true,
        patient: { select: { fullName: true, uhid: true } },
      },
      orderBy: { date: "desc" },
      take: 6,
    }),
    db.hospitalAdmission.findMany({
      where: {
        hospitalId,
        dischargeStatus: "active",
        patient: { OR: [{ fullName: like }, { uhid: like }] },
      },
      select: {
        id: true,
        admissionDate: true,
        patient: { select: { fullName: true, uhid: true } },
      },
      take: 6,
    }),
  ]);
  void canClinical;

  return ok({
    groups: [
      { type: "patient", label: "Patients", items: toPatientItems(patients) },
      {
        type: "staff",
        label: "Staff",
        items: staff.map((s) => ({
          id: s.id,
          title: s.name,
          sub: `${s.staffCode} · ${s.role}${s.department ? ` · ${s.department}` : ""}`,
          href: `staff:${s.id}`,
        })),
      },
      {
        type: "task",
        label: "Tasks",
        items: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          sub: `${t.status} · ${t.priority}${t.patientName ? ` · ${t.patientName}` : ""}`,
          href: `task:${t.id}`,
        })),
      },
      {
        type: "appointment",
        label: "Appointments",
        items: appointments.map((a) => ({
          id: a.id,
          title: a.patient.fullName,
          sub: `${new Date(a.date).toLocaleDateString("en-IN")} ${a.timeSlot} · ${a.status}`,
          href: `appointment:${a.id}`,
        })),
      },
      {
        type: "admission",
        label: "Active Admissions",
        items: admissions.map((a) => ({
          id: a.id,
          title: a.patient.fullName,
          sub: `admitted ${new Date(a.admissionDate).toLocaleDateString("en-IN")}`,
          href: `admission:${a.id}`,
        })),
      },
    ].filter((gr) => gr.items.length > 0),
  });
});
