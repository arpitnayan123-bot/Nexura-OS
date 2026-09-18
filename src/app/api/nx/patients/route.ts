import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireHospitalContext, withRoute } from "@/lib/nx/api";
import { requireModule } from "@/lib/nx/session";
import { ciFilter } from "@/lib/nx/db-dialect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — universal patient search (name / UHID / phone). */
export const GET = withRoute("nx.patients.list", async (req: NextRequest) => {
  const gate = await requireModule(req, "patients");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;
  if (!hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const take = Math.min(Number(searchParams.get("take")) || 20, 50);

  // Patient-role accounts may only ever see their OWN record — never the
  // hospital directory.
  const selfScope =
    gate.session.role === "patient" && gate.session.linkedPatientId
      ? { id: gate.session.linkedPatientId }
      : {};

  const where = q
    ? {
        hospitalId,
        ...selfScope,
        OR: [{ fullName: ciFilter(q) }, { uhid: ciFilter(q) }, { phone: ciFilter(q) }],
      }
    : { hospitalId, ...selfScope };

  const patients = await db.hospitalPatient.findMany({
    where,
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      uhid: true,
      fullName: true,
      age: true,
      gender: true,
      bloodGroup: true,
      phone: true,
      allergy: true,
      chronicConditions: true,
      primaryLanguage: true,
      insuranceProvider: true,
      createdAt: true,
      admissions: {
        where: { dischargeStatus: "active" },
        select: {
          id: true,
          admissionDate: true,
          bed: { select: { bedNumber: true, ward: { select: { name: true } } } },
        },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    patients: patients.map((p) => ({
      ...p,
      currentLocation: p.admissions[0]
        ? `${p.admissions[0].bed?.ward?.name || "Ward"} · ${p.admissions[0].bed?.bedNumber || "—"}`
        : null,
      isAdmitted: p.admissions.length > 0,
      admissions: undefined,
    })),
    count: patients.length,
  });
});
