import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   NEXURA CLINIC — SIMILAR-PATIENT COHORT (backend-core-2)
   Was: a static 3-condition pattern table pretending to be
   "K Health-style matching". Now it queries the clinic's REAL
   visit history (ClinicVisit.diagnosis) and aggregates the
   medicines actually prescribed to that cohort (ClinicRx),
   computing frequencies from live data.

   Honest empty state: when the clinic's history has too few
   matching visits, the response says so instead of inventing
   percentages. No synthetic cohort is ever returned.
   ============================================================ */

const STOPWORDS = new Set([
  "the", "and", "for", "with", "pain", "since", "from", "have", "has", " complaints", "patient",
  "complaints", "years", "year", "days", "days", "old", "male", "female", "aana", "hai", "ke", "ki", "me", "se",
]);

/** Extract meaningful search tokens from a free-text query. */
function tokens(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t))
    .slice(0, 6);
}

const MIN_COHORT = 3; // below this, percentages are noise — say so instead

async function POST_impl(req: NextRequest) {
  try {
    const b = await req.json().catch(() => ({}));
    const q = typeof b?.symptoms === "string" ? b.symptoms.trim() : typeof b?.diagnosis === "string" ? b.diagnosis.trim() : "";
    if (!q) return NextResponse.json({ error: "no_input" }, { status: 400 });

    const terms = tokens(q);
    if (terms.length === 0) terms.push(q.toLowerCase().slice(0, 60));

    // real visits whose recorded diagnosis mentions any query term
    const visits = await db.clinicVisit.findMany({
      where: {
        AND: [
          { diagnosis: { not: null } },
          { OR: terms.map((t) => ({ diagnosis: { contains: t, mode: "insensitive" as const } })) },
        ],
      },
      select: { id: true, diagnosis: true, meds: { select: { medicine: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    if (visits.length < MIN_COHORT) {
      return NextResponse.json({
        matches: [],
        sampleSize: visits.length,
        message:
          visits.length === 0
            ? "No matching visit history in this clinic yet — cohort matching needs recorded diagnoses."
            : `Only ${visits.length} matching visit(s) recorded — too few for a reliable cohort match.`,
        source: "clinic-db (real visit history)",
      });
    }

    // group by normalized diagnosis, aggregate prescribed medicines
    const groups = new Map<string, { count: number; meds: Map<string, number> }>();
    for (const v of visits) {
      const dx = (v.diagnosis ?? "").trim();
      if (!dx) continue;
      const key = dx.length > 60 ? `${dx.slice(0, 57)}…` : dx;
      const g = groups.get(key) ?? { count: 0, meds: new Map<string, number>() };
      g.count += 1;
      for (const m of v.meds) {
        const med = m.medicine.trim();
        if (med) g.meds.set(med, (g.meds.get(med) ?? 0) + 1);
      }
      groups.set(key, g);
    }

    const matches = [...groups.entries()]
      .sort((a, b2) => b2[1].count - a[1].count)
      .slice(0, 5)
      .map(([diagnosis, g]) => ({
        diagnosis,
        commonMeds: [...g.meds.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([med]) => med),
        percentage: Math.round((g.count / visits.length) * 100),
      }));

    return NextResponse.json({
      matches,
      sampleSize: visits.length,
      source: "clinic-db (real visit history — medicines actually prescribed to this cohort)",
    });
  } catch (e) {
    log.error("clinic", "similar_patients_failed", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "match_failed" }, { status: 500 });
  }
}

export const POST = withProductAuth("clinic.similar-patients.POST", POST_impl);
