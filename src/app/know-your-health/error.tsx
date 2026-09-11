"use client";

import { SegmentErrorBoundary } from "@/components/site/segment-error-boundary";

/* ============================================================
   /know-your-health ERROR BOUNDARY — KYH glass panel on the
   #FAF7F2 mesh, matching the tools' glass-soft aesthetic.
   ============================================================ */

export default function KnowYourHealthError({
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
      variant="kyh"
      tag="know-your-health"
    />
  );
}
