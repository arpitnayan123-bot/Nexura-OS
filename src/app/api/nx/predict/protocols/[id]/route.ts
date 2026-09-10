import { NextRequest } from "next/server";
import { z } from "zod";
import { guard, ok, parseBody, withRoute } from "@/lib/nx/api";
import { approveProtocol, rejectProtocol } from "@/modules/pi-engine/engine";

/* POST /api/nx/predict/protocols/[id] — Approve or Reject.
   Approval executes Automated Coordination: creates WorkQueue tasks
   (nurse / pharmacy / lab / doctor) and notifications. Human-in-the-
   loop: PIE never acts without this call. */

const ActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(300).optional(),
  approvedBy: z.string().max(80).optional(),
});

export const POST = withRoute(
  "pie.protocols.decide",
  async (req: NextRequest, ctx: { requestId: string } & { params: Promise<{ id: string }> }) => {
    const g = await guard(req, "tasks.manage");
    if ("response" in g) return g.response;
    const { id } = await ctx.params;
    const body = await parseBody(req, ActionSchema);
    if ("response" in body) return body.response;
    const who = body.data.approvedBy || g.session.name || g.session.staffCode || "clinician";

    if (body.data.action === "approve") {
      const res = await approveProtocol(id, who);
      return res.ok ? ok(res, { requestId: g.requestId }) : ok(res, { requestId: g.requestId, status: 409 });
    }
    const res = await rejectProtocol(id, who, body.data.reason ?? "reviewed — not indicated");
    return res.ok ? ok(res, { requestId: g.requestId }) : ok(res, { requestId: g.requestId, status: 409 });
  }
);
