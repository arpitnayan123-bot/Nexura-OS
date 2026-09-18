/* ============================================================
   NEXURA HOSPITAL OS — STRUCTURED LOGGER
   JSON lines with level, subsystem, message + metadata.
   Never log secrets, tokens, passwords or PHI payloads —
   call sites must pass ids/counts, never record contents.
   ============================================================ */

type Level = "debug" | "info" | "warn" | "error";

import { redactDeep } from "@/lib/nx/redact";

function emit(level: Level, subsystem: string, msg: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    subsystem,
    msg: redactDeep(msg),
    // Privacy-by-design: meta is PHI-scrubbed (identifiers masked, secret-like
    // keys dropped) even when a call site leaks a raw record into logs.
    ...(meta ? { meta: redactDeep(meta) } : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (subsystem: string, msg: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") emit("debug", subsystem, msg, meta);
  },
  info: (subsystem: string, msg: string, meta?: Record<string, unknown>) =>
    emit("info", subsystem, msg, meta),
  warn: (subsystem: string, msg: string, meta?: Record<string, unknown>) =>
    emit("warn", subsystem, msg, meta),
  error: (subsystem: string, msg: string, meta?: Record<string, unknown>) =>
    emit("error", subsystem, msg, meta),
};

/** Error-tracking integration point (Sentry etc.). Wire here, one place. */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  log.error("errors", err instanceof Error ? err.message : String(err), context);
}
