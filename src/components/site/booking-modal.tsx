"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Stethoscope,
  CalendarDays,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useBooking } from "./booking-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SPECIALTIES = [
  "Cardiology",
  "Family Medicine",
  "Endocrinology",
  "Dermatology",
  "Mental Health",
  "Pediatrics",
];

// Generate next 10 weekdays as selectable dates (deterministic to avoid SSR mismatch)
const DATES = Array.from({ length: 10 }).map((_, i) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + i + 1);
  return d;
});

const SLOTS = ["09:15", "10:30", "11:45", "13:00", "14:30", "16:00", "17:15", "18:30"];

const STEPS = ["Specialty", "Date", "Time", "Details"] as const;

export function BookingModal() {
  const { open, prefill, closeBooking } = useBooking();
  const [step, setStep] = useState(0);
  const [specialty, setSpecialty] = useState<string>("");
  const [dateIdx, setDateIdx] = useState<number>(0);
  const [slot, setSlot] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // prefill when opening
  useEffect(() => {
    if (open) {
      setStep(0);
      setDone(false);
      setSpecialty(prefill.specialty ?? "");
      setReason(prefill.reason ?? "");
      setSlot("");
      setDateIdx(0);
    }
  }, [open, prefill]);

  const selectedDate = DATES[dateIdx];

  const canNext = useMemo(() => {
    if (step === 0) return !!specialty;
    if (step === 1) return dateIdx >= 0;
    if (step === 2) return !!slot;
    if (step === 3) return !!name && !!email;
    return false;
  }, [step, specialty, dateIdx, slot, name, email]);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          type: "appointment",
          name,
          specialty,
          date: selectedDate.toISOString(),
          slot,
          reason,
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      toast.success("Booking confirmed", {
        description: `We've reserved ${slot} on ${selectedDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}.`,
      });
    } catch {
      toast.error("Couldn't book that slot. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : submit());
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) closeBooking();
      }}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-[36rem]">
        {/* warm gradient header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[oklch(0.70_0.145_45)] via-[oklch(0.64_0.10_40)] to-[oklch(0.58_0.09_30)] p-6 text-primary-foreground">
          <div
            aria-hidden
            className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl anim-breathe"
          />
          <DialogHeader className="relative space-y-1.5 p-0">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 backdrop-blur">
                <Sparkles className="h-4 w-4" />
              </span>
              <DialogTitle className="font-display text-xl">
                {done ? "You're booked in." : "Book a visit"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-primary-foreground/85">
              {done
                ? "A confirmation and your join link are on the way."
                : "A warm, 20-minute conversation with a real clinician — no wait, no friction."}
            </DialogDescription>
          </DialogHeader>

          {/* step progress */}
          {!done && (
            <div className="relative mt-5 flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 items-center gap-1.5">
                  <div
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors duration-300",
                      i <= step ? "bg-white" : "bg-white/25",
                    )}
                  />
                </div>
              ))}
            </div>
          )}
          {!done && (
            <p className="relative mt-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-primary-foreground/80">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
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
                className="flex flex-col items-center py-6 text-center"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 14 }}
                  className="grid h-16 w-16 place-items-center rounded-full bg-sage/30 text-sage"
                >
                  <CheckCircle2 className="h-8 w-8" />
                </motion.span>
                <p className="mt-4 font-display text-lg font-semibold">
                  Calm — you&apos;re all set.
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  {name || "You"} · {specialty || "a specialist"} on{" "}
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {slot}.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <a
                    href={buildGoogleCalendarLink({
                      title: `Nexura OS — ${specialty || "appointment"}`,
                      date: selectedDate,
                      slot,
                      detail: `With ${name || "you"}. Warm conversation with a Nexura clinician.`,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:shadow-[0_8px_24px_-6px_oklch(0.70_0.145_45/0.6)]"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Add to Google Calendar
                  </a>
                  <button
                    onClick={() => {
                      const ics = buildIcsFile({
                        title: `Nexura OS — ${specialty || "appointment"}`,
                        date: selectedDate,
                        slot,
                        detail: `With ${name || "you"}. Warm conversation with a Nexura clinician.`,
                      });
                      const blob = new Blob([ics], { type: "text/calendar" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "nexura-appointment.ics";
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Calendar file downloaded");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium transition-colors hover:bg-accent/40"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    .ics download
                  </button>
                </div>
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
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIALTIES.map((s) => {
                      const sel = specialty === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setSpecialty(s)}
                          className={cn(
                            "group flex items-center gap-2 rounded-2xl border p-3 text-left text-sm font-medium transition-all",
                            sel
                              ? "border-primary bg-primary/10 text-foreground shadow-[0_8px_24px_-10px_oklch(0.70_0.145_45/0.4)]"
                              : "border-border bg-card hover:border-primary/40 hover:bg-accent/40",
                          )}
                        >
                          <span
                            className={cn(
                              "grid h-8 w-8 place-items-center rounded-xl transition-colors",
                              sel
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent/60 text-foreground",
                            )}
                          >
                            <Stethoscope className="h-4 w-4" />
                          </span>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-5">
                      {DATES.map((d, i) => {
                        const sel = dateIdx === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setDateIdx(i)}
                            className={cn(
                              "flex flex-col items-center gap-0.5 rounded-2xl border py-2.5 transition-all",
                              sel
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-card hover:bg-accent/40",
                            )}
                          >
                            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                              {d.toLocaleDateString("en-US", { weekday: "short" })}
                            </span>
                            <span className="font-display text-lg font-semibold leading-none">
                              {d.getDate()}
                            </span>
                            <span className="text-[0.6rem] text-muted-foreground">
                              {d.toLocaleDateString("en-US", { month: "short" })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Selected:{" "}
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}

                {step === 2 && (
                  <div className="grid grid-cols-4 gap-2">
                    {SLOTS.map((s) => {
                      const sel = slot === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setSlot(s)}
                          className={cn(
                            "flex items-center justify-center gap-1 rounded-xl border py-2.5 text-sm font-medium transition-all",
                            sel
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card hover:bg-accent/40",
                          )}
                        >
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="bk-name" className="text-xs">
                        Your name
                      </Label>
                      <Input
                        id="bk-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="mt-1.5 h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bk-email" className="text-xs">
                        Email
                      </Label>
                      <Input
                        id="bk-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@calmer.health"
                        className="mt-1.5 h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bk-reason" className="text-xs">
                        What would you like to discuss? (optional)
                      </Label>
                      <Textarea
                        id="bk-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="A few words are enough — your clinician will read it before you meet."
                        className="mt-1.5 min-h-[5rem] resize-none"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* footer actions */}
        {!done && (
          <div className="flex items-center justify-between gap-3 border-t border-border bg-card/60 p-4">
            <Button
              type="button"
              variant="ghost"
              onClick={back}
              disabled={step === 0}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {specialty && <span>{specialty}</span>}
              {slot && (
                <>
                  <span>·</span>
                  <span>{slot}</span>
                </>
              )}
            </div>
            <Button
              type="button"
              onClick={next}
              disabled={!canNext || loading}
              className="group rounded-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {step === STEPS.length - 1 ? (
                loading ? (
                  "Booking…"
                ) : (
                  "Confirm booking"
                )
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- calendar helpers ---------- */

function parseSlotToDate(date: Date, slot: string): Date {
  const [hh, mm] = slot.split(":").map((n) => parseInt(n, 10));
  const d = new Date(date);
  d.setHours(hh || 9, mm || 0, 0, 0);
  return d;
}

function toIcsTime(d: Date): string {
  // YYYYMMDDTHHMMSSZ in UTC
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function buildGoogleCalendarLink({
  title,
  date,
  slot,
  detail,
}: {
  title: string;
  date: Date;
  slot: string;
  detail: string;
}): string {
  const start = parseSlotToDate(date, slot);
  const end = new Date(start.getTime() + 20 * 60 * 1000); // 20-min consult
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: detail,
    location: "Nexura OS · virtual visit",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsFile({
  title,
  date,
  slot,
  detail,
}: {
  title: string;
  date: Date;
  slot: string;
  detail: string;
}): string {
  const start = parseSlotToDate(date, slot);
  const end = new Date(start.getTime() + 20 * 60 * 1000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nexura OS//Health//EN",
    "BEGIN:VEVENT",
    `UID:${start.getTime()}@nexura.os`,
    `DTSTAMP:${toIcsTime(new Date())}`,
    `DTSTART:${toIcsTime(start)}`,
    `DTEND:${toIcsTime(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${detail}`,
    "LOCATION:Nexura OS \\· virtual visit",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
