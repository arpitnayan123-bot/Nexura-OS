import crypto from "crypto";

/* ============================================================
   NEXURA HOSPITAL OS — TOTP (RFC 6238)
   Full implementation over node crypto (no external deps).
   Compatible with Google Authenticator / Aegis / 1Password.
   ============================================================ */

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += B32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** Current TOTP code for a secret at a given unix time (seconds). */
export function totpAt(secret: string, timeSec: number, step = 30, digits = 6): string {
  const key = base32Decode(secret);
  const counter = Math.floor(timeSec / step);
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  msg.writeUInt32BE(counter % 2 ** 32, 4);
  const hmac = crypto.createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

/** Verify with ±1 step drift tolerance. */
export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const now = Math.floor(Date.now() / 1000);
  for (let drift = -window; drift <= window; drift++) {
    if (totpAt(secret, now + drift * 30) === clean) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, account: string, issuer = "Nexura Hospital OS"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${label}?${params.toString()}`;
}
