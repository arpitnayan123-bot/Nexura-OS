"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  X, ArrowUpRight, Building2, Stethoscope, Pill, HeartPulse,
  MessageCircle, Sparkles, Globe, BrainCircuit, Clock, TrendingUp,
  Shield, Sprout, FlaskConical, Siren, Activity, Users, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBooking } from "./booking-context";

/* ============================================================
   HAMBURGER MENU — premium navigation drawer (Material Atelier)
   Gold-glass trigger with staggered 3-line mark + live pulse dot.
   Drawer = warm aurora glass wearing the full material spectrum:
   every product row carries its own accent identity, gradient
   hairline, glowing icon chip and staggered spring entrance.
   ============================================================ */

type NavEntry = {
  id: string;
  name: string;
  sub: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  accent2: string;
  href: string;
  badge?: string;
  group: "products" | "actions";
};

const PRODUCTS: NavEntry[] = [
  { id: "hospital", name: "Hospital OS", sub: "Flagship · HMS", desc: "22-module hospital operating system — OPD, IPD, OT, EHR, Nursing, Lab, Radiology, Blood Bank, Billing, Insurance, AI Assistant. ABDM-ready workflows.", icon: Building2, accent: "#A16207", accent2: "#C88A1F", href: "/hospital", badge: "Flagship", group: "products" },
  { id: "predictive", name: "Nexura Predictive", sub: "Health Foresight Engine", desc: "Healthcare is Reactive. But Nexura is Predictive. Twelve disease-risk domains mapped from symptoms, diet, BMI, fitness, sleep and history — calibrated for India.", icon: BrainCircuit, accent: "#6D28D9", accent2: "#8B5CF6", href: "/predictive", badge: "AI 2.0", group: "products" },
  { id: "clinic", name: "Clinic OS", sub: "EMR", desc: "HealthPlix-style EMR with SOAP consultation, drug autocomplete with interaction guard, ABHA lookup (simulated), public booking page.", icon: Stethoscope, accent: "#0F766E", accent2: "#14B8A6", href: "/clinic", badge: "New", group: "products" },
  { id: "pharmacy", name: "Pharmacia", sub: "POS", desc: "AI-powered pharmacy POS with voice billing, prescription OCR, GST e-invoice, Schedule H register, predictive analytics.", icon: Pill, accent: "#3F6C51", accent2: "#5A8F6B", href: "/pharmacy", badge: "New", group: "products" },
  { id: "portal", name: "Patient Portal", sub: "Unified Health", desc: "Unified health record across all products. Blood test at home with phlebotomist visit + AI report interpretation.", icon: HeartPulse, accent: "#A16207", accent2: "#C88A1F", href: "/portal", badge: "New", group: "products" },
  { id: "connect", name: "Nexura Connect", sub: "Communication", desc: "Doctor-patient chat, call coordination & Rx sync across all products.", icon: MessageCircle, accent: "#B45309", accent2: "#F59E0B", href: "/connect", group: "products" },
  { id: "kyh", name: "Know Your Health", sub: "AI Tools", desc: "15 AI tools — symptom checker, derma scan, X-ray reader, diet planner, lab analyzer & more.", icon: Sparkles, accent: "#C2410C", accent2: "#EA580C", href: "/know-your-health", group: "products" },
  { id: "labs", name: "Nexura Labs", sub: "Diagnostics, Decoded", desc: "400+ tests collected at home in 30-minute windows, run in NABL-certified labs, decoded by AI into plain language — reports in 4–12 hours.", icon: FlaskConical, accent: "#0E7490", accent2: "#22D3EE", href: "/labs", badge: "New", group: "products" },
  { id: "global", name: "Nexura Global", sub: "Medical Tourism", desc: "World-class Indian healthcare for global patients. Discovery portal, cost calculator, coordinator dashboard.", icon: Globe, accent: "#1D4ED8", accent2: "#3B82F6", href: "/global", group: "products" },
  { id: "vitals", name: "Nexura Vitals", sub: "Your body, in real time", desc: "Connect the wearables you already own — heart rate, SpO₂, HRV, sleep and stress become one calm, physician-grade picture with trends explained.", icon: Activity, accent: "#BE123C", accent2: "#F43F5E", href: "/vitals", badge: "New", group: "products" },
  { id: "care", name: "Nexura Care Circle", sub: "Family health", desc: "One calm view for the whole family — kids' vaccines, elders' medication adherence, shared insurance, DPDP consent controls. Up to 8 members.", icon: Users, accent: "#9F5B6B", accent2: "#C48B9F", href: "/care", badge: "New", group: "products" },
  { id: "emergency", name: "Nexura Emergency", sub: "Seconds, respected", desc: "Press-and-hold SOS dispatches the nearest ambulance with your medical ID streaming to the crew. Live ER beds, blood-bank availability, offline first-aid.", icon: Siren, accent: "#B91C1C", accent2: "#EF4444", href: "/emergency", badge: "SOS", group: "products" },
  { id: "diy", name: "Nexura DIY", sub: "Free · No sign-in", desc: "Tell it like it is — one chat builds a safe, realistic wellness roadmap with safety screen and honest timeframes.", icon: Sprout, accent: "#4D7C0F", accent2: "#7BB661", href: "/diy", badge: "New", group: "products" },
  { id: "founder", name: "The Founder", sub: "Arpit Nayan", desc: "The story behind Nexura OS — from Bihar to building an operating system for health.", icon: HeartPulse, accent: "#C8A55B", accent2: "#E3C77E", href: "/founder", badge: "Story", group: "products" },
];

