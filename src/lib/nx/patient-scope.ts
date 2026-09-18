import { db } from "@/lib/db";
import type { NxSession } from "./session";

/* ============================================================
   NEXURA OS — PATIENT HOSPITAL SCOPING (p2-hardening-1)
   Permission `patient.clinical.view` says WHAT a role may see;
   this helper enforces WHERE: a clinician may only touch
   patients of their own hospital. Platform-wide roles
   (super_admin, org_admin) bypass; everyone else fails closed
   when the session carries no hospitalId.
   Used by every /api/nx/predict route that takes a patientId.
   ============================================================ */

const PLATFORM_ROLES = new Set(["super_admin", "org_admin"]);

export async function patientInScope(patientId: string, session: NxSession): Promise<boolean> {
  if (PLATFORM_ROLES.has(session.role)) return true;
  if (!session.hospitalId) return false;
  const patient = await db.hospitalPatient
    .findUnique({ where: { id: patientId }, select: { hospitalId: true } })
    .catch(() => null);
  return Boolean(patient && patient.hospitalId === session.hospitalId);
}
