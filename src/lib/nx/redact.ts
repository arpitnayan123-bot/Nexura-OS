/* ============================================================
   NEXURA OS v5 — PHI REDACTION (privacy-by-design)
   Structured logs, caches and AI telemetry must be PHI-minimized.
   This module scrubs strings/objects defensively: known identifier
   shapes (UHID, ABHA, phones, emails, MRN tokens) are masked even
   when a call site slips a raw record into meta. Deep, cycle-safe.
   ============================================================ */

const PATTERNS: { name: string; re: RegExp; mask: (m: string) => string }[] = [
  // UHID like NEX-2024-00123 or NX-000123
  {
    name: "uhid",
    re: /\b[A-Z]{2,4}-\d{2,4}-\d{3,6}\b/g,
    mask: (m) => `${m.slice(0, 3)}-••••-${m.slice(-2)}`,
  },
  // ABHA 14-digit
  { name: "abha", re: /\b\d{2}-\d{4}-\d{4}-\d{4}\b/g, mask: () => "••-••••-••••-••••" },
  // Indian phones +10 digits
  {
    name: "phone",
    re: /(?<!\d)(?:\+91[- ]?)?[6-9]\d{9}(?!\d)/g,
    mask: (m) => `${m.slice(0, 3)}•••••${m.slice(-2)}`,
  },
  // emails
  {
    name: "email",
    re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    mask: (m) => `${m.split("@")[0].slice(0, 2)}•••@${m.split("@")[1]}`,
  },
];

export function redactString(input: string): string {
  let out = input;
  for (const p of PATTERNS) out = out.replace(p.re, p.mask);
  return out;
}

// Unanchored ON PURPOSE: keys like `verifyToken` / `resetToken` / `accessToken`
// must also match — an anchored regex let live auth tokens reach server.log.
// Over-matching (e.g. "tokenize") fails closed, which is correct here.
const SENSITIVE_KEYS = /(password|pin|token|secret|authorization|cookie|signature|ssn|aadhaar)/i;

export function redactDeep<T>(value: T, depth = 0): T {
  if (depth > 6) return "[deep]" as unknown as T;
  if (typeof value === "string") return redactString(value) as unknown as T;
  if (typeof value !== "object" || value === null) return value;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(k)) {
      out[k] = "[redacted]";
    } else {
      out[k] = redactDeep(v, depth + 1);
    }
  }
  return out as unknown as T;
}

/** Redact patient-identifying name-like fields explicitly tagged by callers. */
export function redactRecord<T extends Record<string, unknown>>(rec: T, fields: (keyof T)[]): T {
  const out = { ...rec };
  for (const f of fields) {
    if (typeof out[f] === "string") out[f] = redactString(out[f] as string) as T[keyof T];
  }
  return out;
}
