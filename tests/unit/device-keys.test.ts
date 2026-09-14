import { describe, it, expect } from "vitest";
import {
  generateDeviceSecret,
  hashDeviceSecret,
  deviceSignatureFromSecret,
  verifyDeviceSignature,
} from "@/lib/nx/device-keys";

/* ============================================================
   WEARABLE DEVICE HMAC (backend-core-1)
   Protocol: server stores H=sha256(secret); device signs
   HMAC-SHA256(H, deviceId + "." + rawBody). Verification is
   keyed by the stored hash and timing-safe.
   ============================================================ */

describe("device key material", () => {
  it("round-trips: client signs from secret, server verifies from stored hash", () => {
    const secret = generateDeviceSecret();
    const storedHash = hashDeviceSecret(secret);
    const deviceId = "dev_123";
    const body = JSON.stringify({ samples: [{ metric: "heart_rate", value: 72 }] });

    const sig = deviceSignatureFromSecret(secret, deviceId, body);
    expect(verifyDeviceSignature(storedHash, deviceId, body, sig)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const secret = generateDeviceSecret();
    const storedHash = hashDeviceSecret(secret);
    const deviceId = "dev_123";
    const sig = deviceSignatureFromSecret(secret, deviceId, "original");
    expect(verifyDeviceSignature(storedHash, deviceId, "tampered", sig)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const deviceId = "dev_123";
    const attackerSig = deviceSignatureFromSecret(generateDeviceSecret(), deviceId, "body");
    const victimHash = hashDeviceSecret(generateDeviceSecret());
    expect(verifyDeviceSignature(victimHash, deviceId, "body", attackerSig)).toBe(false);
  });

  it("rejects malformed and missing signatures", () => {
    const storedHash = hashDeviceSecret(generateDeviceSecret());
    expect(verifyDeviceSignature(storedHash, "d", "b", null)).toBe(false);
    expect(verifyDeviceSignature(storedHash, "d", "b", "")).toBe(false);
    expect(verifyDeviceSignature(storedHash, "d", "b", "zzzz-not-hex")).toBe(false);
  });

  it("secrets are unique and prefixed", () => {
    const a = generateDeviceSecret();
    const b = generateDeviceSecret();
    expect(a).not.toBe(b);
    expect(a.startsWith("nxd_")).toBe(true);
  });
});
