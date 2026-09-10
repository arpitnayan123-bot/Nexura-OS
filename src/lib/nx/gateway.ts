import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { rateLimit } from "./api";

/* ============================================================
   NEXURA OS v5 — TENANT SANDBOX API GATEWAY
   Partner/LIS/PACS access via scoped API keys. Keys are shown
   once at creation; only sha256 hashes are stored. Per-key rate
   limits + scope allowlist + tenant-scoped data access.
   ============================================================ */

export const GATEWAY_SCOPES = [
  "patients.read",
  "observations.read",
  "encounters.read",
  "results.write", // partner pushes (e.g. LIS) — phase 2 webhook path
] as const;
export type GatewayScope = (typeof GATEWAY_SCOPES)[number];

export function hashKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  // CSPRNG — Math.random()/Date.now() are predictable and must never mint secrets.
  const rand = randomBytes(24).toString("base64url").replace(/[-_]/g, "").slice(0, 32);
  const plaintext = `nxk_live_${rand}`;
  return { plaintext, prefix: plaintext.slice(0, 12), hash: hashKey(plaintext) };
}

export interface GatewayAuth {
  keyId: string;
  tenantId: string;
  tenantCode: string;
  hospitalIds: string[];
  scopes: string[];
  rateLimitPerMin: number;
}

export async function authenticateApiKey(req: Request): Promise<
  { ok: true; auth: GatewayAuth } | { ok: false; status: number; code: string; detail: string }
> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith("nxk_")) {
    return { ok: false, status: 401, code: "missing_key", detail: "Provide Authorization: Bearer nxk_..." };
  }
  const key = await db.nxApiKey.findUnique({
    where: { keyHash: hashKey(token) },
    include: { tenant: { select: { id: true, code: true, status: true } } },
  });
  if (!key || key.revokedAt) return { ok: false, status: 401, code: "invalid_key", detail: "Unknown or revoked key." };
  if (key.tenant.status !== "active") {
    return { ok: false, status: 403, code: "tenant_inactive", detail: `Tenant is ${key.tenant.status}.` };
  }
  const rl = rateLimit(`gw:${key.id}`, key.rateLimitPerMin, 60_000);
  if (!rl.allowed) {
    return { ok: false, status: 429, code: "rate_limited", detail: `Key limit is ${key.rateLimitPerMin}/min.` };
  }
  await db.nxApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  const { hospitalIdsForTenant } = await import("./tenant");
  const hospitalIds = await hospitalIdsForTenant(key.tenantId);
  return {
    ok: true,
    auth: {
      keyId: key.id,
      tenantId: key.tenantId,
      tenantCode: key.tenant.code,
      hospitalIds,
      scopes: safeScopes(key.scopes),
      rateLimitPerMin: key.rateLimitPerMin,
    },
  };
}

function safeScopes(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function hasScope(auth: GatewayAuth, scope: GatewayScope): boolean {
  return auth.scopes.includes(scope);
}