const ACTIONS: NavEntry[] = [
  { id: "book", name: "Book Appointment", sub: "Schedule a visit", desc: "Book a doctor appointment", icon: Clock, accent: "#A16207", accent2: "#C88A1F", href: "#book", group: "actions" },
  { id: "symptoms", name: "Check Symptoms", sub: "AI triage", desc: "AI-powered symptom checker", icon: Sparkles, accent: "#C2410C", accent2: "#EA580C", href: "/know-your-health#symptoms-checker", group: "actions" },
  { id: "connect-doc", name: "Chat with Doctor", sub: "Nexura Connect", desc: "Start a conversation", icon: MessageCircle, accent: "#0F766E", accent2: "#14B8A6", href: "/connect/patient", group: "actions" },
  { id: "investors", name: "Investor Deck", sub: "Seed Round", desc: "Vision, market, traction, ask", icon: TrendingUp, accent: "#6D28D9", accent2: "#8B5CF6", href: "/investors", group: "actions" },
  { id: "pricing", name: "Pricing", sub: "SaaS Plans", desc: "Transparent pricing in INR", icon: TrendingUp, accent: "#B45309", accent2: "#F59E0B", href: "/pricing", group: "actions" },
  { id: "compliance", name: "Compliance", sub: "Regulatory", desc: "ABDM, DPDP, NABH, CDSCO, IRDAI", icon: Shield, accent: "#3F6C51", accent2: "#5A8F6B", href: "/compliance", group: "actions" },
];

