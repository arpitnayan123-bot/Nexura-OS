"use client";

import { SegmentErrorBoundary } from "@/components/site/segment-error-boundary";

/* ============================================================
   /connect ERROR BOUNDARY — dark warm-brown panel matching the
   connect app's #1F1B17 loading / error shells.
   ============================================================ */

export default function ConnectError({
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
      variant="connect"
      tag="connect"
    />
  );
}
