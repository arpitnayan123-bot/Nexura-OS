/* ============================================================
   NEXURA — AUTH MAILER (otp-delivery)
   Single delivery boundary for transactional auth email
   (password reset, email verification). Replaces the scattered
   "[DEMO EMAIL DELIVERY] console.log" TODOs.

   Transports:
   - console (default, DEMO): prints the SAME demo-delivery line
     the routes used to print — behavior unchanged, dev keeps
     working with zero config. The token deliberately bypasses
     the redacting structured logger (it must not persist to
     server.log) — console only, exactly as before.
   - smtp (production): nodemailer with SMTP_HOST/PORT/USER/
     PASS/FROM. Imported lazily so console-mode deployments pay
     zero cold-start cost for the dependency.

   Failure policy: send failures are LOGGED and returned as
   {delivered:false} — they never throw into the auth flow, and
   they never leak whether an account exists (routes decide what
   the client sees).
   ============================================================ */

import { log } from "@/lib/logger";
import { env } from "@/lib/env";

export interface AuthEmail {
  to: string;
  subject: string;
  /** Plain-text body. ALWAYS contains the one-time token/link — in console
   *  transport this string goes to stdout only, never to the structured log. */
  text: string;
}

export interface SendResult {
  delivered: boolean;
  transport: "console" | "smtp";
  error?: string;
}

/** SMTP env, read per call (never cached across boots/tests). */
function smtpConfig(): {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
} | null {
  const v = env().values;
  if (v.EMAIL_TRANSPORT !== "smtp" || !v.SMTP_CONFIGURED) return null;
  const port = Number(process.env.SMTP_PORT);
  return {
    host: process.env.SMTP_HOST as string,
    port: Number.isFinite(port) ? port : 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM as string,
  };
}

/** Console transport — the demo delivery channel (identical format to the old inline prints). */
function sendViaConsole(email: AuthEmail): SendResult {
  console.log(`[DEMO EMAIL DELIVERY] ${email.subject} for ${email.to}: ${email.text}`);
  return { delivered: true, transport: "console" };
}

export async function sendAuthEmail(email: AuthEmail): Promise<SendResult> {
  const cfg = smtpConfig();
  if (!cfg) return sendViaConsole(email);

  try {
    // lazy import — console-mode deployments never load nodemailer
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 20000,
    });

    await transporter.sendMail({
      from: cfg.from,
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
    log.info("auth", "email.sent", { to: email.to, subject: email.subject, transport: "smtp" });
    return { delivered: true, transport: "smtp" };
  } catch (e) {
    // never throw into the auth flow; never leak account existence upward
    const msg = e instanceof Error ? e.message : String(e);
    log.error("auth", "email.send_failed", { to: email.to, transport: "smtp", err: msg });
    return { delivered: false, transport: "smtp", error: msg };
  }
}
