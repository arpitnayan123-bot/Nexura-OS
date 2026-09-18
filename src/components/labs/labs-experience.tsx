"use client";

/* ============================================================
   NEXURA LABS — "Diagnostics, Decoded."
   ------------------------------------------------------------
   Premium at-home diagnostics experience in the Liquid Gold 2.0
   language: aurora-gold ambience, display typography, magnetic
   CTAs, spotlight cards and a live interactive catalog with
   cart, slot booking and an AI-decoded report preview.

   Client-rendered, reduced-motion safe, keyboard accessible.
   ============================================================ */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Home,
  Clock3,
  BadgeCheck,
  Search,
  Plus,
  Check,
  ShoppingCart,
  CalendarCheck,
  FileHeart,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  MapPin,
  Activity,
} from "lucide-react";
import {
  Eyebrow,
  SectionHeading,
  LuxButton,
  Ornament,
  Counter,
  StaggerGroup,
  StaggerItem,
  SpotlightCard,
  Magnetic,
  TextReveal,
  ScrollProgress,
} from "@/components/premium/kit";
import {
  LAB_TESTS,
  CATEGORIES,
  PANELS,
  STEPS,
  SLOT_DAYS,
  SLOT_TIMES,
  MOCK_REPORT,
  type LabTest,
} from "./data";

/* ---------- hero ---------- */

function Hero({ onBrowse }: { onBrowse: () => void }) {
  return (
    <header className="relative overflow-hidden px-6 pt-36 pb-20 sm:pt-44 sm:pb-28">
      <div className="aurora-gold" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Eyebrow>Nexura Labs · At-home diagnostics</Eyebrow>
        </motion.div>

        <h1 className="display-xl mt-6 text-balance">
          <TextReveal text="Your blood," />
          <br />
          <span className="text-gold-gradient">
            <TextReveal text="decoded in six hours." />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#C9BFAE]"
        >
          400+ tests from NABL-certified labs, collected at your door by certified phlebotomists —
          and read by an AI that turns raw ranges into plain language. No queues, no plastic tokens,
          no mystery PDFs.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Magnetic>
            <LuxButton onClick={onBrowse}>
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span>Build my test cart</span>
            </LuxButton>
          </Magnetic>
          <Link
            href="#how-labs-works"
            className="group inline-flex items-center gap-2 rounded-full border border-[#3A3428] px-6 py-3 text-sm font-medium text-[#E8DFCB] transition-colors hover:border-[#A16207] hover:text-[#F5EDD8]"
          >
            How collection works
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#9C927E]"
          aria-label="Trust markers"
        >
          <li className="inline-flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-[#C8A55B]" aria-hidden="true" /> NABL-certified
            partner labs
          </li>
          <li className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#C8A55B]" aria-hidden="true" /> Reports in 4–12 hours
          </li>
          <li className="inline-flex items-center gap-2">
            <Home className="h-4 w-4 text-[#C8A55B]" aria-hidden="true" /> Free home collection · 50
            cities
          </li>
          <li className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#C8A55B]" aria-hidden="true" /> DPDP-compliant
            records
          </li>
        </motion.ul>
      </div>
    </header>
  );
}

/* ---------- stat strip ---------- */

