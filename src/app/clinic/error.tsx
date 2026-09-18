"use client";

import { SegmentErrorBoundary } from "@/components/site/segment-error-boundary";

/* ============================================================
   /clinic ERROR BOUNDARY — light warm panel matching the
   Clinic OS #FAF7F2 canvas.
   ============================================================ */

export default function ClinicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentErrorBoundary error={error} reset={reset} variant="warm" tag="clinic" />;
}
