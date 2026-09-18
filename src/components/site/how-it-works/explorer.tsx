"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpRight,
  CalendarPlus,
  BookOpenText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBooking } from "../booking-context";
import { HIW_SECTIONS, HIW_GROUPS, sectionsByGroup } from "./content";
import type { HiwSection } from "./types";

/* ============================================================
   HOW IT WORKS EXPLORER
   A crisp, two-pane guide to every feature of the ecosystem.
   Left: grouped rail. Right: numbered steps + under-the-hood chips.
   Keyboard: ↑/↓ move · Esc close.
   ============================================================ */

export function HowItWorksExplorer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  const { openBooking } = useBooking();

  // reset to intro when reopened (render-time state adjustment)
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setIdx(0);
  }

  const section = HIW_SECTIONS[idx];

  const go = useCallback((next: number) => {
    setIdx((i) => Math.min(HIW_SECTIONS.length - 1, Math.max(0, next)));
  }, []);

  const step = useCallback((dir: 1 | -1) => {
    setIdx((i) => (i + dir + HIW_SECTIONS.length) % HIW_SECTIONS.length);
  }, []);

  // keyboard navigation while open
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, step]);

  const railData = useMemo(
    () =>
      HIW_GROUPS.map((g) => ({
        ...g,
        sections: sectionsByGroup(g.id),
      })),
    [],
  );

  const handleCta = (s: HiwSection) => {
    if (!s.cta) return;
    if (s.cta.kind === "booking") {
      onOpenChange(false);
      setTimeout(() => openBooking(), 120);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden rounded-2xl border-border bg-background p-0 backdrop-blur-2xl w-[calc(100%-1rem)] sm:w-[min(1060px,96vw)] sm:max-w-[min(1060px,96vw)] h-[92vh] sm:h-[min(760px,90vh)] grid grid-rows-[auto_1fr_auto] [grid-template-columns:minmax(0,1fr)] gap-0"
      >
        {/* ===== Header ===== */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-coral via-honey to-sage shadow-sm">
            <BookOpenText className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <DialogTitle asChild>
              <p className="font-display text-base font-semibold tracking-tight">
                How Nexura works
              </p>
            </DialogTitle>
            <p className="text-[0.65rem] text-muted-foreground">
              Every feature of the ecosystem, in crisp steps
            </p>
          </div>
          <span className="hidden rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[0.6rem] font-medium tabular-nums text-muted-foreground sm:block">
            {idx + 1} / {HIW_SECTIONS.length}
          </span>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ===== Body ===== */}
        <div className="flex min-h-0">
          {/* --- Rail (desktop) --- */}
          <aside className="hidden w-[248px] shrink-0 overflow-y-auto border-r border-border bg-muted/20 py-3 md:block lg:w-[268px]">
            {railData.map((g) => (
              <div key={g.id} className="mb-3">
                <p className="px-4 pb-1.5 pt-2 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {g.label}
                </p>
                {g.sections.map((s) => {
                  const active = HIW_SECTIONS[idx]?.id === s.id;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => go(HIW_SECTIONS.findIndex((x) => x.id === s.id))}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 px-4 py-[7px] text-left transition-colors",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="hiw-active"
                          className="absolute inset-y-0 left-0 w-[3px] rounded-r"
                          style={{ background: s.accent }}
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <span
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors",
                          active ? "text-white shadow-sm" : "bg-muted text-muted-foreground",
                        )}
                        style={active ? { background: s.accent } : undefined}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                      <span className="truncate text-[0.78rem] font-medium">{s.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </aside>

          {/* --- Content pane --- */}
          <div className="min-w-0 flex-1 overflow-y-auto">
            {/* mobile chip rail */}
            <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
              {HIW_SECTIONS.map((s, i) => {
                const Icon = s.icon;
                const active = i === idx;
                return (
                  <button
                    key={s.id}
                    onClick={() => go(i)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-medium transition-colors",
                      active
                        ? "border-transparent text-white"
                        : "border-border text-muted-foreground",
                    )}
                    style={active ? { background: s.accent } : undefined}
                  >
                    <Icon className="h-3 w-3" />
                    {s.title}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="px-5 py-6 sm:px-8 sm:py-7"
              >
                {/* kicker */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-white"
                    style={{ background: section.accent }}
                  >
                    {HIW_GROUPS.find((g) => g.id === section.group)?.label}
                  </span>
                  <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[0.55rem] font-medium uppercase tracking-wider text-muted-foreground">
                    {section.minutes}
                  </span>
                </div>

                <h3 className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-[1.6rem]">
                  {section.title}
                </h3>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {section.kicker}
                </p>

                {/* steps */}
                <ol className="mt-6 space-y-3.5">
                  {section.steps.map((st, i) => (
                    <motion.li
                      key={st.title}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * i, duration: 0.2 }}
                      className="flex items-start gap-3"
                    >
                      <span
                        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.6rem] font-bold tabular-nums text-white shadow-sm"
                        style={{ background: section.accent }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.83rem] font-semibold leading-snug">{st.title}</p>
                        <p className="mt-0.5 text-[0.78rem] leading-relaxed text-muted-foreground">
                          {st.desc}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ol>

                {/* under the hood */}
                <div className="mt-7 border-t border-dashed border-border pt-4">
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                    Under the hood
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {section.hood.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[0.62rem] font-medium text-muted-foreground"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                {section.cta && (
                  <div className="mt-5">
                    {section.cta.kind === "booking" ? (
                      <Button
                        onClick={() => handleCta(section)}
                        className="group rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_oklch(0.70_0.145_45/0.7)] transition-all hover:shadow-[0_10px_30px_-8px_oklch(0.70_0.145_45/0.85)]"
                      >
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <CalendarPlus className="h-4 w-4" />
                          {section.cta.label}
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        onClick={() => handleCta(section)}
                        className="group rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_oklch(0.70_0.145_45/0.7)] transition-all hover:shadow-[0_10px_30px_-8px_oklch(0.70_0.145_45/0.85)]"
                      >
                        <Link href={section.cta.href}>
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            {section.cta.label}
                            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ===== Footer — hints + prev/next ===== */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-3 py-2 sm:px-4">
          <div className="hidden items-center gap-3 text-[0.6rem] text-muted-foreground sm:flex">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[0.55rem]">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[0.55rem]">
                esc
              </kbd>
              close
            </span>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => step(-1)}
              className="h-8 rounded-full px-3 text-[0.7rem] text-muted-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              size="sm"
              onClick={() => step(1)}
              className="h-8 rounded-full bg-foreground px-3.5 text-[0.7rem] font-medium text-background hover:bg-foreground/85"
            >
              {idx === HIW_SECTIONS.length - 1 ? "Start over" : "Next"}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
