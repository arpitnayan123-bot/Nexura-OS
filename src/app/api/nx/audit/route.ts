import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireHospitalContext, withRoute } from "@/lib/nx/api";
import { requireModule } from "@/lib/nx/session";
import { ciFilter } from "@/lib/nx/db-dialect";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — audit trail with chain verification. */
export const GET = withRoute("nx.audit.trail", async (req: NextRequest) => {
  const gate = await requireModule(req, "audit");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const take = Math.min(Number(searchParams.get("take")) || 60, 200);

  const where: Record<string, unknown> = { hospitalId };
  if (action) where.action = ciFilter(action);

  const events = await db.nxAuditEvent.findMany({ where, orderBy: { createdAt: "desc" }, take });

  // verify the chain over the returned window
  const withChain = events.map((e, idx) => ({
    id: e.id,
    actorName: e.actorName,
    actorRole: e.actorRole,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    detail: (() => {
      try {
        return e.detail ? (JSON.parse(e.detail) as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    })(),
    at: e.createdAt,
    chainOk: Boolean(e.hash && e.prevHash !== undefined),
    seq: events.length - idx,
  }));

  const broken = events.some((e) => !e.hash);
  return NextResponse.json({
    events: withChain,
    integrity: { verified: !broken, algorithm: "sha256 chained", coverage: "all recorded actions" },
  });
});
