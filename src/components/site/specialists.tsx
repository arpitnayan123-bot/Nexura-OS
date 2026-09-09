"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Calendar, Verified, Languages, Search } from "lucide-react";
import { Reveal, AuroraBackground } from "./ambient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBooking } from "./booking-context";
import { Parallax } from "./parallax";

type Specialty =
  | "All"
  | "Cardiology"
  | "Family"
  | "Endocrinology"
  | "Dermatology"
  | "Mental Health"
  | "Pediatrics";

const SPECIALISTS = [
  {
    name: "Dr. Marcus Bell",
    role: "Cardiologist",
    specialty: "Cardiology" as Specialty,
    img: "/nexura/spec-1.png",
    rating: 4.9,
    reviews: 412,
    langs: "EN · FR",
    tag: "Top rated",
    accent: "var(--coral)",
    nextSlot: "Today 14:30",
  },
  {
    name: "Dr. Lina Okafor",
    role: "Family Medicine",
    specialty: "Family" as Specialty,
    img: "/nexura/spec-2.png",
    rating: 4.8,
    reviews: 318,
    langs: "EN · YO",
    tag: "Same-day",
    accent: "var(--sage)",
    nextSlot: "Today 09:15",
  },
  {
    name: "Dr. Mei Tanaka",
    role: "Endocrinologist",
    specialty: "Endocrinology" as Specialty,
    img: "/nexura/spec-3.png",
    rating: 4.9,
    reviews: 524,
    langs: "EN · JP",
    tag: "AI-augmented",
    accent: "var(--honey)",
    nextSlot: "Tomorrow 11:00",
  },
  {
    name: "Dr. Aaron Mensah",
    role: "Dermatology",
    specialty: "Dermatology" as Specialty,
    img: "/nexura/spec-4.png",
    rating: 4.9,
    reviews: 268,
    langs: "EN · TW",
    tag: "Available now",
    accent: "var(--clay)",
    nextSlot: "Now",
  },
  {
    name: "Dr. Sofia Ahmadi",
    role: "Pediatrician",
    specialty: "Pediatrics" as Specialty,
    img: "/nexura/spec-2.png",
    rating: 4.9,
    reviews: 389,
    langs: "EN · FA",
    tag: "Loved by families",
    accent: "var(--sage)",
    nextSlot: "Today 16:45",
  },
  {
    name: "Dr. Henry Cole",
    role: "Mental Health",
    specialty: "Mental Health" as Specialty,
    img: "/nexura/spec-1.png",
    rating: 4.8,
    reviews: 502,
    langs: "EN · ES",
    tag: "Warm listener",
    accent: "var(--coral)",
    nextSlot: "Today 18:00",
  },
  {
    name: "Dr. Amara Singh",
    role: "Endocrinologist",
    specialty: "Endocrinology" as Specialty,
    img: "/nexura/spec-3.png",
    rating: 4.9,
    reviews: 271,
    langs: "EN · HI",
    tag: "Hormone specialist",
    accent: "var(--honey)",
    nextSlot: "Tomorrow 08:30",
  },
  {
    name: "Dr. Theo Lindqvist",
    role: "Family Medicine",
    specialty: "Family" as Specialty,
    img: "/nexura/spec-4.png",
    rating: 4.8,
    reviews: 196,
    langs: "EN · SV",
    tag: "New to Nexura",
    accent: "var(--clay)",
    nextSlot: "Today 12:20",
  },
];

const FILTERS: Specialty[] = [
  "All",
  "Cardiology",
  "Family",
  "Endocrinology",
  "Dermatology",
  "Mental Health",
  "Pediatrics",
];

