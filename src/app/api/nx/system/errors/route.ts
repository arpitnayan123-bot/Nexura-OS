import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { ipOf } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   CLIENT ERROR COLLECTOR — receiving end of the Bug Sentinel.

   POST /api/nx/system/errors   report a client-side error
   GET  /api/nx/system/errors   aggregate summary (counts only)

   Design rules:
   - Reporting must NEVER fail the client: every path returns ok.
   - Hard size caps + zod validation + per-IP rate limit (30/5min).
   - No PII: message/source/path/stack only, stack truncated.
   - Storage: rotated JSONL under $NX_PROJECT_ROOT/logs (bounded).
   ============================================================ */

const MAX_FILE_BYTES = 512 * 1024; // rotate past 512 KB

function logFile(): string {
  const root = process.env.NX_PROJECT_ROOT || "/home/z/my-project";
  return path.join(root, "logs", "client-errors.jsonl");
}

async function append(entry: Record<string, unknown>) {
  const file = logFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    const st = await fs.stat(file).catch(() => null);
    if (st && st.size > MAX_FILE_BYTES) {
      await fs.rename(file, `${file}.1`).catch(() => {});
    }
    await fs.appendFile(file, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // storage issues must never bubble to the client
  }
}

async function readTail(max = 500): Promise<Array<Record<string, unknown>>> {
  const file = logFile();
  const text = await fs.readFile(file, "utf8").catch(() => "");
  const lines = text.trim().split("\n").filter(Boolean);
  return lines.slice(-max).map((l) => {
    try {
      return JSON.parse(l) as Record<string, unknown>;
    } catch {
      return { raw: l.slice(0, 200) };
    }
  });
}

/* ---------- per-IP rate limit (in-memory bucket) ---------- */
const buckets = new Map<string, number[]>();
let lastSweep = 0;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, hits] of buckets) {
      const alive = hits.filter((t) => now - t < 5 * 60_000);
      if (alive.length === 0) buckets.delete(k);
      else buckets.set(k, alive);
    }
  }
  const hits = (buckets.get(ip) ?? []).filter((t) => now - t < 5 * 60_000);
  if (hits.length >= 30) return true;
  hits.push(now);
  buckets.set(ip, hits);
  return false;
}

const ReportSchema = z.object({
  kind: z.enum(["error", "unhandledrejection", "boundary", "stale-chunk"]),
  message: z.string().min(1).max(300),
  source: z.string().max(200).optional(),
  line: z.number().int().nonnegative().optional(),
  col: z.number().int().nonnegative().optional(),
  stack: z.string().max(1500).optional(),
  path: z.string().max(200).optional(),
  at: z.string().max(40).optional(),
});

export const POST = withOk(async (req: NextRequest) => {
  // Spoof-resistant caller IP: ipOf() takes the RIGHTMOST x-forwarded-for
  // entry (the one our trusted proxy appended) — keying on the first entry
  // let clients rotate fake IPs to sidestep this local throttle.
  const ip = ipOf(req);
  if (rateLimited(ip)) {
    return NextResponse.json({ data: { ok: true, throttled: true } });
  }
  const raw = await req.text().catch(() => "");
  if (raw.length > 8_192) {
    return NextResponse.json({ data: { ok: true, dropped: "too-large" } });
  }
  const parsed = ReportSchema.safeParse(safeJson(raw));
  if (!parsed.success) {
    return NextResponse.json({ data: { ok: true, dropped: "invalid" } });
  }
  await append({ ts: new Date().toISOString(), ip: hashIp(ip), ...parsed.data });
  return NextResponse.json({ data: { ok: true } });
});

export const GET = withOk(async () => {
  const rows = await readTail();
  const byMessage = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.kind ?? "?"}: ${String(r.message ?? "").slice(0, 120)}`;
    byMessage.set(key, (byMessage.get(key) ?? 0) + 1);
  }
  const top = [...byMessage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => ({ message, count }));
  return NextResponse.json({
    data: {
      total: rows.length,
      top,
      lastAt: rows.length ? rows[rows.length - 1].ts : null,
    },
  });
});

/* ---------- helpers ---------- */

function withOk(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch {
      // the collector itself must never produce a client-visible failure
      return NextResponse.json({ data: { ok: true, degraded: true } });
    }
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** one-way scramble so raw client IPs never hit the log */
function hashIp(ip: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}
