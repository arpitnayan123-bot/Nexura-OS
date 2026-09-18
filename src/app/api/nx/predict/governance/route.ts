import { NextRequest } from "next/server";
import { guard, ok, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { SAMD_REGISTRY } from "@/modules/pi-engine/governance/drift";

/* GET /api/nx/predict/governance — the safety, ethics & governance
   surface: SaMD model registry, recent bias audits (four-fifths
   rule), drift status. Powers the Trust Center view of PIE. */
export const GET = withRoute("pie.governance", async (req: NextRequest) => {
  const g = await guard(req, "audit.view");
  if ("response" in g) return g.response;
  const [audits, registry] = await Promise.all([
    db.pieBiasAudit.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.pieModelRegistry.findMany({ orderBy: { registeredAt: "desc" }, take: 20 }),
  ]);
  return ok(
    {
      samdRegistry: registry.length ? registry : SAMD_REGISTRY,
      biasAudits: audits,
      failSafes: {
        confidenceFloor: 0.8,
        behavior:
          "Protocols auto-generate only at confidence ≥ 80% and red band; otherwise flagged 'Uncertain — Manual Review Required'.",
        humanInLoop: "Every protocol requires clinician approval before any task is created.",
      },
    },
    { requestId: g.requestId },
  );
});
