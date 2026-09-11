"use client";

import { SegmentErrorBoundary } from "@/components/site/segment-error-boundary";

/* ============================================================
   /global ERROR BOUNDARY — white panel with slate ink and the
   amber accent used across the /global marketing page.
   ============================================================ */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentErrorBoundary
      error={error}
      reset={reset}
      variant="light"
      tag="global"
    />
  );
}
