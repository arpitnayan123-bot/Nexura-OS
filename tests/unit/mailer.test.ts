import { describe, it, expect, afterAll } from "vitest";
import { sendAuthEmail } from "@/lib/mailer";
import { db } from "@/lib/db";

/* Auth mailer boundary:
 *  - console transport (the default/demo path) delivers synchronously and
 *    labels itself "console";
 *  - the send NEVER throws — failures come back as {delivered:false} so the
 *    auth flow cannot leak account existence through an error. */

afterAll(async () => {
  await db.$disconnect().catch(() => {});
});

describe("sendAuthEmail (console transport — default env)", () => {
  it("delivers via console without throwing", async () => {
    const result = await sendAuthEmail({
      to: "reset-test@example.com",
      subject: "password reset token",
      text: "token abc123",
    });
    // this environment has no SMTP configured → console transport
    expect(result.transport).toBe("console");
    expect(result.delivered).toBe(true);
  });

  it("keeps the token string out of the returned metadata", async () => {
    const secret = `super-secret-token-${Date.now()}`;
    const result = await sendAuthEmail({
      to: "reset-test@example.com",
      subject: "email verification token",
      text: secret,
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
