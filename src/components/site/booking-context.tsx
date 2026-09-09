"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type BookingPrefill = {
  specialist?: string;
  specialty?: string;
  reason?: string;
};

type BookingCtx = {
  open: boolean;
  prefill: BookingPrefill;
  openBooking: (p?: BookingPrefill) => void;
  closeBooking: () => void;
};

const Ctx = createContext<BookingCtx | null>(null);

export function useBooking() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<BookingPrefill>({});

  const openBooking = useCallback((p: BookingPrefill = {}) => {
    setPrefill(p);
    setOpen(true);
  }, []);

  const closeBooking = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, prefill, openBooking, closeBooking }),
    [open, prefill, openBooking, closeBooking]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
