import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { getPortalUser } from "@/lib/portal-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/connect/patient-identity
 * Resolves WHO the caller is on the patient side of Connect:
 *   1. A portal session  → the portal user's own linked hospital patient.
 *   2. DEMO_MODE         → the demo patient (documented demo posture).
 *   3. Production, no session → 401. Never a directory listing.
 * Returns the MINIMAL identity needed to open the Connect patient view
 * (id + name) — no clinical data flows through this endpoint.
 */
export async function GET(_req: NextRequest) {
  try {
    // 1. Signed portal session → own patient record.
    const user = await getPortalUser({
      id: true,
      fullName: true,
      hospitalPatientUhid: true,
    });
    if (user?.hospitalPatientUhid) {
      const patient = await db.hospitalPatient.findFirst({
        where: { uhid: user.hospitalPatientUhid },
        orderBy: { createdAt: "asc" },
        select: { id: true, fullName: true },
      });
      if (patient) {
        return NextResponse.json({
          patientId: patient.id,
          patientName: patient.fullName,
          source: "portal",
        });
      }
    }

    // 2. Demo mode → the demo patient identity.
    if (isDemoMode()) {
      const patient = await db.hospitalPatient.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, fullName: true },
      });
      if (!patient) {
        return NextResponse.json({ error: "no_patients" }, { status: 404 });
      }
      return NextResponse.json({
        patientId: patient.id,
        patientName: patient.fullName,
        source: "demo",
      });
    }

    // 3. Production without a portal session — fail closed.
    return NextResponse.json(
      { error: "unauthenticated", detail: "Sign in to the portal to use Connect." },
      { status: 401 },
    );
  } catch {
    return NextResponse.json({ error: "identity_failed" }, { status: 500 });
  }
}
