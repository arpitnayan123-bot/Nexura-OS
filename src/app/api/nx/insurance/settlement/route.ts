import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";
import { appendEvent } from "@/lib/nx/eventlog";

/* Smart-contract-shaped insurance settlement (milestone-linked).
   The contract is an escrow state machine: milestones auto-release
   payout portions when their condition is met (here: via explicit
   met-event calls that integrations/OT system would fire). */

const TRANSITIONS: Record<string, string[]> = {
  draft: ["active"],
  active: ["milestone_met", "disputed"],
  milestone_met: ["submitted", "disputed"],
  submitted: ["settled", "disputed"],
  disputed: ["active", "submitted"],
  settled: [],
};

const BodySchema = z.object({
  contractId: z.string().min(4),
  action: z.enum(["activate", "milestone_met", "submit", "settle", "dispute", "resume"]),
  milestoneId: z.string().max(60).optional(),
  note: z.string().max(300).optional(),
});

export const GET = withRoute(
  "insurance.settlement.get",
  async (req: NextRequest, { requestId }) => {
    const g = await guard(req, "billing.view");
    if ("response" in g) return g.response;
    const hospitalId = g.session.hospitalId;
    if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
    const contracts = await db.nxInsuranceContract.findMany({
      where: { hospitalId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return ok(
      contracts.map((c) => ({
        ...c,
        milestones: JSON.parse(c.milestonesJson || "[]"),
        history: JSON.parse(c.historyJson || "[]"),
        settlementProgressPct: c.payoutTotal
          ? Math.round((c.settledAmount / c.payoutTotal) * 100)
          : 0,
      })),
      { requestId },
    );
  },
);

export const POST = withRoute(
  "insurance.settlement.act",
  async (req: NextRequest, { requestId }) => {
    const g = await guard(req, "billing.manage");
    if ("response" in g) return g.response;
    const hospitalId = g.session.hospitalId;
    if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
    const body = await parseBody(req, BodySchema);
    if ("response" in body) return body.response;
    const contract = await db.nxInsuranceContract.findFirst({
      where: { id: body.data.contractId, hospitalId },
    });
    if (!contract) return fail("not_found", 404, undefined, requestId);
    const milestones = JSON.parse(contract.milestonesJson || "[]") as {
      id: string;
      amount: number;
      met: boolean;
      metAt: Date | null;
    }[];
    const history = JSON.parse(contract.historyJson || "[]") as {
      at: string;
      state: string;
      actor: string;
      note?: string;
    }[];

    const actionToState: Record<string, string> = {
      activate: "active",
      milestone_met: "milestone_met",
      submit: "submitted",
      settle: "settled",
      dispute: "disputed",
      resume: "active",
    };
    const target = actionToState[body.data.action];
    if (!TRANSITIONS[contract.state]?.includes(target)) {
      return fail(
        "illegal_transition",
        422,
        `Cannot ${body.data.action} from state "${contract.state}". Allowed: ${TRANSITIONS[contract.state].join(", ") || "none"}.`,
        requestId,
      );
    }

    let settledAmount = contract.settledAmount;
    if (body.data.action === "milestone_met") {
      const m = milestones.find((x) => x.id === body.data.milestoneId);
      if (!m) return fail("unknown_milestone", 404, undefined, requestId);
      if (m.met) return fail("milestone_already_met", 409, undefined, requestId);
      m.met = true;
      m.metAt = new Date();
      settledAmount += m.amount;
    }
    if (body.data.action === "settle") {
      const unmet = milestones.filter((m) => !m.met);
      if (unmet.length)
        return fail(
          "milestones_unmet",
          422,
          `${unmet.length} milestone(s) unmet — smart contract will not release full payout.`,
          requestId,
        );
      settledAmount = contract.payoutTotal;
    }

    history.push({
      at: new Date().toISOString(),
      state: target,
      actor: g.session.name,
      note: body.data.note,
    });
    const updated = await db.nxInsuranceContract.update({
      where: { id: contract.id },
      data: {
        state: target,
        milestonesJson: JSON.stringify(milestones),
        historyJson: JSON.stringify(history),
        settledAmount,
      },
    });
    await appendEvent(
      hospitalId,
      "insurance_contract",
      contract.id,
      `settlement.${target}`,
      { amount: settledAmount },
      g.session.name,
    );
    await audit({
      hospitalId,
      actorName: g.session.name,
      actorRole: g.session.role,
      action: `settlement.${target}`,
      entityType: "nx_insurance_contract",
      entityId: contract.id,
      detail: { settledAmount },
    });
    return ok({ ...updated, milestones, history }, { requestId });
  },
);
