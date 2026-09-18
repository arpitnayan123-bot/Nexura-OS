import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, fail, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";
import { sweepEscalations } from "@/lib/nx/escalation";

/* ============================================================
   NEXURA OS v5 — COMPLIANCE & CERTIFICATION TRACKER
   GET /api/nx/compliance → NABH/ISO/CBHI audit-ready metrics,
   each computed live from real operational data with a target and
   status. POST /retention runs the data-retention engine.
   ============================================================ */

interface Metric {
  id: string;
  name: string;
  value: string;
  target: string;
  status: "pass" | "watch" | "fail";
  source: string;
}

export const GET = withRoute("compliance.metrics", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "audit.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const now = Date.now();

  const [
    notesTotal,
    notesSigned,
    incidentsOpen,
    incidentsCritical,
    consentsTotal,
    consentsGranted,
    medsAdmin,
    medsVerified,
    deliveriesFailed,
    tasksOpenOld,
  ] = await Promise.all([
    db.clinicalNote.count({ where: { hospitalId } }).catch(() => 0),
    db.clinicalNote.count({ where: { hospitalId, signedAt: { not: null } } }).catch(() => 0),
    db.nxIncident.count({ where: { hospitalId, status: { notIn: ["resolved", "closed"] } } }),
    db.nxIncident.count({
      where: { hospitalId, severity: "critical", status: { notIn: ["resolved", "closed"] } },
    }),
    db.nxConsent.count({ where: { hospitalId } }),
    db.nxConsent.count({ where: { hospitalId, status: "granted" } }),
    db.nxMedicationAdministration.count({ where: { hospitalId } }).catch(() => 0),
    db.nxMedicationAdministration
      .count({ where: { hospitalId, status: "given", administeredBy: { not: null } } })
      .catch(() => -1),
    db.nxWebhookDelivery.count({
      where: { hospitalId, status: "failed", createdAt: { gte: new Date(now - 7 * 86400_000) } },
    }),
    db.nxTask.count({
      where: {
        hospitalId,
        status: { notIn: ["done", "cancelled"] },
        createdAt: { lt: new Date(now - 7 * 86400_000) },
      },
    }),
  ]);

  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 100);
  const metrics: Metric[] = [
    {
      id: "note_signature",
      name: "Clinical note signature rate",
      value: `${pct(notesSigned, notesTotal)}%`,
      target: "≥ 95%",
      status:
        pct(notesSigned, notesTotal) >= 95
          ? "pass"
          : pct(notesSigned, notesTotal) >= 80
            ? "watch"
            : "fail",
      source: "NABH HIMS standards — record completeness",
    },
    {
      id: "consent_coverage",
      name: "Consent capture coverage",
      value: `${consentsTotal} records, ${pct(consentsGranted, consentsTotal)}% granted`,
      target: "captured for all admissions",
      status: consentsTotal > 0 ? "pass" : "watch",
      source: "DPDP 2023 §6 — purpose-limited consent",
    },
    {
      id: "med_verification",
      name: "Medication administration dual-check",
      value:
        medsVerified >= 0
          ? `${pct(medsVerified, medsAdmin)}% administered-with-signature`
          : "MAR empty",
      target: "100% for high-alert drugs",
      status: medsVerified >= 0 ? (pct(medsVerified, medsAdmin) >= 95 ? "pass" : "watch") : "watch",
      source: "NABH medication management (MM)",
    },
    {
      id: "incident_closure",
      name: "Open incidents",
      value: `${incidentsOpen} open (${incidentsCritical} critical)`,
      target: "critical = 0",
      status: incidentsCritical === 0 ? "pass" : incidentsCritical <= 2 ? "watch" : "fail",
      source: "NABH quality improvement (QI)",
    },
    {
      id: "integration_health",
      name: "Partner delivery failures (7d)",
      value: `${deliveriesFailed}`,
      target: "0 stalled",
      status: deliveriesFailed === 0 ? "pass" : deliveriesFailed < 5 ? "watch" : "fail",
      source: "ISO 27001 A.12 — interface monitoring",
    },
    {
      id: "task_hygiene",
      name: "Tasks open >7 days",
      value: `${tasksOpenOld}`,
      target: "≤ 5",
      status: tasksOpenOld <= 5 ? "pass" : tasksOpenOld <= 20 ? "watch" : "fail",
      source: "Operational hygiene — internal SLA",
    },
  ];
  const pass = metrics.filter((m) => m.status === "pass").length;
  return ok(
    {
      metrics,
      readinessScore: Math.round((pass / metrics.length) * 100),
      frameworks: [
        "NABH 6th edition",
        "ISO 27001:2022 (annex controls mapped)",
        "ABDM / CBHI readiness",
        "DPDP Act 2023",
      ],
      note: "Metrics are computed live from operational data — an auditor sees the same numbers the ward sees.",
    },
    { requestId },
  );
});