function StatStrip() {
  const stats = [
    { value: 400, suffix: "+", label: "Tests on catalog" },
    { value: 6, suffix: " hrs", label: "Median report time" },
    { value: 50, suffix: "", label: "Cities served" },
    { value: 99.2, suffix: "%", label: "On-time collections", decimals: 1 },
  ];
  return (
    <section className="relative px-6 py-10" aria-label="Labs at a glance">
      <StaggerGroup className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <StaggerItem key={s.label}>
            <div className="spotlight-card rounded-2xl border border-[#2E2A20] bg-[#191611]/80 p-6 text-center">
              <div className="font-serif text-3xl font-semibold tabular-nums text-[#F5EDD8] sm:text-4xl">
                <Counter
                  to={s.value}
                  suffix={s.suffix}
                  decimals={"decimals" in s ? s.decimals : 0}
                />
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.14em] text-[#9C927E]">
                {s.label}
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

/* ---------- popular panels ---------- */

function Panels() {
  return (
    <section className="relative px-6 py-20 sm:py-24" aria-labelledby="panels-heading">
      <SectionHeading
        eyebrow="Curated panels"
        title={
          <span id="panels-heading">
            One draw. <em className="text-gold-gradient not-italic">The whole picture.</em>
          </span>
        }
        lede="Panels designed by physicians for Indian risk profiles — no filler tests, no upsell noise. Every panel includes AI interpretation."
      />
      <StaggerGroup className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
        {PANELS.map((p) => (
          <StaggerItem key={p.id}>
            <SpotlightCard className="group flex h-full flex-col rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7 transition-colors hover:border-[#A16207]/60">
              <div className="flex items-start justify-between gap-3">
                <FlaskConical className="h-6 w-6 text-[#C8A55B]" aria-hidden="true" />
                <span className="rounded-full border border-[#3A3428] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#C8A55B]">
                  {p.flag}
                </span>
              </div>
              <h3 className="mt-5 font-serif text-2xl font-semibold text-[#F5EDD8]">{p.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#B3A892]">{p.tagline}</p>
              <ul className="mt-5 space-y-1.5" aria-label={`${p.name} includes`}>
                {p.includes.slice(0, 4).map((inc) => (
                  <li
                    key={inc}
                    className="inline-flex items-center gap-2 text-[13px] text-[#C9BFAE]"
                  >
                    <Check className="h-3.5 w-3.5 text-[#A16207]" aria-hidden="true" /> {inc}
                  </li>
                ))}
                {p.includes.length > 4 && (
                  <li className="inline-flex items-center gap-2 text-[13px] text-[#8A8070]">
                    + {p.includes.length - 4} more
                  </li>
                )}
              </ul>
              <div className="mt-6 flex items-end justify-between border-t border-[#2E2A20] pt-5">
                <div>
                  <div className="text-xs text-[#8A8070]">{p.tests} biomarkers</div>
                  <div className="mt-1 font-serif text-2xl font-semibold tabular-nums text-[#F5EDD8]">
                    ₹{p.price.toLocaleString("en-IN")}{" "}
                    <span className="text-sm font-normal text-[#6E6654] line-through">
                      ₹{p.mrp.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <Magnetic strength={0.25}>
                  <Link
                    href="#catalog"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#D9B87C] to-[#A16207] px-5 py-2.5 text-sm font-semibold text-[#221B08] shadow-[0_8px_24px_-8px_rgba(161,98,7,0.5)] transition-transform hover:scale-[1.03]"
                    aria-label={`Book ${p.name} panel`}
                  >
                    Book panel
                  </Link>
                </Magnetic>
              </div>
            </SpotlightCard>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

/* ---------- interactive catalog + cart ---------- */

function TestCatalog({
  cart,
  toggle,
  catalogRef,
}: {
  cart: Set<string>;
  toggle: (t: LabTest) => void;
  catalogRef: React.RefObject<HTMLElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const results = useMemo(() => {
    return LAB_TESTS.filter((t) => {
      const matchesCat = cat === "All" || t.category === cat;
      const matchesQuery =
        query.trim() === "" || t.name.toLowerCase().includes(query.trim().toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [query, cat]);

  const cartTotal = LAB_TESTS.filter((t) => cart.has(t.id)).reduce((sum, t) => sum + t.price, 0);

  return (
    <section
      id="catalog"
      ref={catalogRef}
      className="relative scroll-mt-24 px-6 py-20 sm:py-24"
      aria-labelledby="catalog-heading"
    >
      <SectionHeading
        eyebrow="Build your own"
        title={
          <span id="catalog-heading">
            Pick tests. <em className="text-gold-gradient not-italic">We handle the rest.</em>
          </span>
        }
        lede="Search 400+ tests, add to your cart, and book one collection for everything. Prices are what you pay — home collection always included."
      />

      <div className="mx-auto mt-12 max-w-4xl">
        {/* search */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8070]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tests — try “thyroid”, “sugar”, “vitamin”…"
            aria-label="Search lab tests"
            className="w-full rounded-full border border-[#2E2A20] bg-[#191611] py-4 pl-12 pr-5 text-[15px] text-[#F5EDD8] placeholder:text-[#6E6654] outline-none transition-colors focus:border-[#A16207]"
          />
        </div>

        {/* category chips */}
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all ${
                cat === c
                  ? "bg-gradient-to-b from-[#D9B87C] to-[#A16207] text-[#221B08] shadow-[0_6px_18px_-6px_rgba(161,98,7,0.5)]"
                  : "border border-[#2E2A20] text-[#B3A892] hover:border-[#A16207]/60 hover:text-[#E8DFCB]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* results */}
        <ul
          className="mt-6 divide-y divide-[#241F16] overflow-hidden rounded-3xl border border-[#2E2A20] bg-[#15120C]/70"
          aria-label="Test results"
        >
          {results.length === 0 && (
            <li className="px-6 py-12 text-center text-sm text-[#8A8070]">
              No tests match “{query}”. Try a broader term — or ask Connect to locate it for you.
            </li>
          )}
          {results.map((t) => {
            const inCart = cart.has(t.id);
            return (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-[#1D1912]/80 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[15px] font-medium text-[#EFE7D3]">
                      {t.name}
                    </span>
                    {t.popular && (
                      <span className="rounded-full bg-[#A16207]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#D9B87C]">
                        Popular
                      </span>
                    )}
                    {t.fasting && (
                      <span className="rounded-full border border-[#3A3428] px-2 py-0.5 text-[10px] text-[#9C927E]">
                        Fasting
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#8A8070]">
                    <span>{t.category}</span>
                    <span>· {t.sample} sample</span>
                    <span>· Report in {t.reportsIn}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-lg font-semibold tabular-nums text-[#F5EDD8]">
                    ₹{t.price}
                  </div>
                  <div className="text-xs text-[#6E6654] line-through">₹{t.mrp}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  aria-pressed={inCart}
                  aria-label={inCart ? `Remove ${t.name} from cart` : `Add ${t.name} to cart`}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                    inCart
                      ? "border-[#A16207] bg-[#A16207]/20 text-[#D9B87C]"
                      : "border-[#3A3428] text-[#B3A892] hover:border-[#A16207]/70 hover:text-[#F5EDD8]"
                  }`}
                >
                  {inCart ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* cart bar */}
        <AnimatePresence>
          {cart.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              className="sticky bottom-6 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#A16207]/40 bg-[#1D1810]/95 px-6 py-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur"
              aria-live="polite"
            >
              <div className="flex items-center gap-3 text-sm text-[#C9BFAE]">
                <ShoppingCart className="h-4 w-4 text-[#C8A55B]" aria-hidden="true" />
                <span>
                  <strong className="tabular-nums text-[#F5EDD8]">{cart.size}</strong> test
                  {cart.size > 1 ? "s" : ""} in cart
                </span>
                <span className="text-[#5E5748]">·</span>
                <span className="font-serif text-xl font-semibold tabular-nums text-[#F5EDD8]">
                  ₹{cartTotal.toLocaleString("en-IN")}
                </span>
              </div>
              <a
                href="#book-collection"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#D9B87C] to-[#A16207] px-6 py-2.5 text-sm font-semibold text-[#221B08] shadow-[0_8px_24px_-8px_rgba(161,98,7,0.5)] transition-transform hover:scale-[1.03]"
              >
                Choose collection slot
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */

function HowItWorks() {
  return (
    <section
      id="how-labs-works"
      className="relative scroll-mt-24 px-6 py-20 sm:py-24"
      aria-labelledby="how-heading"
    >
      <Ornament className="mx-auto mb-10" />
      <SectionHeading
        eyebrow="The collection, choreographed"
        title={
          <span id="how-heading">
            From doorbell to <em className="text-gold-gradient not-italic">decoded report.</em>
          </span>
        }
      />
      <StaggerGroup className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <StaggerItem key={s.step}>
            <div className="relative h-full rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
              <div className="font-serif text-4xl font-semibold text-[#A16207]/40">{s.step}</div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[#F5EDD8]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#B3A892]">{s.body}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight
                  className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-[#A16207]/50 lg:block"
                  aria-hidden="true"
                />
              )}
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

/* ---------- slot booking demo ---------- */

function BookingDemo() {
  const [day, setDay] = useState(SLOT_DAYS[1]);
  const [time, setTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const cartCount = 0; // demo showcase

  return (
    <section
      id="book-collection"
      className="relative scroll-mt-24 px-6 py-20 sm:py-24"
      aria-labelledby="book-heading"
    >
      <SectionHeading
        eyebrow="Try it now"
        title={
          <span id="book-heading">
            Lock a <em className="text-gold-gradient not-italic">30-minute window.</em>
          </span>
        }
        lede="Morning fasting or evening after work — the slot grid adapts. This is a live demo; production books a verified phlebotomist to your pin code."
      />
      <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7 sm:p-9">
        {!confirmed ? (
          <>
            <div className="flex items-center gap-2 text-sm text-[#9C927E]">
              <MapPin className="h-4 w-4 text-[#C8A55B]" aria-hidden="true" />
              Indiranagar, Bengaluru — free collection
            </div>
            <div className="mt-5" role="group" aria-label="Choose day">
              <div className="text-xs uppercase tracking-[0.14em] text-[#8A8070]">Day</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SLOT_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    aria-pressed={day === d}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                      day === d
                        ? "border border-[#A16207] bg-[#A16207]/15 text-[#F5EDD8]"
                        : "border border-[#2E2A20] text-[#B3A892] hover:border-[#A16207]/50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6" role="group" aria-label="Choose time window">
              <div className="text-xs uppercase tracking-[0.14em] text-[#8A8070]">Window</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SLOT_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    aria-pressed={time === t}
                    className={`rounded-xl px-4 py-2.5 text-sm tabular-nums transition-all ${
                      time === t
                        ? "border border-[#A16207] bg-[#A16207]/15 text-[#F5EDD8]"
                        : "border border-[#2E2A20] text-[#B3A892] hover:border-[#A16207]/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-[#8A8070]">
                {cartCount > 0
                  ? `${cartCount} test${cartCount > 1 ? "s" : ""} will be collected in one visit.`
                  : "Demo booking — add tests from the catalog above in the full flow."}
              </p>
              <button
                type="button"
                disabled={!time}
                onClick={() => setConfirmed(true)}
                className={`inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold transition-all ${
                  time
                    ? "bg-gradient-to-b from-[#D9B87C] to-[#A16207] text-[#221B08] shadow-[0_8px_24px_-8px_rgba(161,98,7,0.5)] hover:scale-[1.03]"
                    : "cursor-not-allowed bg-[#241F16] text-[#6E6654]"
                }`}
              >
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Confirm collection
              </button>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-6 text-center"
            role="status"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#A16207]/50 bg-[#A16207]/15">
              <Check className="h-7 w-7 text-[#D9B87C]" aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-serif text-2xl font-semibold text-[#F5EDD8]">
              Collection locked.
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#B3A892]">
              {day}, {time} — a verified phlebotomist will arrive at Indiranagar. You{"'"}ll get
              their name, photo and live ETA 30 minutes before arrival.
            </p>
            <button
              type="button"
              onClick={() => {
                setConfirmed(false);
                setTime(null);
              }}
              className="mt-6 text-sm text-[#C8A55B] underline-offset-4 hover:underline"
            >
              Reset demo
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ---------- AI-decoded report preview ---------- */

const STATUS_META = {
  in: {
    label: "In range",
    cls: "text-[#8FBF8F]",
    dot: "bg-[#8FBF8F]",
    ring: "border-[#8FBF8F]/40",
  },
  watch: {
    label: "Watch",
    cls: "text-[#E3C578]",
    dot: "bg-[#E3C578]",
    ring: "border-[#E3C578]/40",
  },
  out: { label: "Action", cls: "text-[#E58F7A]", dot: "bg-[#E58F7A]", ring: "border-[#E58F7A]/40" },
} as const;

function ReportPreview() {
  return (
    <section className="relative px-6 py-20 sm:py-24" aria-labelledby="report-heading">
      <SectionHeading
        eyebrow="Reports, humanized"
        title={
          <span id="report-heading">
            Not a PDF of numbers. <em className="text-gold-gradient not-italic">A conversation.</em>
          </span>
        }
        lede="Every report arrives decoded — plain-language notes per biomarker, trend arrows against your history, and a doctor-ready summary you can share to Connect in one tap."
      />
      <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-3xl border border-[#2E2A20] bg-[#191611]/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2E2A20] px-7 py-5">
          <div className="flex items-center gap-3">
            <FileHeart className="h-5 w-5 text-[#C8A55B]" aria-hidden="true" />
            <div>
              <div className="font-serif text-lg font-semibold text-[#F5EDD8]">
                Full Body Gold — decoded
              </div>
              <div className="text-xs text-[#8A8070]">
                Sample report · Collected 07:12 · Ready in 5h 48m
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3A3428] px-3 py-1 text-xs text-[#C8A55B]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI interpretation
          </span>
        </div>
        <StaggerGroup className="divide-y divide-[#241F16]">
          {MOCK_REPORT.map((b) => {
            const meta = STATUS_META[b.status];
            return (
              <StaggerItem key={b.name}>
                <div className="grid gap-3 px-7 py-5 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${meta.dot}`}
                        aria-hidden="true"
                      />
                      <span className="text-[15px] font-medium text-[#EFE7D3]">{b.name}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.ring} ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#B3A892]">{b.note}</p>
                  </div>
                  <div className="text-right sm:min-w-[170px]">
                    <div className="font-serif text-xl font-semibold tabular-nums text-[#F5EDD8]">
                      {b.value} <span className="text-xs font-normal text-[#8A8070]">{b.unit}</span>
                    </div>
                    <div className="text-xs tabular-nums text-[#6E6654]">Ref: {b.range}</div>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2E2A20] bg-[#15120C]/70 px-7 py-4">
          <p className="inline-flex items-center gap-2 text-xs text-[#8A8070]">
            <Activity className="h-3.5 w-3.5 text-[#C8A55B]" aria-hidden="true" />
            Trending vs your last 3 reports — 2 markers improved, 1 needs attention.
          </p>
          <a
            href="#catalog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C8A55B] underline-offset-4 hover:underline"
          >
            Discuss in Connect
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-2xl px-6 text-center text-xs leading-relaxed text-[#6E6654]">
        AI interpretation is decision support, not a diagnosis. Reports are validated by
        NABL-certified pathologists; always consult your physician before acting on results.
      </p>
    </section>
  );
}

/* ---------- finale ---------- */

function Finale() {
  return (
    <section className="relative px-6 py-24 text-center sm:py-32">
      <div className="aurora-gold opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl">
        <Ornament className="mx-auto mb-8" />
        <h2 className="display-lg text-balance text-[#F5EDD8]">
          Your annual screen is{" "}
          <em className="text-gold-gradient not-italic">one doorbell away.</em>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[#B3A892]">
          Book tonight, collect tomorrow at 7 AM, and read a decoded report over breakfast. That is
          what diagnostics should feel like.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <LuxButton>
              <Link href="#book-collection" className="inline-flex items-center gap-2">
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>Book home collection</span>
              </Link>
            </LuxButton>
          </Magnetic>
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#C8A55B] underline-offset-4 hover:underline"
          >
            View reports in Patient Portal
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- root ---------- */

export function LabsExperience() {
  const [cart, setCart] = useState<Set<string>>(new Set());
  const catalogRef = useRef<HTMLElement | null>(null);

  const toggle = (t: LabTest) => {
    setCart((prev) => {
      const next = new Set(prev);
      if (next.has(t.id)) next.delete(t.id);
      else next.add(t.id);
      return next;
    });
  };

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="nxl-root relative min-h-dvh bg-[#141210] text-[#EFE7D3]">
      <ScrollProgress />
      <Hero onBrowse={scrollToCatalog} />
      <StatStrip />
      <Panels />
      <TestCatalog cart={cart} toggle={toggle} catalogRef={catalogRef} />
      <HowItWorks />
      <BookingDemo />
      <ReportPreview />
      <Finale />
      <footer className="border-t border-[#241F16] px-6 py-10 text-center text-xs text-[#6E6654]">
        Nexura Labs — diagnostics, decoded. NABL partner network · DPDP compliant · A product of
        Nexura OS
      </footer>
    </div>
  );
}
