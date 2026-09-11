import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getPhiSubjectId } from "@/modules/phi/session";
import { requireScope } from "@/modules/phi/consent";
import { phiAudit } from "@/modules/phi/audit";
import { firstZodIssue, profilePutSchema } from "@/modules/phi/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/nx/phi/profile — the subject's own health profile row (or null).
   Gated by health_profile consent: withdrawal stops serving data. */
export async function GET() {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }
    const scopeErr = await requireScope(subjectId, "health_profile");
    if (scopeErr) {
      return NextResponse.json(
        { ok: false, error: "Health-profile consent is required to view the profile.", code: "consent_required" },
        { status: 403 }
      );
    }
    const profile = await db.phiHealthProfile.findUnique({ where: { subjectId } });
    return NextResponse.json({ ok: true, data: { profile } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/profile GET", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}

/* PUT /api/nx/phi/profile — validated partial profile upsert.
   Ages < 18 are rejected with code "minor_not_supported" (adults-only tool).
   Audit carries field NAMES only — never values. */
export async function PUT(req: NextRequest) {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }
    const scopeErr = await requireScope(subjectId, "health_profile");
    if (scopeErr) {
      return NextResponse.json(
        { ok: false, error: "Health-profile consent is required to save the profile.", code: "consent_required" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
    if (body === undefined || typeof body !== "object" || body === null) {
      return NextResponse.json({ ok: false, error: "expected a JSON object body", code: "invalid_input" }, { status: 400 });
    }

    /* Adults-only gate BEFORE schema validation so the dedicated code is returned. */
    const raw = body as Record<string, unknown>;
    if (typeof raw.ageYears === "number" && Number.isFinite(raw.ageYears) && raw.ageYears >= 0 && raw.ageYears < 18) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This tool is adults-only (18+). Nexura does not analyze data for people under 18 — please consult a pediatrician or qualified clinician for anyone younger.",
          code: "minor_not_supported",
        },
        { status: 400 }
      );
    }

    const parsed = profilePutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: firstZodIssue(parsed.error), code: "invalid_input" }, { status: 400 });
    }
    const d = parsed.data;

    const row = await db.phiHealthProfile.upsert({
      where: { subjectId },
      create: {
        subjectId,
        languagePref: d.languagePref ?? "en",
        ageYears: d.ageYears ?? null,
        sexAtBirth: d.sexAtBirth ?? null,
        heightCm: d.heightCm ?? null,
        weightKg: d.weightKg ?? null,
        waistCm: d.waistCm ?? null,
        pregnancyPossibility: d.pregnancyPossibility ?? false,
        dietaryPref: d.dietaryPref ?? null,
        cuisine: d.cuisine ?? null,
        activityLevel: d.activityLevel ?? null,
        occupation: d.occupation ?? null,
        shiftWork: d.shiftWork ?? false,
        accessibilityNotes: d.accessibilityNotes ?? null,
      },
      update: {
        ...(d.ageYears !== undefined ? { ageYears: d.ageYears } : {}),
        ...(d.sexAtBirth !== undefined ? { sexAtBirth: d.sexAtBirth } : {}),
        ...(d.heightCm !== undefined ? { heightCm: d.heightCm } : {}),
        ...(d.weightKg !== undefined ? { weightKg: d.weightKg } : {}),
        ...(d.waistCm !== undefined ? { waistCm: d.waistCm } : {}),
        ...(d.pregnancyPossibility !== undefined ? { pregnancyPossibility: d.pregnancyPossibility } : {}),
        ...(d.languagePref !== undefined ? { languagePref: d.languagePref } : {}),
        ...(d.dietaryPref !== undefined ? { dietaryPref: d.dietaryPref } : {}),
        ...(d.cuisine !== undefined ? { cuisine: d.cuisine } : {}),
        ...(d.activityLevel !== undefined ? { activityLevel: d.activityLevel } : {}),
        ...(d.occupation !== undefined ? { occupation: d.occupation } : {}),
        ...(d.shiftWork !== undefined ? { shiftWork: d.shiftWork } : {}),
        ...(d.accessibilityNotes !== undefined ? { accessibilityNotes: d.accessibilityNotes } : {}),
      },
    });

    const fieldNames = Object.keys(d)
      .filter((k) => (d as Record<string, unknown>)[k] !== undefined)
      .join(",");
    await phiAudit.record({
      subjectId,
      action: "profile.updated",
      resource: "health_profile",
      outcome: "ok",
      meta: { fields: fieldNames.slice(0, 120) || "none" },
    });

    return NextResponse.json({ ok: true, data: { profile: row } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/profile PUT", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