/* staggered spring entrance — critically damped, Apple-style */
const productsList: Variants = {
  open: { transition: { staggerChildren: 0.022, delayChildren: 0.16 } },
};
const actionsList: Variants = {
  open: { transition: { staggerChildren: 0.03, delayChildren: 0.52 } },
};
const rowVariants: Variants = {
  closed: { opacity: 0, x: 26 },
  open: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", damping: 30, stiffness: 420, mass: 0.7 },
  },
};

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { openBooking } = useBooking();

  // Focus the close button when the drawer opens (a11y)
  useEffect(() => {
    if (open) setTimeout(() => closeRef.current?.focus(), 80);
  }, [open]);

  // Escape to close + body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSelect = useCallback((item: NavEntry) => {
    setOpen(false);
    if (item.href === "#book") {
      setTimeout(() => openBooking(), 120);
    } else if (!item.href.startsWith("#")) {
      setTimeout(() => { window.location.href = item.href; }, 120);
    }
  }, [openBooking]);

  return (
    <>
      {/* Trigger — gold-glass disc, staggered 3-line mark, live pulse dot */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu: all Nexura products"
        aria-expanded={open}
        className="menu-trigger"
      >
        <span className="menu-trigger__dot" aria-hidden />
        <span className="menu-lines" aria-hidden>
          <span className="menu-line menu-line--1" />
          <span className="menu-line menu-line--2" />
          <span className="menu-line menu-line--3" />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Nexura OS menu">
            {/* Scrim — warm dim + blur */}
            <motion.button
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-[rgba(46,32,12,0.45)] backdrop-blur-md"
            />

            {/* Drawer — aurora glass over mineral grain, anchored RIGHT (same side as the trigger) */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 330 }}
              className="menu-drawer absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col rounded-l-[1.75rem] border-l border-[#C88A1F]/25 shadow-[-36px_0_90px_-36px_rgba(60,40,10,0.5)]"
            >
              {/* Header */}
              <div className="relative flex items-center justify-between gap-3 border-b border-[#C88A1F]/15 px-5 py-4">
                <div className="flex items-center gap-3">
                  {/* brand mark — liquid gold tile */}
                  <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#C88A1F] via-[#A16207] to-[#7A4A05] shadow-[0_10px_20px_-10px_rgba(161,98,7,0.8)] ring-1 ring-white/30">
                    <Activity className="h-4.5 w-4.5 text-white" strokeWidth={2.6} />
                    <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/25 to-transparent opacity-70" />
                  </span>
                  <div>
                    <p className="font-display text-base font-semibold tracking-tight">
                      Nexura<span className="text-primary"> OS</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
                      Everything in one place
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#C88A1F]/25 bg-white/50 px-1.5 py-px text-[0.5rem] font-semibold tracking-normal text-[#8a6510] dark:bg-white/5 dark:text-[#E3C77E]">
                        <span className="h-1 w-1 rounded-full bg-[#C88A1F] anim-breathe" />
                        live
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  ref={closeRef}
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="group grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#C88A1F]/25 bg-white/50 text-muted-foreground shadow-sm transition-all hover:border-[#C88A1F]/55 hover:text-foreground hover:shadow-[0_8px_18px_-8px_rgba(161,98,7,0.55)] dark:bg-white/5"
                >
                  <X className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                </button>
              </div>

              {/* Body */}
              <div className="menu-scroll relative flex-1 overflow-y-auto px-3 py-4">
                <p className="flex items-center gap-2 px-2 pb-2 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                  Products
                  <span className="h-px flex-1 bg-gradient-to-r from-[#C88A1F]/30 to-transparent" />
                  <span className="rounded-full bg-[#A16207]/10 px-1.5 py-0.5 text-[0.5rem] tracking-normal text-[#8a6510] dark:text-[#E3C77E]">14</span>
                </p>
                <motion.div
                  variants={productsList}
                  initial="closed"
                  animate="open"
                  className="space-y-1"
                >
                  {PRODUCTS.map((item) => (
                    <MenuRow key={item.id} item={item} onSelect={() => handleSelect(item)} />
                  ))}
                </motion.div>

                <p className="flex items-center gap-2 px-2 pb-2 pt-5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                  Quick Actions
                  <span className="h-px flex-1 bg-gradient-to-r from-[#0F766E]/30 to-transparent" />
                  <span className="rounded-full bg-[#0F766E]/10 px-1.5 py-0.5 text-[0.5rem] tracking-normal text-[#0F766E] dark:text-[#2DD4BF]">6</span>
                </p>
                <motion.div
                  variants={actionsList}
                  initial="closed"
                  animate="open"
                  className="space-y-1"
                >
                  {ACTIONS.map((item) => (
                    <MenuRow key={item.id} item={item} compact onSelect={() => handleSelect(item)} />
                  ))}
                </motion.div>
              </div>

              {/* Footer — trust line + compliance chips */}
              <div className="relative border-t border-[#C88A1F]/15 bg-white/45 px-5 py-3.5 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.6rem] leading-relaxed text-muted-foreground">
                    Healthcare is reactive.{" "}
                    <span className="font-semibold text-foreground">But Nexura is Predictive.</span>
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    {[
                      { label: "ABDM", color: "#A16207" },
                      { label: "DPDP", color: "#6D28D9" },
                      { label: "NABH", color: "#0E7490" },
                    ].map((c) => (
                      <span
                        key={c.label}
                        className="flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-1.5 py-0.5 text-[0.48rem] font-semibold tracking-wide text-muted-foreground"
                      >
                        <span className="h-1 w-1 rounded-full" style={{ background: c.color }} />
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- Drawer row — per-product material identity ---------- */
function MenuRow({
  item, compact, onSelect,
}: { item: NavEntry; compact?: boolean; onSelect: () => void }) {
  const Icon = item.icon;
  const isPredictive = item.id === "predictive";
  return (
    <motion.div variants={rowVariants}>
      <Link
        href={item.href}
        onClick={(e) => {
          if (item.href === "#book") {
            e.preventDefault();
          }
          onSelect();
        }}
        className={cn(
          "menu-row group flex items-start gap-3 rounded-xl px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C88A1F]/45",
          isPredictive && "bg-violet-500/[0.06] ring-1 ring-violet-500/25"
        )}
        style={{ "--row-accent": item.accent, "--row-accent-2": item.accent2 } as React.CSSProperties}
      >
        <span
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white transition-transform duration-300 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${item.accent2}, ${item.accent} 62%, color-mix(in srgb, ${item.accent} 70%, black))`,
            boxShadow: `0 6px 14px -6px color-mix(in srgb, ${item.accent} 70%, transparent), 0 0 12px -4px color-mix(in srgb, ${item.accent} 50%, transparent), inset 0 1px 0 rgba(255,255,255,0.45)`,
          }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{item.name}</span>
            {item.badge && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[0.45rem] font-bold uppercase tracking-wider text-white"
                style={{
                  background: `linear-gradient(135deg, ${item.accent2}, ${item.accent})`,
                  boxShadow: `0 2px 6px -2px color-mix(in srgb, ${item.accent} 65%, transparent)`,
                }}
              >
                {item.badge}
              </span>
            )}
            {isPredictive && (
              <span className="relative ml-auto flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
              </span>
            )}
          </span>
          <span className="block text-[0.6rem] font-medium uppercase tracking-wider text-muted-foreground/70">
            {item.sub}
          </span>
          {!compact && (
            <span className="mt-1 block text-[0.65rem] leading-relaxed text-muted-foreground line-clamp-2">
              {item.desc}
            </span>
          )}
        </span>
        <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--row-accent)]" />
      </Link>
    </motion.div>
  );
}
