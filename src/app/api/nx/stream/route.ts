import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionFresh, roleKeysForUser, permsForSession, hasPermission } from "@/lib/nx/session";
import { subscribe, type NxEvent } from "@/lib/nx/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   REAL-TIME STREAM (Server-Sent Events)
   Auth at subscribe time (session + hospital scope).
   - Heartbeat every 25s keeps proxies from closing the pipe.
   - `lastSyncedAt` is sent on connect; Last-Event-ID reconnects
     are detected client-side (duplicates suppressed by seq).
   - Tenant isolation: events are filtered per subscriber by the
     bus before they reach the wire.
   - Channel privacy: the subscriber's visible channel keys and
     clinical-view flag are resolved at connect time so message
     previews never reach staff without clinical access.
   ============================================================ */

export async function GET(req: NextRequest) {
  const session = await getSessionFresh(req);
  if (!session || !session.hospitalId) {
    return new Response("unauthorized", { status: 401 });
  }
  const hospitalId = session.hospitalId as string;
  const roleKeys = roleKeysForUser(session.role).map(String);

  // Channel privacy scope (best-effort at connect): channel memberships plus
  // the clinical-view flag. Membership changes apply on next reconnect.
  const [memberships, perms] = await Promise.all([
    db.nxChannelMember.findMany({
      where: { userId: session.userId, channel: { hospitalId } },
      select: { channel: { select: { key: true } } },
      take: 100,
    }).catch(() => []),
    permsForSession(session),
  ]);
  const channels = memberships.map((m) => m.channel.key);
  const clinicalAll = hasPermission(perms, "patient.clinical.view") || Boolean(session.breakGlass);

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const cleanup = () => {
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
      };
      req.signal.addEventListener("abort", cleanup);

      // Initial hello with lastSyncedAt for client-side reconciliation
      send(`event: hello\ndata: ${JSON.stringify({ hospitalId, userId: session.userId, lastSyncedAt: new Date().toISOString() })}\n\n`);

      unsubscribe = subscribe(
        `${session.userId}:${Date.now()}`,
        { userId: session.userId, role: session.role, hospitalId, roleKeys, channels, clinicalAll },
        (ev: NxEvent) => {
          send(`id: ${ev.seq}\nevent: nx\ndata: ${JSON.stringify(ev)}\n\n`);
        }
      );

      heartbeat = setInterval(() => {
        send(`: ping ${Date.now()}\n\n`);
      }, 25_000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
