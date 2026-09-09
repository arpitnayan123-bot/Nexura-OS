"use client";

import { useEffect } from "react";

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
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, sans-serif" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0A",
          color: "#fff",
          padding: "2rem",
        }}>
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
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
                opacity: 0.3,
                marginBottom: "1.5rem",
                fontFamily: "monospace",
              }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                background: "#D98B6E",
                color: "#fff",
                border: "none",
                borderRadius: "9999px",
                padding: "0.625rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
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
