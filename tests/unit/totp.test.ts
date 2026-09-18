import { describe, it, expect } from "vitest";
import {
  generateTotpSecret,
  totpAt,
  verifyTotp,
  base32Decode,
  base32Encode,
  otpauthUrl,
} from "@/lib/nx/totp";

/* RFC-6238 TOTP — MFA architecture core. */

describe("base32", () => {
  it("round-trips", () => {
    const buf = Buffer.from("hello nexura totp world!");
    const enc = base32Encode(buf);
    expect(base32Decode(enc).toString()).toBe(buf.toString());
  });

  it("uses the standard RFC 4648 alphabet", () => {
    expect(base32Encode(Buffer.from("f"))).toBe("MY======".replace(/=/g, ""));
  });
});

describe("totp", () => {
  it("generates 6-digit codes", () => {
    const secret = generateTotpSecret();
    const code = totpAt(secret, 1700000000);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("is deterministic per step and changes across steps", () => {
    const secret = generateTotpSecret();
    expect(totpAt(secret, 1700000000)).toBe(totpAt(secret, 1700000000));
    expect(totpAt(secret, 1700000000)).not.toBe(totpAt(secret, 1700000030));
  });

  it("verifies the current code and tolerates ±1 step drift", () => {
    const secret = generateTotpSecret();
    const now = Math.floor(Date.now() / 1000);
    expect(verifyTotp(secret, totpAt(secret, now))).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now - 30))).toBe(true); // previous step
    expect(verifyTotp(secret, totpAt(secret, now + 30))).toBe(true); // next step
    expect(verifyTotp(secret, totpAt(secret, now - 90))).toBe(false); // too far
  });

  it("rejects malformed input", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, "abc")).toBe(false);
    expect(verifyTotp(secret, "12345")).toBe(false);
    expect(verifyTotp("", "123456")).toBe(false);
  });

  it("different secrets produce different codes", () => {
    const t = 1700000000;
    expect(totpAt(generateTotpSecret(), t)).not.toBe(totpAt(generateTotpSecret(), t));
  });

  it("otpauth URL is authenticator-compatible", () => {
    const url = otpauthUrl("ABC234DEF", "nurse@demo.nexura.health", "Nexura Hospital OS");
    expect(url).toContain("otpauth://totp/");
    expect(url).toContain("secret=ABC234DEF");
    expect(url).toContain("issuer=Nexura+Hospital+OS");
    expect(url).toContain("digits=6");
  });
});
