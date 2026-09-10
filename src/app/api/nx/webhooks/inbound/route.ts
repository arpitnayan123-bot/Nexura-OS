import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, withRoute, ipOf } from "@/lib/nx/api";
import { verifyInbound } from "@/lib/nx/webhooks";
import { publish } from "@/lib/nx/bus";
import { rateLimit } from "@/lib/nx/api";

/* Inbound webhook receiver for LIS/PACS/HIS partners.
   Auth: X-Nexura-Signature: sha256=HMAC(sharedSecret, rawBody)
   Body: { event: "result.reported", uhid, results: [{testName, value, unit?, flag}] }
   Pushes land as pending-verification LabResults — a human still validates,
   which keeps the automation engine's determinism guarantee intact. */

const BodySchema = z.object({
  event: z.string().max(60),
  uhid: z.string().min(2).max(40),
  results: z.array(z.object({
    testName: z.string().min(1).max(120),
    value: z.string().min(1).max(200),
    unit: z.string().max(30).optional(),
    flag: z.enum(["normal", "low", "high", "critical"]).default("normal"),
  })).min(1).max(20),
});

export const POST = withRoute("webhooks.inbound", async (req: NextRequest, { requestId }) => {
  const rl = rateLimit(`whin:${ipOf(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("rate_limited", 429, undefined, requestId);
  const secret = process.env.NX_INBOUND_WEBHOOK_SECRET;
  if (!secret) return fail("inbound_disabled", 503, "Set NX_INBOUND_WEBHOOK_SECRET to enable partner pushes.", requestId);
  const raw = await req.text();
  if (!verifyInbound(secret, raw, req.headers.get("x-nexura-signature"))) {
    return fail("invalid_signature", 401, "Signature mismatch.", requestId);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail("invalid_json", 400, undefined, requestId);
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues.map((i) => i.message).join("; "), requestId);
  const d = parsed.data;

  const patient = await db.hospitalPatient.findUnique({ where: { uhid: d.uhid } });
  if (!patient) return fail("unknown_uhid", 422, `No patient with UHID ${d.uhid}.`, requestId);
  const hospitalId = patient.hospitalId;

  const created: string[] = [];
  for (const r of d.results) {
    let order = await db.hospitalOrder.findFirst({
      where: { patientId: patient.id, orderType: "lab", status: { in: ["ordered", "acknowledged", "in_progress"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!order) {
      order = await db.hospitalOrder.create({
        data: {
          hospitalId, patientUhid: patient.uhid, patientId: patient.id, orderType: "lab",
          orderDetails: JSON.stringify({ items: [{ test: r.testName, source: "partner-webhook" }] }),
        },
      });
    }
    const lr = await db.labResult.create({
      data: {
        orderId: order.id, testName: r.testName, resultValue: r.value, unit: r.unit,
        abnormalFlag: r.flag, reportedAt: new Date(), verificationStatus: "pending",
      },
    });
    created.push(lr.id);
  }
  publish({ event: "webhook.ingested", hospitalId, data: { uhid: d.uhid, results: created.length, source: "partner" } });
  await db.nxIntegrationEvent.create({
    data: { hospitalId, source: "webhook", event: d.event, payload: JSON.stringify({ uhid: d.uhid, count: created.length }).slice(0, 4000) },
  }).catch(() => {});
  return ok({ accepted: true, resultsCreated: created.length }, { requestId, status: 202 });
});

// keep createHmac import referenced for signature tooling extensions
