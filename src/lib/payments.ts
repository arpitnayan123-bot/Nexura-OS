import { log } from "@/lib/logger";
import { db } from "@/lib/db";
import { createHmac } from "crypto";

export interface PaymentIntent {
  id: string;
  amountPaise: number;
  currency: string;
  status: "created" | "captured" | "failed";
  provider: "razorpay" | "stripe" | "mock";
  clientSecret: string | null;
}

/** Payment provider configuration. */
function paymentConfig() {
  const provider = process.env.PAYMENT_PROVIDER || "mock";
  const apiKey = process.env.PAYMENT_API_KEY;
  const secretKey = process.env.PAYMENT_SECRET_KEY;

  if (provider === "mock") return { provider: "mock" };
  if (apiKey && secretKey) return { provider, apiKey, secretKey };

  return null;
}

/** Creates a payment intent to capture money. */
export async function createPaymentIntent(
  amountPaise: number,
  receiptId: string,
  notes: Record<string, string> = {},
): Promise<PaymentIntent> {
  const cfg = paymentConfig();

  if (!cfg || cfg.provider === "mock") {
    log.info("payments", "intent_created", { provider: "mock", amountPaise, receiptId });
    return {
      id: `mock_pi_${Date.now()}`,
      amountPaise,
      currency: "INR",
      status: "created",
      provider: "mock",
      clientSecret: "mock_secret",
    };
  }

  // Implementation for real providers like Razorpay
  if (cfg.provider === "razorpay") {
    try {
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " + Buffer.from(`${cfg.apiKey}:${cfg.secretKey}`).toString("base64"),
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: receiptId,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();

      return {
        id: data.id,
        amountPaise: data.amount,
        currency: data.currency,
        status: data.status === "created" ? "created" : "failed",
        provider: "razorpay",
        clientSecret: null,
      };
    } catch (err) {
      log.error("payments", "intent_creation_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw new Error("Payment intent creation failed");
    }
  }

  throw new Error("Unsupported payment provider");
}

/** Validates a payment webhook signature. */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  provider: string,
): boolean {
  if (provider === "mock") return true;

  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  if (provider === "razorpay") {
    const expected = createHmac("sha256", webhookSecret).update(payload).digest("hex");
    return expected === signature;
  }

  return false;
}
