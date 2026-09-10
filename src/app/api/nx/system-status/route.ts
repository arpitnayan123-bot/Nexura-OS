import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { fail, guard, withRoute } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   SYSTEM STATUS — maintenance mode + incident banner + announcements.
   Public read (any authed user) for banners; write needs settings.manage.
   ============================================================ */

const KEYS = ["maintenance_mode", "incident_banner", "announcement"] as const;
type StatusKey = (typeof KEYS)[number];

async function readAll(hospitalId: string) {
  const rows = await db.nxSystemStatus.findMany({ where: { key: { in: [...KEYS] } } });
  const map: Record<string, { enabled: boolean; message: string | null; severity: string }> = {};
  for (const k of KEYS) {
    const row = rows.find((r) => r.key === k);
    map[k] = { enabled: row?.enabled ?? false, message: row?.message ?? null, severity: row?.severity ?? "info" };
  }
  void hospitalId;
  return map;
}

export const GET = withRoute("system.status.get", async () => {
  const hospitalId = (await db.hospital.findFirst({ select: { id: true } }))?.id ?? "none";
  const status = await readAll(hospitalId);
  // Additive self-heal diagnostics (Bug Sentinel): recent client-side error
  // aggregates so a single health probe sees frontend health too.
  const selfheal = await readClientErrors();
  return NextResponse.json({ data: { status, selfheal } });
});

async function readClientErrors() {
  try {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    const root = process.env.NX_PROJECT_ROOT || "/home/z/my-project";
    const file = path.join(root, "logs", "client-errors.jsonl");
    const text = await fs.readFile(file, "utf8").catch(() => "");
    const lines = text.trim().split("\n").filter(Boolean);
    const byMessage = new Map<string, number>();
    for (const line of lines.slice(-300)) {
      try {
        const row = JSON.parse(line) as { kind?: string; message?: string };
        const key = `${row.kind ?? "?"}: ${String(row.message ?? "").slice(0, 80)}`;
        byMessage.set(key, (byMessage.get(key) ?? 0) + 1);
      } catch {}
    }
    const top = [...byMessage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([message, count]) => ({ message, count }));
    return { total: lines.length, top };
  } catch {
    return { total: 0, top: [] };
  }
}

const SetSchema = z.object({
  key: z.enum(KEYS),
  enabled: z.boolean(),
  message: z.string().max(500).optional(),
  severity: z.enum(["info", "warning", "critical"]).optional(),
});

export const PUT = withRoute("system.status.set", async (req: NextRequest) => {
  const g = await guard(req, "settings.manage");
  if ("response" in g) return g.response;
  const parsed = SetSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);
  const d = parsed.data;
  const row = await db.nxSystemStatus.upsert({
    where: { key: d.key },
    update: { enabled: d.enabled, message: d.message, severity: d.severity, updatedBy: g.session.name },
    create: { key: d.key, enabled: d.enabled, message: d.message, severity: d.severity ?? "info", updatedBy: g.session.name },
  });
  const hospitalId = g.session.hospitalId ?? (await db.hospital.findFirst({ select: { id: true } }))?.id;
  if (hospitalId) {
    await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: "system.status.set", entityType: "nx_system_status", entityId: row.id, detail: { key: d.key, enabled: d.enabled } });
  }
  return NextResponse.json({ data: { status: row } });
});
