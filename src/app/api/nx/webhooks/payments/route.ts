import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const provider = process.env.PAYMENT_PROVIDER || "mock";

    if (!verifyWebhookSignature(rawBody, signature, provider)) {
      log.warn("webhooks", "payment_signature_mismatch", { provider });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    // Handle the payment.captured or payment.failed event
    const eventType = payload.event;

    if (eventType === "payment.captured" || eventType === "order.paid") {
      const entity = payload.payload.payment.entity;
      const orderId = entity.order_id;

      log.info("webhooks", "payment_captured", { orderId, amount: entity.amount });

      // The application will handle reconciling this orderId with local db records
      // e.g. CustomerPayment or OnlineOrder
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    log.error("webhooks", "payment_processing_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
