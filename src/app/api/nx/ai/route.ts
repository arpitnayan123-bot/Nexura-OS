import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFresh, canAccessModule } from "@/lib/nx/session";
import { withRoute } from "@/lib/nx/api";
import { runText } from "@/lib/gemini";
import { audit } from "@/lib/nx/audit";
import { aiGate } from "@/lib/nx/ai-guard";
import {
  confidenceHeuristic,
  checkAiConsent,
  enforceThreshold,
  logAiInteraction,
} from "@/lib/nx/ai-governance";
import { isDemoMode } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* ============================================================
   NEXURA INTELLIGENCE — AI layer with strict safety boundaries.
   AI may: summarize, draft, prioritize-explain, recommend.
   AI may NOT: diagnose, prescribe, discharge, or act silently.
   Every output is logged (NxAIInteraction) and labeled as
   AI-generated requiring clinician review.
   ============================================================ */

const SYSTEM = `You are Nexura Intelligence, the clinical-operational AI inside Hospital OS — the Nexura hospital operating system.
Rules you MUST follow:
- Summarize and organize information. NEVER diagnose. NEVER prescribe. NEVER recommend discharge.
- If data is missing, say what is missing instead of guessing.
- Output clean JSON only. No markdown fences.`;

async function logAI(
  hospitalId: string,
  name: string,
  role: string,
  feature: string,
  status: string,
) {
  await db.nxAIInteraction
    .create({ data: { hospitalId, userName: name, userRole: role, feature, status } })
    .catch(() => null);
}

