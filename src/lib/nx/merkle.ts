import { createHash } from "crypto";
import { db } from "@/lib/db";

/* ============================================================
   NEXURA OS v5 — MERKLE BLOCK ANCHORING (blockchain-linked PoC)
   The hash-chained audit log is periodically sealed into a block:
   leaf hashes of new events → binary Merkle tree → block with
   prevHash chain. External verifiers only need the Merkle root —
   no PHI ever leaves the premises. Production: anchor roots into
   any public ledger / notary service via the same envelope.
   ============================================================ */

export function merkleRoot(leafHashes: string[]): string {
  if (leafHashes.length === 0) return "";
  let level = leafHashes.slice();
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = level[i + 1] ?? a; // odd leaf duplicates itself
      next.push(createHash("sha256").update(a + b).digest("hex"));
    }
    level = next;
  }
  return level[0];
}

export function leafHash(event: { hash: string; createdAt: Date }): string {
  return createHash("sha256").update(`${event.hash}|${event.createdAt.toISOString()}`).digest("hex");
}

/** Anchor all unanchored audit events for a hospital into the next block. */
export async function anchorAuditBlock(hospitalId: string): Promise<{ anchored: number; index: number; merkleRoot: string; blockHash: string }> {
  const lastBlock = await db.nxTimestampBlock.findFirst({ where: { hospitalId }, orderBy: { index: "desc" } });
  const events = await db.nxAuditEvent.findMany({
    where: { hospitalId, ...(lastBlock ? { createdAt: { gt: lastBlock.anchoredAt } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  if (!events.length) return { anchored: 0, index: lastBlock?.index ?? -1, merkleRoot: "", blockHash: "" };
  const leaves = events.map((e) => leafHash({ hash: e.hash ?? "", createdAt: e.createdAt }));
  const root = merkleRoot(leaves);
  const index = (lastBlock?.index ?? -1) + 1;
  const blockHash = createHash("sha256").update(`${index}|${lastBlock?.blockHash ?? ""}|${root}`).digest("hex");
  await db.nxTimestampBlock.create({
    data: { hospitalId, index, merkleRoot: root, leafCount: leaves.length, prevHash: lastBlock?.blockHash ?? null, blockHash },
  });
  return { anchored: leaves.length, index, merkleRoot: root, blockHash };
}
