"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/logger";

/* ============================================================
   GLOBAL ERROR BOUNDARY — Catches errors that error.tsx can't
   (e.g., errors in root layout itself).
   ============================================================ */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
    // Route through the structured logger so the digest lands in the JSON log
    // pipeline with the same shape as server-side errors.
    captureError(error, { scope: "global-error", digest: error.digest });

    // AUTO-RECOVERY: transparently retry up to 2 times before showing
    // this fallback — transient root-level failures heal silently.
    try {
      const key = `nx:retry:global:${error.digest ?? error.message.slice(0, 80)}`;
      const attempts = Number(sessionStorage.getItem(key) ?? 0);
      if (attempts < 2) {
        sessionStorage.setItem(key, String(attempts + 1));
        setTimeout(() => reset(), 200 * (attempts + 1));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {}
  }, [error, reset]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, sans-serif" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#141210",
          color: "#F6F1E7",
          padding: "2rem",
          position: "relative",
        }}>
          {/* ambient champagne light (matches the Liquid Gold error family) */}
          <div aria-hidden style={{
            position: "absolute",
            top: "-30%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "40rem",
            height: "26rem",
            borderRadius: "9999px",
            background: "radial-gradient(closest-side, rgba(217,184,124,0.20), rgba(217,184,124,0))",
            filter: "blur(20px)",
            pointerEvents: "none",
          }} />
          <div style={{ textAlign: "center", maxWidth: "28rem", position: "relative" }}>
            <p style={{
              fontSize: "0.7rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#D9B87C",
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}>
              Nexura OS
            </p>
            <h1 style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}>
              Application Error
            </h1>
            <p style={{
              fontSize: "0.875rem",
              opacity: 0.6,
              marginBottom: "1.5rem",
            }}>
              A critical error occurred. Please refresh the page or try again later.
            </p>
            {error.digest && (
              <p style={{
                fontSize: "0.65rem",
                opacity: 0.35,
                marginBottom: "1.5rem",
                fontFamily: "monospace",
              }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                background: "linear-gradient(135deg, #8F5E06 0%, #A16207 45%, #C08A2D 78%, #D9B87C 110%)",
                color: "#FFFDF6",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: "9999px",
                padding: "0.625rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 8px 22px -8px rgba(166,124,42,0.55)",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
