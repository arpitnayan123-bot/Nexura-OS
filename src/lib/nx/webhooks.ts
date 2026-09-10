import { createHmac, randomUUID } from "crypto";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

/* ============================================================
   NEXURA OS v5 — WEBHOOK SYSTEM (LIS/PACS/HIS interoperability)
   Outbound: signed dispatch (X-Nexura-Signature: sha256=HMAC(secret, body)),
   3 attempts with exponential backoff, delivery records for the admin UI.
   Inbound: HMAC-verified structured pushes from lab/imaging partners.
   Fire-and-forget: dispatch() never blocks the calling request.
   ============================================================ */

export const WEBHOOK_EVENTS = [
  "result.reported",
  "result.critical",
  "admission.created",
  "discharge.confirmed",
  "appointment.created",
  "order.created",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function signPayload(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

interface EndpointLike {
  id: string;
  url: string;
  secret: string;
  events: string;
  failureCount: number;
}

function parseEvents(e: string): string[] {
  try {
    const v = JSON.parse(e);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Dispatch an event to all matching active endpoints. Non-blocking. */
export function dispatchWebhooks(hospitalId: string, event: WebhookEvent, payload: Record<string, unknown>): void {
  void (async () => {
    try {
      const endpoints = (await db.nxWebhookEndpoint.findMany({
        where: { hospitalId, active: true },
      })) as unknown as EndpointLike[];
      const targets = endpoints.filter((e) => parseEvents(e.events).includes(event) || parseEvents(e.events).includes("*"));
      await Promise.all(targets.map((t) => deliver(t, event, payload, 1)));
    } catch (err) {
      log.error("webhooks", "dispatch", { err: err instanceof Error ? err.message : String(err) });
    }
  })();
}

async function deliver(endpoint: EndpointLike, event: string, payload: Record<string, unknown>, attempt: number): Promise<void> {
  const body = JSON.stringify({
    event,
    deliveredAt: new Date().toISOString(),
    deliveryId: randomUUID(),
    data: payload,
  });
  const started = Date.now();
  let status = 0;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nexura-event": event,
        "x-nexura-signature": signPayload(endpoint.secret, body),
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    status = res.status;
  } catch {
    status = 0;
  }
  await db.nxWebhookDelivery.create({
    data: {
      endpointId: endpoint.id,
      hospitalId: (endpoint as unknown as { hospitalId: string }).hospitalId,
      event,
      targetUrl: endpoint.url,
      payload: body.slice(0, 8_000),
      status: status >= 200 && status < 300 ? "delivered" : "failed",
      attempts: attempt,
      responseCode: status || null,
      latencyMs: Date.now() - started,
      lastAttemptAt: new Date(),
    },
  }).catch(() => {});

  if (status >= 200 && status < 300) {
    if (endpoint.failureCount) {
      await db.nxWebhookEndpoint.update({ where: { id: endpoint.id }, data: { failureCount: 0, lastSuccessAt: new Date() } }).catch(() => {});
    }
    return;
  }
  await db.nxWebhookEndpoint.update({ where: { id: endpoint.id }, data: { failureCount: { increment: 1 } } }).catch(() => {});
  if (attempt < 3) {
    const backoff = attempt === 1 ? 5_000 : 30_000;
    setTimeout(() => void deliver(endpoint, event, payload, attempt + 1), backoff);
  }
}

/** Verify an inbound webhook signature. */
export function verifyInbound(secret: string, rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = signPayload(secret, rawBody);
  if (expected.length !== signature.length) return false;
  return createHmac("sha256", secret).update(rawBody).digest("hex") === signature.replace("sha256=", "");
}