export function Specialists() {
  const [filter, setFilter] = useState<Specialty>("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    return SPECIALISTS.filter((s) => {
      const bySpec = filter === "All" || s.specialty === filter;
      const q = query.trim().toLowerCase();
      const byQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.tag.toLowerCase().includes(q);
      return bySpec && byQuery;
    });
  }, [filter, query]);

  return (
    <section id="specialists" className="relative overflow-hidden py-24 lg:py-32">
      <AuroraBackground variant="sage" className="opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-sage anim-breathe" />
                Care team
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Humans at the{" "}
                <span className="text-gradient-warm">heart of the system.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-4 text-muted-foreground sm:text-lg">
                Every Nexura patient is matched with a dedicated clinician —
                supported, never replaced, by AI.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Controls: search + filter chips */}
        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, role, or trait…"
                className="h-11 rounded-full border-border bg-card pl-10 pr-4"
                aria-label="Search specialists"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => {
                const isActive = filter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    aria-pressed={isActive}
                    className={cn(
                      "relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="spec-filter-pill"
                        className="absolute inset-0 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{f}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Grid with animated transitions */}
        <div className="mt-8 min-h-[20rem]">
          <AnimatePresence mode="popLayout">
            {visible.length > 0 ? (
              <motion.div
                layout
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
              >
                {visible.map((s, i) => (
                  <motion.div
                    key={s.name}
                    layout
                    initial={{ opacity: 0, scale: 0.92, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -8 }}
                    transition={{
                      duration: 0.4,
                      delay: i * 0.04,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <SpecialistCard {...s} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid place-items-center rounded-3xl border border-dashed border-border bg-card/40 py-20 text-center"
              >
                <div>
                  <p className="font-display text-lg font-medium">
                    No clinicians match that just yet.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try a different specialty or clear your search.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 rounded-full"
                    onClick={() => {
                      setFilter("All");
                      setQuery("");
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 flex justify-center">
            <Button variant="outline" className="rounded-full" size="lg">
              Browse all {SPECIALISTS.length * 53}+ specialists
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SpecialistCard({
  name,
  role,
  img,
  rating,
  reviews,
  langs,
  tag,
  accent,
  nextSlot,
  specialty,
}: (typeof SPECIALISTS)[number]) {
  const { openBooking } = useBooking();
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative h-full overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-[0_10px_30px_-18px_oklch(0.4_0.05_45/0.18)]"
    >
      <div className="relative overflow-hidden rounded-2xl">
        <Parallax amount={24} className="aspect-[4/5]">
          <img
            src={img}
            alt={name}
            loading="lazy"
            className="aspect-[4/5] w-full scale-110 object-cover transition-transform duration-700 group-hover:scale-[1.16]"
          />
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.31_0.02_55_0.6)] via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[0.65rem] font-medium text-foreground backdrop-blur">
          {tag}
        </span>
        {/* next slot chip — appears on hover */}
        <div className="absolute right-3 top-3 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[0.6rem] font-medium text-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-sage anim-breathe" />
            {nextSlot}
          </span>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <div className="rounded-xl bg-white/85 px-2.5 py-1 backdrop-blur">
            <p className="font-display text-sm font-semibold">{name}</p>
            <p className="text-[0.7rem] text-muted-foreground">{role}</p>
          </div>
          <span
            className="grid h-9 w-9 place-items-center rounded-full text-white shadow-lg"
            style={{ background: accent }}
          >
            <Verified className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="px-1 pb-1 pt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-honey text-honey" />
            <strong className="text-foreground">{rating}</strong>
            <span>({reviews})</span>
          </span>
          <span className="flex items-center gap-1">
            <Languages className="h-3.5 w-3.5" /> {langs}
          </span>
        </div>
        <button
          onClick={() =>
            openBooking({
              specialist: name,
              specialty: specialty === "All" ? role : specialty,
              reason: `With ${name}`,
            })
          }
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background/60 py-2 text-xs font-medium transition-colors hover:bg-accent/40"
        >
          <Calendar className="h-3.5 w-3.5 text-primary" />
          Book a session
        </button>
      </div>
    </motion.article>
  );
}
