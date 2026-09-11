"use client";

import { SegmentErrorBoundary } from "@/components/site/segment-error-boundary";

/* ============================================================
   /predictive ERROR BOUNDARY — renders on the nxf dark canvas
   (.nxf-root + #0B1630) so a crash here never falls back to a
   light page inside the dark Predictive experience.
   ============================================================ */

export default function PredictiveError({
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
      variant="canvas"
      tag="predictive"
    />
  );
}
