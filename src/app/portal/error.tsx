"use client";

import { SegmentErrorBoundary } from "@/components/site/segment-error-boundary";

/* ============================================================
   /portal ERROR BOUNDARY — light warm panel matching the
   patient portal #FAF7F2 canvas.
   ============================================================ */

export default function PortalError({
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
      variant="warm"
      tag="portal"
    />
  );
}
