"use client";

import { SegmentErrorBoundary } from "@/components/site/segment-error-boundary";

/* ============================================================
   /pharmacy ERROR BOUNDARY — light warm panel on the platform
   #FAF7F2 canvas; Pharmacia's own dark shell reloads cleanly
   via Try again.
   ============================================================ */

export default function PharmacyError({
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
      tag="pharmacy"
    />
  );
}
