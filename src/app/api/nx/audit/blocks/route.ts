import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, fail, withRoute } from "@/lib/nx/api";
import { anchorAuditBlock, merkleRoot, leafHash } from "@/lib/nx/merkle";
import { createHash } from "crypto";
import { audit } from "@/lib/nx/audit";

/* Blockchain-linked audit trail PoC.
   GET    → blocks + chain verification result
   POST   → seal all unanchored audit events into the next timestamp block */

export const GET = withRoute("audit.blocks.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "audit.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const blocks = await db.nxTimestampBlock.findMany({ where: { hospitalId }, orderBy: { index: "asc" } });
  let chainValid = true;
  let prev: string | null = null;
  for (const b of blocks) {
    if (b.prevHash !== prev) { chainValid = false; break; }
    if (createHash("sha256").update(`${b.index}|${b.prevHash ?? ""}|${b.merkleRoot}`).digest("hex") !== b.blockHash) { chainValid = false; break; }
    prev = b.blockHash;
  }
  const unanchored = await lastBlockUnanchoredCount(hospitalId, blocks);
  return ok({ blocks, chainValid, unanchoredEvents: unanchored, verifierNote: "Share merkleRoot with any third-party auditor — they can verify event inclusion without seeing PHI." }, { requestId });
});

async function lastBlockUnanchoredCount(hospitalId: string, blocks: { anchoredAt: Date }[]): Promise<number> {
  const last = blocks[blocks.length - 1];
  const since = last?.anchoredAt ?? new Date(0);
  return db.nxAuditEvent.count({ where: { hospitalId, createdAt: { gt: since } } });
}

export const POST = withRoute("audit.blocks.anchor", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "audit.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const result = await anchorAuditBlock(hospitalId, {
    nxAuditEvent: { findMany: (a: object) => db.nxAuditEvent.findMany(a) },
    nxTimestampBlock: {
      findFirst: (a: object) => db.nxTimestampBlock.findFirst(a),
      create: (d: { data: object }) => db.nxTimestampBlock.create(d as never),
      count: (a: object) => db.nxTimestampBlock.count(a),
    },
  });
  if (result.anchored > 0) {
    await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: "audit.block.anchored", entityType: "nx_timestamp_block", detail: { index: result.index, leaves: result.anchored, root: result.merkleRoot } });
  }
  return ok(result, { requestId });
});

// keep pure fns referenced for tests
export const _internal = { merkleRoot, leafHash };
