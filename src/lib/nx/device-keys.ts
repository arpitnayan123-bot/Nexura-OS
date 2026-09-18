import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";

/* ============================================================
   NEXURA OS — WEARABLE DEVICE KEY MATERIAL (backend-core-1)
   Field devices authenticate ingest with a per-device secret
   shown ONCE at pairing; only sha256(secret) is stored, and no
   plaintext secret is ever persisted or logged.

   Protocol (both sides derive the same HMAC key):
     H          = sha256(deviceSecret)          // stored on server
     signature  = HMAC-SHA256(key: H, data: deviceId + "." + rawBody)
   - The device holds the raw secret S and derives H itself.
   - The server stores only H and verifies HMAC(H, …) directly.
   - A network attacker sees only sigs — never H or S.
   - A DB leak reveals H but not S; rows are still server-
     authoritative. Verification is timing-safe.

   Ingest route policy (predict/bio/[deviceId]):
   - device.secretHash set  → valid x-nx-signature required (401 otherwise)
   - device.secretHash null → legacy device: allowed in DEMO_MODE,
     rejected in production until re-paired.
   ============================================================ */

export const DEVICE_SIGNATURE_HEADER = "x-nx-signature";

/** Mint a new device secret (CSPRNG — Math.random never mints secrets). */
export function generateDeviceSecret(): string {
  return `nxd_${randomBytes(24).toString("base64url").replace(/[-_]/g, "").slice(0, 32)}`;
}

/** The value stored in NxWearableDevice.secretHash — also the HMAC key. */
export function hashDeviceSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

/** Client-side helper (pairing docs / device firmware / tests):
 *  derive the signing key from the raw secret, then sign. */
export function deviceSignatureFromSecret(
  secret: string,
  deviceId: string,
  rawBody: string,
): string {
  return createHmac("sha256", hashDeviceSecret(secret))
    .update(`${deviceId}.${rawBody}`)
    .digest("hex");
}

/** Server-side verification: keyed by the STORED hash. Timing-safe. */
export function verifyDeviceSignature(
  storedSecretHash: string,
  deviceId: string,
  rawBody: string,
  signature: string | null | undefined,
): boolean {
  if (!signature || typeof signature !== "string") return false;
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", storedSecretHash)
    .update(`${deviceId}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
