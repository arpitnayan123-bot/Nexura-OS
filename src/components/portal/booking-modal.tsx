"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar, MapPin, CreditCard, CheckCircle2, ChevronRight, ChevronLeft, Loader2,
  Home, Wallet, Smartphone, Droplet, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type TestPanel = {
  code: string;
  name: string;
  price: number;
  tests: string;
  icon: string;
  popular?: boolean;
  estTime?: string;
};

type Props = {
  open: boolean;
  panel?: TestPanel | null;
  defaultAddress?: string;
  defaultCity?: string;
  defaultPincode?: string;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
};

const STEPS = ["Schedule", "Address", "Payment"] as const;

// next 10 weekdays (deterministic to avoid SSR mismatch)
const DATES = Array.from({ length: 10 }).map((_, i) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + i + 1);
  return d;
});

const SLOTS = [
  "06:30–07:00", "07:00–07:30", "07:30–08:00", "08:00–08:30",
  "08:30–09:00", "16:00–16:30", "17:00–17:30", "18:00–18:30",
];

export function BookingModal({
  open,
  panel,
  defaultAddress,
  defaultCity,
  defaultPincode,
  onOpenChange,
  onCreated,
}: Props) {
  const [step, setStep] = useState(0);
  const [dateIdx, setDateIdx] = useState(0);
  const [slot, setSlot] = useState("");
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [city, setCity] = useState(defaultCity ?? "Mumbai");
  const [pincode, setPincode] = useState(defaultPincode ?? "400053");
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState<"upi" | "cash">("upi");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setDone(false);
      setSlot("");
      setNotes("");
      setAddress(defaultAddress ?? "");
      setCity(defaultCity ?? "Mumbai");
      setPincode(defaultPincode ?? "400053");
    }
  }, [open, defaultAddress, defaultCity, defaultPincode]);

  const selectedDate = DATES[dateIdx];

  const canNext = useMemo(() => {
    if (step === 0) return !!slot;
    if (step === 1) return !!address && !!pincode;
    if (step === 2) return !!paymentMode;
    return false;
  }, [step, slot, address, pincode, paymentMode]);

  const submit = async () => {
    if (!panel) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/blood-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testPanelCode: panel.code,
          scheduledDate: selectedDate.toISOString(),
          timeSlot: slot,
          address,
          city,
          pincode,
          paymentMode,
          notes,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Booking failed");
      setDone(true);
      toast.success("Blood test booked!", {
        description: `${panel.name} on ${selectedDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} at ${slot}.`,
      });
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : submit());
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[34rem]">
        {/* warm gradient header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#D98B6E] via-[#C97759] to-[#9DB89E] p-6 text-white">
          <div
            aria-hidden
            className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl"
            style={{ animation: "nexura-breathe 6s ease-in-out infinite" }}
          />
          <DialogHeader className="relative space-y-1.5 p-0">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/20 backdrop-blur text-lg">
                {panel?.icon ?? "🩸"}
              </span>
              <DialogTitle className="font-display text-xl">
                {done ? "Booking confirmed" : panel?.name ?? "Book a test"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-white/85">
              {done
                ? "A phlebotomist will arrive at your address."
                : panel ? `₹${panel.price} · ${panel.tests}` : "Select a panel to begin."}
            </DialogDescription>
          </DialogHeader>

          {!done && (
            <>
              <div className="relative mt-5 flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex flex-1 items-center gap-1.5">
                    <div className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-white" : "bg-white/25")} />
                  </div>
                ))}
              </div>
              <p className="relative mt-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-white/80">
                Step {step + 1} of {STEPS.length} · {STEPS[step]}
              </p>
            </>
          )}
        </div>

        {/* body */}
        <div className="max-h-[22rem] overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-4 text-center"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 14 }}
                  className="grid h-16 w-16 place-items-center rounded-full bg-[#9DB89E]/30 text-[#5E8A60]"
                >
                  <CheckCircle2 className="h-9 w-9" />
                </motion.span>
                <p className="mt-4 font-display text-lg font-semibold text-stone-800">
                  Calm — you&apos;re all set.
                </p>
                <p className="mt-1 max-w-xs text-sm text-stone-600">
                  {panel?.name} on{" "}
                  <span className="font-semibold">
                    {selectedDate.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}
                  </span>{" "}
                  at <span className="font-semibold">{slot}</span>.
                </p>
                <div className="mt-3 rounded-2xl border border-[#E7E5E4] bg-[#FAF7F2] p-3 text-left text-xs text-stone-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 text-[#D98B6E]" />
                    <span>{address}, {city} — {pincode}</span>
                  </div>
                </div>
                <p className="mt-3 text-[0.7rem] text-stone-500">
                  Your phlebotomist&apos;s name and contact number appear on the booking card in the Blood Checkup tab.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 0 && (
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Select date
                    </Label>
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {DATES.map((d, i) => {
                        const sel = dateIdx === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setDateIdx(i)}
                            className={cn(
                              "flex flex-col items-center gap-0.5 rounded-2xl border py-2.5 transition-all",
                              sel
                                ? "border-[#D98B6E] bg-[#D98B6E]/10 text-stone-800"
                                : "border-[#E7E5E4] bg-white hover:bg-[#FAF7F2]"
                            )}
                          >
                            <span className="text-[0.6rem] uppercase tracking-wider text-stone-400">
                              {d.toLocaleDateString("en-US", { weekday: "short" })}
                            </span>
                            <span className="font-display text-lg font-semibold leading-none text-stone-800">
                              {d.getDate()}
                            </span>
                            <span className="text-[0.6rem] text-stone-400">
                              {d.toLocaleDateString("en-US", { month: "short" })}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <Label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Select time slot
                    </Label>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {SLOTS.map((s) => {
                        const sel = slot === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setSlot(s)}
                            className={cn(
                              "flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-medium transition-all",
                              sel
                                ? "border-[#D98B6E] bg-[#D98B6E]/10 text-stone-800"
                                : "border-[#E7E5E4] bg-white hover:bg-[#FAF7F2]"
                            )}
                          >
                            <Calendar className="h-3 w-3 text-stone-400" />
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
                      <Calendar className="h-3.5 w-3.5 text-[#D98B6E]" />
                      Selected:{" "}
                      <span className="font-semibold text-stone-700">
                        {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      </span>
                      {slot && <span>· {slot}</span>}
                    </p>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="bk-addr" className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        Full address
                      </Label>
                      <Textarea
                        id="bk-addr"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Flat / Building, Street, Landmark"
                        className="mt-1.5 min-h-[5rem] resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="bk-city" className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          City
                        </Label>
                        <Input
                          id="bk-city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="mt-1.5 h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bk-pin" className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          Pincode
                        </Label>
                        <Input
                          id="bk-pin"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className="mt-1.5 h-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bk-notes" className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        Notes for phlebotomist (optional)
                      </Label>
                      <Input
                        id="bk-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Ring bell twice, 3rd floor walk-up"
                        className="mt-1.5 h-10"
                      />
                    </div>
                    <div className="rounded-2xl border border-[#9DB89E]/40 bg-[#9DB89E]/8 p-3 text-xs text-stone-600">
                      <div className="flex items-center gap-1.5 font-medium text-[#5E8A60]">
                        <Home className="h-3.5 w-3.5" />
                        Home collection included free
                      </div>
                      <p className="mt-1 leading-snug text-stone-500">
                        A phlebotomist will arrive within the chosen slot. Same-day reports for CBC; 12-24 hrs for the larger panels.
                      </p>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Payment method
                    </Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {([
                        { key: "upi", label: "UPI / Wallet", icon: Smartphone, sub: "Marked paid with your booking" },
                        { key: "cash", label: "Cash on Visit", icon: Wallet, sub: "Pay phlebotomist" },
                      ] as const).map((p) => {
                        const sel = paymentMode === p.key;
                        return (
                          <button
                            key={p.key}
                            onClick={() => setPaymentMode(p.key)}
                            className={cn(
                              "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all",
                              sel
                                ? "border-[#D98B6E] bg-[#D98B6E]/10"
                                : "border-[#E7E5E4] bg-white hover:bg-[#FAF7F2]"
                            )}
                          >
                            <p.icon className={cn("h-5 w-5", sel ? "text-[#D98B6E]" : "text-stone-400")} />
                            <span className="text-sm font-semibold text-stone-800">{p.label}</span>
                            <span className="text-[0.7rem] text-stone-500">{p.sub}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Order summary */}
                    <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-[#FAF7F2] p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-500">Test panel</span>
                        <span className="font-semibold text-stone-800">{panel?.name}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="text-stone-500">Includes</span>
                        <span className="font-medium text-stone-700">{panel?.tests}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="text-stone-500">Schedule</span>
                        <span className="font-medium text-stone-700">
                          {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {slot}
                        </span>
                      </div>
                      <div className="my-3 h-px bg-stone-200" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-stone-700">Total payable</span>
                        <span className="font-display text-xl font-semibold text-[#D98B6E]">
                          ₹{panel?.price ?? 0}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[0.7rem] text-stone-500">
                      <ShieldCheck className="h-3 w-3 text-[#9DB89E]" />
                      Payment mode is recorded with your booking · Data handled per DPDP 2023 principles
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* footer */}
        {!done && (
          <div className="flex items-center justify-between gap-3 border-t border-[#E7E5E4] bg-[#FAF7F2] p-4">
            <Button type="button" variant="ghost" onClick={back} disabled={step === 0} className="rounded-full">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Droplet className="h-3.5 w-3.5 text-[#D98B6E]" />
              {panel?.name}
            </div>
            <Button
              type="button"
              onClick={next}
              disabled={!canNext || loading}
              className="group rounded-full bg-[#D98B6E] text-white hover:bg-[#C97759]"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {step === STEPS.length - 1 ? (loading ? "Booking…" : `Confirm · ₹${panel?.price ?? 0}`) : (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </div>
        )}

        {done && (
          <div className="flex items-center justify-end border-t border-[#E7E5E4] bg-[#FAF7F2] p-4">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full bg-[#D98B6E] text-white hover:bg-[#C97759]"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
