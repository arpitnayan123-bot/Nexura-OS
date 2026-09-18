import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireHospitalContext, withRoute } from "@/lib/nx/api";
import { requireModule, permsForSession, hasPermission } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";
import { fire, type NxTrigger } from "@/lib/nx/automations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRIGGERS: NxTrigger[] = [
  "result.critical",
  "discharge.confirmed",
  "bed.ready",
  "order.created",
  "appointment.created",
];

/** GET — automation rules + recent runs (workflow builder data). */
export const GET = withRoute("nx.automations.list", async (req: NextRequest) => {
  const gate = await requireModule(req, "automations");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;

  const [rules, runs] = await Promise.all([
    db.nxAutomationRule.findMany({ where: { hospitalId }, orderBy: { createdAt: "asc" } }),
    db.nxWorkflowRun.findMany({ where: { hospitalId }, orderBy: { startedAt: "desc" }, take: 25 }),
  ]);

  return NextResponse.json({
    rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      trigger: r.triggerType,
      actions: (() => {
        try {
          return JSON.parse(r.actions) as string[];
        } catch {
          return [];
        }
      })(),
      enabled: r.enabled,
      requiresApproval: r.requiresApproval,
      lastRunAt: r.lastRunAt,
      runCount: r.runCount,
    })),
    runs: runs.map((r) => ({
      id: r.id,
      ruleName: r.ruleName,
      patientId: r.patientId,
      patientUhid: r.patientUhid,
      status: r.status,
      currentStep: r.currentStep,
      steps: (() => {
        try {
          return JSON.parse(r.steps) as Array<{
            name: string;
            status: string;
            detail: string;
            at: string;
          }>;
        } catch {
          return [];
        }
      })(),
      startedAt: r.startedAt,
      completedAt: r.completedAt,
    })),
    stats: {
      activeRules: rules.filter((r) => r.enabled).length,
      totalRuns: rules.reduce((s, r) => s + r.runCount, 0),
      runs24h: await db.nxWorkflowRun.count({
        where: { hospitalId, startedAt: { gte: new Date(Date.now() - 86400000) } },
      }),
    },
  });
});

/** PATCH — enable/disable a rule (settings-manage permission, deterministic policy). */
export const PATCH = withRoute("nx.automations.toggle", async (req: NextRequest) => {
  const gate = await requireModule(req, "automations");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!gate.session.hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 400 });
  // Governed by RBAC-as-data (settings.manage) instead of a hardcoded role list,
  // so hospital_admin keeps access that a legacy role list accidentally dropped.
  const perms = await permsForSession(gate.session);
  if (!hasPermission(perms, "settings.manage")) {
    return NextResponse.json(
      { error: "admin_only", detail: "Toggling automation rules requires administrator approval" },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => ({}));
  // Tenant-scoped: rules from other hospitals are unreachable.
  const rule = await db.nxAutomationRule.findFirst({
    where: { id: body.id, hospitalId: gate.session.hospitalId },
  });
  if (!rule) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await db.nxAutomationRule.update({
    where: { id: rule.id },
    data: { enabled: Boolean(body.enabled) },
  });
  await audit({
    hospitalId: rule.hospitalId,
    actorName: gate.session.name,
    actorRole: gate.session.role,
    action: `automation.${updated.enabled ? "enable" : "disable"}`,
    entityType: "NxAutomationRule",
    entityId: rule.id,
    detail: { rule: rule.name },
  });
  return NextResponse.json({ rule: { id: updated.id, enabled: updated.enabled } });
});

/** POST — test-fire a rule trigger (admin only, creates real coordination artifacts). */
export const POST = withRoute("nx.automations.testfire", async (req: NextRequest) => {
  const gate = await requireModule(req, "automations");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!["admin", "command"].includes(gate.session.role)) {
    return NextResponse.json(
      { error: "admin_only", detail: "Test execution requires elevated role" },
      { status: 403 },
    );
  }
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;
  const body = await req.json().catch(() => ({}));
  const trigger = TRIGGERS.includes(body.trigger as NxTrigger) ? (body.trigger as NxTrigger) : null;
  if (!trigger) return NextResponse.json({ error: "unknown_trigger" }, { status: 400 });

  let patient: { id: string; fullName: string; uhid: string } | null = null;
  if (body.patientId) {
    const p = await db.hospitalPatient.findFirst({ where: { id: body.patientId, hospitalId } });
    if (p) patient = { id: p.id, fullName: p.fullName, uhid: p.uhid };
  }

  await fire(trigger, {
    hospitalId: hospitalId!,
    actorName: gate.session.name,
    actorRole: gate.session.role,
    patientId: patient?.id,
    patientName: patient?.fullName,
    patientUhid: patient?.uhid,
    detail: body.detail || { testRun: true, testName: "Demo critical result (test fire)" },
  });
  return NextResponse.json({ ok: true, trigger });
});
