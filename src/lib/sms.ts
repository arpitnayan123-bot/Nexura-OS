import { log } from "@/lib/logger";
import { env } from "@/lib/env";

export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsSendResult {
  delivered: boolean;
  transport: "console" | "twilio" | "mock";
  error?: string;
}

/** Twilio configuration, read lazily. */
function twilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (accountSid && authToken && fromNumber) {
    return { accountSid, authToken, fromNumber };
  }
  return null;
}

/**
 * Delivers SMS using Twilio if configured, falling back to console
 * delivery in DEMO_MODE, or failing gracefully.
 */
export async function sendSms(message: SmsMessage): Promise<SmsSendResult> {
  const cfg = twilioConfig();

  if (!cfg) {
    if (env().values.DEMO_MODE || process.env.EMAIL_TRANSPORT === "console") {
      console.log(`[DEMO SMS DELIVERY] To: ${message.to} | Body: ${message.body}`);
      return { delivered: true, transport: "console" };
    }

    // In production with no config, fail gracefully
    log.error("sms", "send_failed", { error: "No SMS provider configured", to: message.to });
    return { delivered: false, transport: "mock", error: "Configuration missing" };
  }

  try {
    // We would use twilio SDK here, but using fetch to avoid heavy dependencies unless requested
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64"),
        },
        body: new URLSearchParams({
          To: message.to,
          From: cfg.fromNumber,
          Body: message.body,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown Twilio error");
      log.error("sms", "send_failed", {
        status: response.status,
        body: errText,
        transport: "twilio",
      });
      return { delivered: false, transport: "twilio", error: errText };
    }

    log.info("sms", "sent", { to: message.to, transport: "twilio" });
    return { delivered: true, transport: "twilio" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error("sms", "send_failed", { err: msg, transport: "twilio" });
    return { delivered: false, transport: "twilio", error: msg };
  }
}
