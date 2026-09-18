"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal, AuroraBackground } from "./ambient";
import { cn } from "@/lib/utils";

const TESTIMONIALS = [
  {
    quote:
      "Nexura caught an arrhythmia my Apple Watch missed for months. A real cardiologist called me within ten minutes. I've never felt more held by a health product.",
    name: "Priya Raman",
    title: "Patient · Bengaluru",
    accent: "var(--coral)",
    rating: 5,
  },
  {
    quote:
      "As a clinic, our no-show rate dropped 38% and our patient NPS climbed 22 points. The gentle nudges feel like care, not marketing.",
    name: "Dr. Herve Lambert",
    title: "Medical Director · Lyon",
    accent: "var(--sage)",
    rating: 5,
  },
  {
    quote:
      "The living care plan adapts to my migraines, my sleep, even my deadlines. It's the first health app that feels designed around a real human week.",
    name: "Mara Chen",
    title: "Patient · Singapore",
    accent: "var(--honey)",
    rating: 5,
  },
  {
    quote:
      "My care team sees my data before I walk in. Appointments are shorter, warmer, and far more useful.",
    name: "David Osei",
    title: "Patient · Accra",
    accent: "var(--clay)",
    rating: 5,
  },
];

export function Testimonials() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  const go = useCallback((d: number) => {
    setDir(d);
    setIdx((i) => (i + d + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    const id = setInterval(() => go(1), 6500);
    return () => clearInterval(id);
  }, [go]);

  const t = TESTIMONIALS[idx];

  return (
    <section id="stories" className="relative overflow-hidden py-24 lg:py-32">
      <AuroraBackground variant="default" className="opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-honey anim-breathe" />
              Stories of care
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Held by a system that <span className="text-gradient-warm">listens back.</span>
            </h2>
          </Reveal>
        </div>

        <Reveal delay={0.14} y={32}>
          <div className="relative mx-auto mt-12 max-w-4xl">
            <div
              className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-8 shadow-[0_30px_80px_-50px_oklch(0.4_0.05_45/0.4)] sm:p-12"
              style={{ minHeight: 320 }}
            >
              <Quote
                className="absolute right-6 top-6 h-16 w-16 opacity-10"
                style={{ color: t.accent }}
              />
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={idx}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -40 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-honey text-honey" />
                    ))}
                  </div>
                  <p className="mt-5 font-display text-2xl font-medium leading-snug tracking-tight sm:text-[1.75rem]">
                    “{t.quote}”
                  </p>
                  <div className="mt-7 flex items-center gap-3">
                    <span
                      className="grid h-11 w-11 place-items-center rounded-full font-display text-base font-semibold text-white"
                      style={{ background: t.accent }}
                    >
                      {t.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")}
                    </span>
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-muted-foreground">{t.title}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* controls */}
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to testimonial ${i + 1}`}
                    onClick={() => {
                      setDir(i > idx ? 1 : -1);
                      setIdx(i);
                    }}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === idx ? "w-8 bg-primary" : "w-3 bg-border hover:bg-muted-foreground/40",
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => go(-1)}
                  aria-label="Previous"
                  className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-accent/40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => go(1)}
                  aria-label="Next"
                  className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-accent/40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