export const POST = withRoute("nx.ai.run", async (req: NextRequest) => {
  // AI budget guard (per-IP rate limit; production additionally requires a session)
  const __ai = aiGate(req, { max: 30, windowMs: 60_000 });
  if (__ai) return __ai;
  // Single session resolution — the previous double requireModule ran 2× user
  // and session-record queries on every call.
  const session = await getSessionFresh(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (
    !canAccessModule(session.role, "doctor") &&
    !canAccessModule(session.role, "command-center")
  ) {
    return NextResponse.json({ error: "forbidden_module" }, { status: 403 });
  }
  if (!session.hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 400 });
  const hospitalId: string = session.hospitalId;
  const body = await req.json().catch(() => ({}));
  const feature = String(body.feature || "");

  try {
    if (feature === "patient_summary") {
      const patient = await db.hospitalPatient.findFirst({
        where: { id: body.patientId, hospitalId },
        include: {
          admissions: {
            orderBy: { admissionDate: "desc" },
            take: 2,
            include: {
              admittingDoctor: true,
              bed: { include: { ward: true } },
              orders: { include: { labResults: true }, orderBy: { createdAt: "desc" }, take: 8 },
              vitals: { orderBy: { recordedAt: "desc" }, take: 4 },
              clinicalNotes: { take: 4, orderBy: { createdAt: "desc" } },
            },
          },
          prescriptions: { take: 5, orderBy: { createdAt: "desc" } },
        },
      });
      if (!patient) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const a = patient.admissions[0];
      const patientBlock = {
        patient: {
          name: patient.fullName,
          age: patient.age,
          gender: patient.gender,
          allergies: patient.allergy,
          chronic: patient.chronicConditions,
          bloodGroup: patient.bloodGroup,
        },
        admission: a
          ? {
              diagnosis: a.admissionDiagnosis,
              type: a.admissionType,
              since: a.admissionDate,
              doctor: a.admittingDoctor?.name,
              bed: a.bed ? `${a.bed.ward?.name} ${a.bed.bedNumber}` : null,
            }
          : "no active admission",
        recentOrders: a?.orders.map((o) => ({
          type: o.orderType,
          test: o.orderDetails,
          status: o.status,
          results: o.labResults.map(
            (r) => `${r.testName}: ${r.resultValue} ${r.unit} [${r.abnormalFlag}]`,
          ),
        })),
        vitals: a?.vitals.map((v) => ({
          at: v.recordedAt,
          bp: `${v.bpSystolic}/${v.bpDiastolic}`,
          pulse: v.pulseRate,
          spo2: v.spo2,
          temp: v.temperatureC,
          news2: v.news2Score,
        })),
        notes: a?.clinicalNotes.map((n) => ({
          type: n.noteType,
          excerpt: (n.fullText || n.assessment || n.subjective || "")?.slice(0, 300),
        })),
      };
      /* CONSENT IS ENFORCED, not just displayed (arch-ai-1): AI processing of
         an identified patient requires a granted ai_assist/data_share
         consent. Production blocks; DEMO_MODE keeps the documented
         permissive posture (synthetic patients carry no consent records). */
      const consentFlag = await checkAiConsent(hospitalId, patient.id);
      if (consentFlag === false && !isDemoMode()) {
        await logAiInteraction({
          hospitalId,
          userName: session.name,
          userRole: session.role,
          feature: "patient_summary",
          status: "consent_blocked",
          output: null,
          confidence: 0,
          consentFlag,
          thresholdAction: "blocked",
        });
        return NextResponse.json(
          {
            error: "ai_consent_required",
            detail:
              "This patient has not consented to AI-assisted processing. Obtain consent or use manual workflow.",
            aiConsent: false,
          },
          { status: 403 },
        );
      }
      const out = await runText(
        `Summarize this inpatient for a busy clinician. JSON: {"oneLine": str, "currentStatus": str, "activeProblems": str[], "medications": str[], "watchItems": str[], "dataGaps": str[], "suggestedNextSteps": str[]}. SuggestedNextSteps are coordination suggestions only, NOT clinical orders.\n${JSON.stringify(patientBlock)}`,
        SYSTEM,
        `nx.ai.${feature}`,
      );
      const confidence = confidenceHeuristic(out);
      const gate = await enforceThreshold(hospitalId, "patient_summary", confidence);
      await logAiInteraction({
        hospitalId,
        userName: session.name,
        userRole: session.role,
        feature: "patient_summary",
        status: gate.action === "blocked" ? "review_required" : "completed",
        output: out,
        confidence,
        consentFlag,
        thresholdAction: gate.action,
      });
      if (gate.action === "blocked") {
        return NextResponse.json(
          {
            error: "ai_below_threshold",
            detail: "Output confidence below safety threshold — routed to clinician.",
            confidence,
            threshold: gate.min,
          },
          { status: 409 },
        );
      }
      return NextResponse.json({
        summary: out,
        generated: true,
        confidence,
        aiConsent: consentFlag,
        thresholdAction: gate.action,
        humanReviewRequired: gate.requireReview,
        promptVersion: "patient_summary@4",
        disclaimer:
          "AI-generated summary from structured data. Not a diagnosis. Requires clinician review.",
        at: new Date(),
      });
    }

    if (feature === "handover") {
      const ward = String(body.ward || "");
      const admissions = await db.hospitalAdmission.findMany({
        where: {
          hospitalId,
          dischargeStatus: "active",
          ...(ward
            ? { bed: { ward: { name: { contains: ward, mode: "insensitive" as const } } } }
            : {}),
        },
        include: {
          patient: true,
          bed: { include: { ward: true } },
          vitals: { orderBy: { recordedAt: "desc" }, take: 1 },
          orders: {
            where: { status: { in: ["ordered", "acknowledged", "in_progress"] } },
            take: 4,
          },
        },
        take: 14,
      });
      const tasks = await db.nxTask.findMany({
        where: { hospitalId, status: { in: ["open", "in_progress", "blocked"] } },
        take: 10,
      });
      const compact = {
        ward,
        patients: admissions.map((x) => ({
          name: x.patient.fullName,
          uhid: x.patientUhid,
          age: x.patient.age,
          bed: x.bed ? `${x.bed.ward?.name} ${x.bed.bedNumber}` : null,
          diagnosis: x.admissionDiagnosis,
          latestVitals: x.vitals[0]
            ? {
                bp: `${x.vitals[0].bpSystolic}/${x.vitals[0].bpDiastolic}`,
                spo2: x.vitals[0].spo2,
                pulse: x.vitals[0].pulseRate,
              }
            : null,
          pendingOrders: x.orders.length,
        })),
        openTasks: tasks.map((t) => ({ title: t.title, priority: t.priority, owner: t.ownerRole })),
      };
      const out = await runText(
        `Prepare an SBAR shift handover brief. JSON: {"headline": str, "stable": str[], "needsAttention": str[], "pendingTasks": str[], "handoverNotes": str[]}. Be concise; max 1 line per patient.\n${JSON.stringify(compact)}`,
        SYSTEM,
        `nx.ai.${feature}`,
      );
      const confidence = confidenceHeuristic(out);
      const gate = await enforceThreshold(hospitalId, "handover", confidence);
      await logAiInteraction({
        hospitalId,
        userName: session.name,
        userRole: session.role,
        feature: "handover",
        status: gate.action === "blocked" ? "review_required" : "completed",
        output: out,
        confidence,
        consentFlag: null,
        thresholdAction: gate.action,
      });
      if (gate.action === "blocked") {
        return NextResponse.json(
          {
            error: "ai_below_threshold",
            detail: "Output confidence below safety threshold — prepare the handover manually.",
            confidence,
            threshold: gate.min,
          },
          { status: 409 },
        );
      }
      return NextResponse.json({
        handover: out,
        generated: true,
        confidence,
        thresholdAction: gate.action,
        humanReviewRequired: gate.requireReview,
        disclaimer: "AI-generated brief. Verify against the record before handover.",
        at: new Date(),
      });
    }

    if (feature === "discharge_draft") {
      if (!["doctor", "admin"].includes(session.role)) {
        return NextResponse.json(
          { error: "doctor_only", detail: "Discharge documentation requires a clinician" },
          { status: 403 },
        );
      }
      const admission = await db.hospitalAdmission.findFirst({
        where: { id: body.admissionId, hospitalId },
        include: {
          patient: true,
          admittingDoctor: true,
          orders: { include: { labResults: true }, take: 10 },
          clinicalNotes: { take: 5, orderBy: { createdAt: "desc" } },
          vitals: { orderBy: { recordedAt: "desc" }, take: 3 },
        },
      });
      if (!admission) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const dischargeBlock = {
        patient: {
          name: admission.patient.fullName,
          age: admission.patient.age,
          gender: admission.patient.gender,
          allergies: admission.patient.allergy,
        },
        admission: {
          diagnosis: admission.admissionDiagnosis,
          type: admission.admissionType,
          since: admission.admissionDate,
          doctor: admission.admittingDoctor?.name,
        },
        keyResults: admission.orders.flatMap((o) =>
          o.labResults.map((r) => `${r.testName}: ${r.resultValue} ${r.unit} [${r.abnormalFlag}]`),
        ),
        notes: admission.clinicalNotes.map((n) =>
          (n.fullText || n.assessment || n.subjective || "")?.slice(0, 200),
        ),
        vitals: admission.vitals.map((v) => ({
          bp: `${v.bpSystolic}/${v.bpDiastolic}`,
          spo2: v.spo2,
          temp: v.temperatureC,
        })),
      };
      /* Consent enforced before any AI processing (arch-ai-1) — see the
         patient_summary block for the boundary rationale. */
      const consentFlag = await checkAiConsent(hospitalId, admission.patientId);
      if (consentFlag === false && !isDemoMode()) {
        await logAiInteraction({
          hospitalId,
          userName: session.name,
          userRole: session.role,
          feature: "discharge_draft",
          status: "consent_blocked",
          output: null,
          confidence: 0,
          consentFlag,
          thresholdAction: "blocked",
        });
        return NextResponse.json(
          {
            error: "ai_consent_required",
            detail:
              "This patient has not consented to AI-assisted processing. Obtain consent or draft manually.",
            aiConsent: false,
          },
          { status: 403 },
        );
      }
      const out = await runText(
        `Draft a discharge summary for clinician review. JSON: {"courseInHospital": str, "conditionAtDischarge": str (factual only), "dischargeMedicationsNote": str (say 'per final prescription — clinician to confirm'), "followUpPlan": str, "patientInstructions": str (simple language), "redFlags": str[]}. Do NOT invent medication names or doses.\n${JSON.stringify(dischargeBlock)}`,
        SYSTEM,
        `nx.ai.${feature}`,
      );
      const confidence = confidenceHeuristic(out);
      const gate = await enforceThreshold(hospitalId, "discharge_draft", confidence);
      await logAiInteraction({
        hospitalId,
        userName: session.name,
        userRole: session.role,
        feature: "discharge_draft",
        status: "review_required",
        output: out,
        confidence,
        consentFlag,
        thresholdAction: gate.action,
      });
      return NextResponse.json({
        draft: out,
        generated: true,
        confidence,
        aiConsent: consentFlag,
        thresholdAction: gate.action,
        humanReviewRequired: true,
        disclaimer:
          "AI DRAFT — must be reviewed, edited and signed by the treating clinician before entering the official record.",
        at: new Date(),
      });
    }

    if (feature === "ops_recommend") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const [beds, admissions, tasks, equipment, incidents] = await Promise.all([
        db.hospitalBed.findMany({ where: { hospitalId } }),
        db.hospitalAdmission.count({ where: { hospitalId, dischargeStatus: "active" } }),
        db.nxTask.findMany({
          where: { hospitalId, status: { in: ["open", "in_progress", "blocked"] } },
        }),
        db.nxEquipment.findMany({
          where: { hospitalId, status: { in: ["fault", "maintenance"] } },
        }),
        db.nxIncident.count({
          where: { hospitalId, status: { in: ["open", "acknowledged", "investigating"] } },
        }),
      ]);
      const byStatus = beds.reduce<Record<string, number>>((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {});
      const overdue = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date()).length;
      const compact = {
        beds: byStatus,
        admittedNow: admissions,
        tasks: {
          open: tasks.length,
          overdue,
          critical: tasks.filter((t) => t.priority === "critical").length,
        },
        equipmentDown: equipment.length,
        openIncidents: incidents,
      };
      const out = await runText(
        `Act as a hospital operations analyst. From this snapshot, produce coordination recommendations (operational only — no clinical advice). JSON: {"headline": str, "actions": [{"area": str, "recommendation": str, "why": str}], "watchlist": str[]}.\n${JSON.stringify(compact)}`,
        SYSTEM,
        `nx.ai.${feature}`,
      );
      const confidence = confidenceHeuristic(out);
      const gate = await enforceThreshold(hospitalId, "ops_recommend", confidence);
      await logAiInteraction({
        hospitalId,
        userName: session.name,
        userRole: session.role,
        feature: "ops_recommend",
        status: gate.action === "blocked" ? "review_required" : "completed",
        output: out,
        confidence,
        consentFlag: null,
        thresholdAction: gate.action,
      });
      return NextResponse.json({
        ops: out,
        generated: true,
        confidence,
        thresholdAction: gate.action,
        humanReviewRequired: gate.requireReview,
        disclaimer: "Operational recommendations only. Humans decide and act.",
        at: new Date(),
      });
    }

    return NextResponse.json({ error: "unknown_feature" }, { status: 400 });
  } catch (err) {
    await logAiInteraction({
      hospitalId,
      userName: session.name,
      userRole: session.role,
      feature: feature || "unknown",
      status: "failed",
    });
    return NextResponse.json(
      { error: "ai_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
});