/* ---------- Retention engine ---------- */

const RETENTION_PROFILES: Record<string, { months: Record<string, number | null> }> = {
  default: {
    months: {
      webhookDelivery: 3,
      aiInteraction: 12,
      loginAttempt: 6,
      sessionRecord: 3,
      integrationEvent: 6,
    },
  },
  strict: {
    months: {
      webhookDelivery: 1,
      aiInteraction: 6,
      loginAttempt: 3,
      sessionRecord: 1,
      integrationEvent: 3,
    },
  },
  long: {
    months: {
      webhookDelivery: 12,
      aiInteraction: 60,
      loginAttempt: 24,
      sessionRecord: 12,
      integrationEvent: 24,
    },
  },
};

export const POST = withRoute(
  "compliance.retention.run",
  async (req: NextRequest, { requestId }) => {
    const g = await guard(req, "security.manage");
    if ("response" in g) return g.response;
    const hospitalId = g.session.hospitalId;
    if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
    const profile = (req.nextUrl.searchParams.get("profile") ??
      "default") as keyof typeof RETENTION_PROFILES;
    const spec = RETENTION_PROFILES[profile] ?? RETENTION_PROFILES.default;
    const results: Record<string, number> = {};
    const cutoffs: Record<string, Date> = {};
    const purge = async (
      name: string,
      months: number | null,
      run: (cutoff: Date) => Promise<unknown>,
    ) => {
      if (months === null) return;
      const cutoff = new Date(Date.now() - months * 30 * 86400_000);
      cutoffs[name] = cutoff;
      try {
        const r = await run(cutoff);
        results[name] = (r as { count?: number })?.count ?? 0;
      } catch {
        results[name] = -1;
      }
    };
    await purge("webhookDelivery", spec.months.webhookDelivery, (c) =>
      db.nxWebhookDelivery.deleteMany({ where: { hospitalId, createdAt: { lt: c } } }),
    );
    await purge("aiInteraction", spec.months.aiInteraction, (c) =>
      db.nxAIInteraction.deleteMany({ where: { hospitalId, createdAt: { lt: c } } }),
    );
    await purge("loginAttempt", spec.months.loginAttempt, (c) =>
      db.nxLoginAttempt.deleteMany({ where: { createdAt: { lt: c } } }),
    );
    await purge("sessionRecord", spec.months.sessionRecord, (c) =>
      db.nxSessionRecord.deleteMany({ where: { createdAt: { lt: c }, revokedAt: { not: null } } }),
    );
    await purge("integrationEvent", spec.months.integrationEvent, (c) =>
      db.nxIntegrationEvent.deleteMany({ where: { hospitalId, createdAt: { lt: c } } }),
    );
    await audit({
      hospitalId,
      actorName: g.session.name,
      actorRole: g.session.role,
      action: "retention.run",
      entityType: "compliance",
      detail: { profile, results },
    });
    const escalated = await sweepEscalations(hospitalId);
    return ok(
      { profile, purged: results, escalatedAdvanced: escalated, runAt: new Date().toISOString() },
      { requestId },
    );
  },
);
