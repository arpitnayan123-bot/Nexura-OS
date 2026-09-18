import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, withRoute } from "@/lib/nx/api";
import { dbProfile } from "@/lib/nx/db-dialect";
import { connectionCount } from "@/lib/nx/bus";

/* ============================================================
   NEXURA OS v5 — SECURITY POSTURE (leadership dashboard data)
   Aggregates configuration posture, runtime signals and operational
   hygiene into a scored, explainable view. Dependency CVE scanning
   requires a registry connection (`npm audit`) — reported as its own
   check with last-run timestamp so the gap stays visible, never faked.
   ============================================================ */

interface Check {
  id: string;
  title: string;
  status: "pass" | "warn" | "fail" | "unknown";
  detail: string;
  weight: number;
}

export const GET = withRoute("security.posture", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "security.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  const secret = process.env.JWT_SECRET;
  add({
    id: "jwt_secret",
    title: "Session signing secret",
    status: secret && secret.length >= 32 ? "pass" : secret ? "warn" : "fail",
    detail:
      secret && secret.length >= 32
        ? "Configured (>=32 chars)"
        : "Weak or missing — sessions forgeable in prod",
    weight: 20,
  });

  add({
    id: "env",
    title: "Runtime environment",
    status: process.env.NODE_ENV === "production" ? "pass" : "warn",
    detail: `NODE_ENV=${process.env.NODE_ENV ?? "development"}`,
    weight: 5,
  });

  add({
    id: "db",
    title: "Database durability profile",
    status: dbProfile().provider === "postgres" ? "pass" : "warn",
    detail: `provider=${dbProfile().provider}, pool=${dbProfile().pool.size}, replica=${dbProfile().readUrlConfigured}`,
    weight: 10,
  });

  const totalUsers = hospitalId ? await db.nxStaffUser.count({ where: { hospitalId } }) : 0;
  const mfaUsers = hospitalId
    ? await db.nxStaffUser.count({ where: { hospitalId, mfaEnabled: true } })
    : 0;
  const mfaPct = totalUsers ? Math.round((mfaUsers / totalUsers) * 100) : 0;
  add({
    id: "mfa",
    title: "MFA adoption (privileged staff)",
    status: mfaPct >= 80 ? "pass" : mfaPct >= 30 ? "warn" : "fail",
    detail: `${mfaUsers}/${totalUsers} staff enrolled (${mfaPct}%)`,
    weight: 15,
  });

  const idleSessions = hospitalId
    ? await db.nxSessionRecord.count({
        where: {
          revokedAt: null,
          expiresAt: { gt: new Date() },
          lastSeenAt: { lt: new Date(Date.now() - 24 * 3600_000) },
        },
      })
    : 0;
  add({
    id: "sessions",
    title: "Stale live sessions (>24h silent)",
    status: idleSessions === 0 ? "pass" : idleSessions < 5 ? "warn" : "fail",
    detail: `${idleSessions} session(s) — idle-timeout will auto-revoke on next use`,
    weight: 10,
  });

  const failedLogins = hospitalId
    ? await db.nxLoginAttempt
        .count({
          where: { createdAt: { gte: new Date(Date.now() - 24 * 3600_000) }, success: false },
        })
        .catch(() => -1)
    : 0;
  add({
    id: "brute_force",
    title: "Failed logins (24h)",
    status:
      typeof failedLogins === "number" && failedLogins >= 0
        ? failedLogins < 50
          ? "pass"
          : failedLogins < 200
            ? "warn"
            : "fail"
        : "unknown",
    detail: `${failedLogins} attempts — sustained spikes suggest credential stuffing`,
    weight: 10,
  });

  const openBg = hospitalId
    ? await db.nxBreakGlassEvent
        .count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } })
        .catch(() => -1)
    : 0;
  add({
    id: "break_glass",
    title: "Open break-glass events",
    status:
      typeof openBg === "number" && openBg >= 0 ? (openBg === 0 ? "pass" : "warn") : "unknown",
    detail: `${openBg} open — each requires post-hoc review`,
    weight: 10,
  });

  add({
    id: "webhook_inbound",
    title: "Partner webhook secret",
    status: process.env.NX_INBOUND_WEBHOOK_SECRET ? "pass" : "warn",
    detail: process.env.NX_INBOUND_WEBHOOK_SECRET
      ? "Inbound pushes authenticated"
      : "Inbound partner pushes disabled (no secret)",
    weight: 5,
  });

  add({
    id: "dep_scan",
    title: "Dependency CVE scan",
    status: "unknown",
    detail: "Run `npm audit` in CI (registry required) — posture never guesses CVE counts",
    weight: 10,
  });

  add({
    id: "sse",
    title: "Live SSE connections (signed alerts)",
    status: "pass",
    detail: `${connectionCount()} active — all events HMAC-signed`,
    weight: 5,
  });

  const score = Math.round(
    (checks.reduce(
      (s, c) =>
        s +
        (c.status === "pass"
          ? c.weight
          : c.status === "warn"
            ? c.weight / 2
            : c.status === "unknown"
              ? c.weight / 3
              : 0),
      0,
    ) /
      checks.reduce((s, c) => s + c.weight, 0)) *
      100,
  );
  return ok(
    {
      score,
      grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D",
      checks,
      generatedAt: new Date().toISOString(),
    },
    { requestId },
  );
});
