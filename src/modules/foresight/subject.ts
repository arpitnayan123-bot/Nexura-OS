import { cookies } from "next/headers";

/* ============================================================
 * FORESIGHT SUBJECT — cookie-backed anonymous key.
 * No login, no PHI in the cookie: just a random opaque id so
 * repeat runs build a history for the SAME browser. Users can
 * wipe everything at any time from Settings (DELETE /data).
 * ============================================================ */

export const FS_COOKIE = "nx_fs_subject";

function randomKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Reads the subject key; if missing, mints one and sets the cookie. */
export async function getOrCreateSubject(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(FS_COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  const fresh = randomKey();
  try {
    jar.set(FS_COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  } catch {
    /* read-only context — key still returned for this request */
  }
  return fresh;
}

/** Reads the subject key without creating one. */
export async function readSubject(): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(FS_COOKIE)?.value;
  return existing && /^[a-f0-9]{32}$/.test(existing) ? existing : null;
}
