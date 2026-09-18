import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, ipOf, fail, newRequestId } from "./api";
import { isDemoMode } from "@/lib/env";
import { getSession } from "./session";
import { getAuthUser } from "@/lib/auth/jwt";

/* ============================================================
   NEXURA CONNECT — ENDPOINT GATE
   Connect is a demo telemedicine product: in DEMO_MODE the UI picks
   its demo doctor/patient client-side (documented demo posture).
   In production this gate enforces:
     1. Per-IP rate limit (default 90/min).
     2. An authenticated session (nx staff or legacy access token).
     3. Doctor-side actions (fromRole:"doctor" writes, prescription
        sync) require a CLINICIAN session — a patient/pharmacy/reception
        account can never impersonate a doctor or touch prescriptions.
   Call at the top of any /api/connect handler:
     const gate = connectGate(req); if (gate) return gate;
   ============================================================ */

const CLINICIAN_ROLES = new Set([
  "doctor",
  "consultant",
  "senior_doctor",
  "jr_doctor",
  "head_doctor",
  "admin",
  "hospital_admin",
  "org_admin",
  "super_admin",
  "command",
]);

export function connectGate(
  req: NextRequest,
  opts?: { max?: number; windowMs?: number },
): NextResponse | null {
  const max = opts?.max ?? 90;
  const windowMs = opts?.windowMs ?? 60_000;
  const rl = rateLimit(`connect:${ipOf(req)}`, max, windowMs);
  if (!rl.allowed) {
    return fail("rate_limited", 429, "Too many requests — please slow down.", newRequestId(), {
      "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
    });
  }
  if (!isDemoMode()) {
    const session = getSession(req);
    const legacy = getAuthUser(req);
    if (!session && !legacy) {
      return fail("unauthenticated", 401, "Sign in to use this surface.", newRequestId());
    }
  }
  return null;
}

/** May THIS caller act on the doctor side of a Connect thread? */
export function canActAsDoctor(req: NextRequest): boolean {
  if (isDemoMode()) return true; // demo doctor console (documented posture)
  const session = getSession(req);
  if (session) return CLINICIAN_ROLES.has(session.role);
  const legacy = getAuthUser(req);
  return !!legacy && CLINICIAN_ROLES.has(String(legacy.role || ""));
}

/** Returns a 403 response when a non-clinician attempts doctor-side writes. */
export function doctorOnly(req: NextRequest): NextResponse | null {
  if (canActAsDoctor(req)) return null;
  return fail("forbidden", 403, "Only clinicians can perform this action.", newRequestId());
}

/* ---------- Party check (p2-hardening-1) ----------
   Authenticating the caller is not enough: a signed-in user must
   also BE a party to the specific thread (its doctor or its
   patient) before reading or writing its messages/calls. Demo
   mode keeps its documented posture (UI picks demo participants
   client-side); production enforces strictly. */
export async function connectPartyDenied(
  req: NextRequest,
  connection: { doctorId: string; patientId: string },
): Promise<NextResponse | null> {
  if (isDemoMode()) return null;
  const session = getSession(req);
  const legacy = getAuthUser(req);
  const callerId = session?.userId ?? legacy?.id ?? null;
  if (!callerId)
    return fail("unauthenticated", 401, "Sign in to use this surface.", newRequestId());
  if (callerId === connection.doctorId || callerId === connection.patientId) return null;
  return fail("forbidden", 403, "You are not a party to this conversation.", newRequestId());
}

/** Party check for the calls list: by connectionId the caller must be a
 *  party to that thread; by doctorId the caller must BE that doctor. */
export async function connectCallsListDenied(
  req: NextRequest,
  filter: { connectionId?: string | null; doctorId?: string | null },
): Promise<NextResponse | null> {
  if (isDemoMode()) return null;
  const session = getSession(req);
  const legacy = getAuthUser(req);
  const callerId = session?.userId ?? legacy?.id ?? null;
  if (!callerId)
    return fail("unauthenticated", 401, "Sign in to use this surface.", newRequestId());
  if (filter.doctorId && callerId === filter.doctorId) return null;
  if (filter.connectionId) {
    const conn = await db.connectConnection
      .findUnique({
        where: { id: filter.connectionId },
        select: { doctorId: true, patientId: true },
      })
      .catch(() => null);
    if (!conn) return fail("not_found", 404, undefined, newRequestId());
    if (callerId === conn.doctorId || callerId === conn.patientId) return null;
  }
  return fail("forbidden", 403, "You are not a party to these calls.", newRequestId());
}
