import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, fail, withRoute } from "@/lib/nx/api";
import { parseSteps } from "@/lib/nx/pathway";

/* Automation explainability: WHY a rule fired, what it did, what alternatives
   existed, and whether it ran in self-driving mode or awaited a checkpoint. */

export const GET = withRoute("automations.explain", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "tasks.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const ruleId = req.nextUrl.searchParams.get("ruleId");
  const rules = await db.nxAutomationRule.findMany({
    where: { hospitalId, ...(ruleId ? { id: ruleId } : {}) },
    orderBy: { lastRunAt: "desc" },
    take: ruleId ? 1 : 20,
  });
  const explanations: Record<string, unknown>[] = [];
  for (const rule of rules) {
    const runs = await db.nxWorkflowRun.findMany({
      where: { ruleId: rule.id },
      orderBy: { startedAt: "desc" },
      take: 5,
    });
    explanations.push({
      rule: {
        id: rule.id, name: rule.name, trigger: rule.triggerType,
        enabled: rule.enabled, lastRunAt: rule.lastRunAt, runCount: rule.runCount,
        actions: rule.actions ? JSON.parse(rule.actions) : null,
        conditions: rule.conditions ? JSON.parse(rule.conditions) : null,
      },
      why: {
        triggerDescription: describeTrigger(rule.triggerType),
        deterministic: true,
        note: "Execution is deterministic server-side code — never an AI decision. Conditions are evaluated exactly as written in the rule builder.",
      },
      alternatives: describeAlternatives(rule.triggerType),
      checkpoints: {
        mode: rule.enabled ? "self_driving_with_audit" : "disabled",
        humanOverride: "Every created task/incident/message can be cancelled or re-assigned by a human; all runs are audited.",
      },
      recentRuns: runs.map((r) => ({
        id: r.id, status: r.status, startedAt: r.startedAt,
        patient: r.patientUhid, steps: r.steps ? JSON.parse(r.steps) : [],
      })),
    });
  }
  return ok({ explanations }, { requestId });
});

function describeTrigger(t: string): string {
  const map: Record<string, string> = {
    "result.critical": "A lab result was validated with flag=critical — immediate clinical attention SLA applies.",
    "discharge.confirmed": "An encounter was confirmed discharged — downstream bed/transport/billing coordination starts.",
    "bed.ready": "Housekeeping marked a bed ready — admission waitlist can advance.",
    "order.created": "A new order entered the system — logistics/prep tasks are generated per order type.",
    "appointment.created": "A new appointment was booked — reminder + pre-registration tasks are queued.",
  };
  return map[t] ?? `Trigger "${t}" fired.`;
}

function describeAlternatives(t: string): string[] {
  const map: Record<string, string[]> = {
    "result.critical": ["Notify only the ordering doctor (less coverage)", "Page the on-call consultant directly (needs paging integration)", "Queue for morning review (NOT allowed for criticals — policy)"],
    "discharge.confirmed": ["Hold bed allocation until housekeeping confirms", "Auto-generate the discharge bill immediately (finance preference)"],
    "bed.ready": ["Wait for manual allocation by charge nurse", "Auto-assign next waitlisted patient with matching requirements"],
    "order.created": ["Batch transport tasks hourly", "Skip prep tasks for point-of-care orders"],
    "appointment.created": ["Send reminders 24h vs 1h before", "Skip pre-registration for follow-up visits"],
  };
  return map[t] ?? ["Adjust rule conditions in the Automation Builder"];
}
