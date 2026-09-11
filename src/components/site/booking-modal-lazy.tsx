"use client";

import dynamic from "next/dynamic";

/**
 * The global booking dialog only becomes visible after user interaction
 * (BookingProvider `open` state), so it is safe to load it as a client-only,
 * post-hydration chunk instead of shipping it in the root layout's bundle.
 * If a user clicks "Book" before the chunk resolves, the open state persists
 * in context and the dialog appears as soon as the chunk arrives.
 *
 * Must stay mounted inside <BookingProvider> so useBooking() context works.
 * `ssr: false` is legal here because this file is a Client Component.
 */
const BookingModal = dynamic(
  () => import("./booking-modal").then((m) => m.BookingModal),
  { ssr: false, loading: () => null }
);

export function BookingModalLazy() {
  return <BookingModal />;
}
