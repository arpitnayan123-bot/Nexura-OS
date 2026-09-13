"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, ArrowUpRight, Building2, Stethoscope, Pill, HeartPulse,
  MessageCircle, Sparkles, Globe, BrainCircuit, Clock, TrendingUp,
  Shield, Sprout, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBooking } from "./booking-context";

/* ============================================================
   HAMBURGER MENU — full ecosystem navigation drawer
   Every product (incl. Nexura Predictive) + quick actions,
   reachable from one menu on every breakpoint.
   ============================================================ */

type NavEntry = {
  id: string;
  name: string;
  sub: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  href: string;
  badge?: string;
  group: "products" | "actions";
};

const PRODUCTS: NavEntry[] = [
  { id: "hospital", name: "Hospital OS", sub: "Flagship · HMS", desc: "22-module hospital operating system — OPD, IPD, OT, EHR, Nursing, Lab, Radiology, Blood Bank, Billing, Insurance, AI Assistant. ABDM-ready workflows.", icon: Building2, accent: "#A16207", href: "/hospital", badge: "Flagship", group: "products" },
  { id: "predictive", name: "Nexura Predictive", sub: "Health Foresight Engine", desc: "Healthcare is Reactive. But Nexura is Predictive. Twelve disease-risk domains mapped from symptoms, diet, BMI, fitness, sleep and history — calibrated for India.", icon: BrainCircuit, accent: "#A16207", href: "/predictive", badge: "AI 2.0", group: "products" },
  { id: "clinic", name: "Clinic OS", sub: "EMR", desc: "HealthPlix-style EMR with SOAP consultation, drug autocomplete with interaction guard, ABHA lookup (simulated), public booking page.", icon: Stethoscope, accent: "#A16207", href: "/clinic", badge: "New", group: "products" },
  { id: "pharmacy", name: "Pharmacia", sub: "POS", desc: "AI-powered pharmacy POS with voice billing, prescription OCR, GST e-invoice, Schedule H register, predictive analytics.", icon: Pill, accent: "#A16207", href: "/pharmacy", badge: "New", group: "products" },
  { id: "portal", name: "Patient Portal", sub: "Unified Health", desc: "Unified health record across all products. Blood test at home with phlebotomist visit + AI report interpretation.", icon: HeartPulse, accent: "#A16207", href: "/portal", badge: "New", group: "products" },
  { id: "connect", name: "Nexura Connect", sub: "Communication", desc: "Doctor-patient chat, call coordination & Rx sync across all products.", icon: MessageCircle, accent: "#A16207", href: "/connect", group: "products" },
  { id: "kyh", name: "Know Your Health", sub: "AI Tools", desc: "15 AI tools — symptom checker, derma scan, X-ray reader, diet planner, lab analyzer & more.", icon: Sparkles, accent: "#A16207", href: "/know-your-health", group: "products" },
  { id: "global", name: "Nexura Global", sub: "Medical Tourism", desc: "World-class Indian healthcare for global patients. Discovery portal, cost calculator, coordinator dashboard.", icon: Globe, accent: "#A16207", href: "/global", group: "products" },
  { id: "diy", name: "Nexura DIY", sub: "Free · No sign-in", desc: "Tell it like it is — one chat builds a safe, realistic wellness roadmap with safety screen and honest timeframes.", icon: Sprout, accent: "#A16207", href: "/diy", badge: "New", group: "products" },
  { id: "founder", name: "The Founder", sub: "Arpit Nayan", desc: "The story behind Nexura OS — from Bihar to building an operating system for health.", icon: HeartPulse, accent: "#C8A55B", href: "/founder", badge: "Story", group: "products" },
];

const ACTIONS: NavEntry[] = [
  { id: "book", name: "Book Appointment", sub: "Schedule a visit", desc: "Book a doctor appointment", icon: Clock, accent: "#A16207", href: "#book", group: "actions" },
  { id: "symptoms", name: "Check Symptoms", sub: "AI triage", desc: "AI-powered symptom checker", icon: Sparkles, accent: "#A16207", href: "/know-your-health#symptoms-checker", group: "actions" },
  { id: "connect-doc", name: "Chat with Doctor", sub: "Nexura Connect", desc: "Start a conversation", icon: MessageCircle, accent: "#A16207", href: "/connect/patient", group: "actions" },
  { id: "investors", name: "Investor Deck", sub: "Seed Round", desc: "Vision, market, traction, ask", icon: TrendingUp, accent: "#A16207", href: "/investors", group: "actions" },
  { id: "pricing", name: "Pricing", sub: "SaaS Plans", desc: "Transparent pricing in INR", icon: TrendingUp, accent: "#A16207", href: "/pricing", group: "actions" },
  { id: "compliance", name: "Compliance", sub: "Regulatory", desc: "ABDM, DPDP, NABH, CDSCO, IRDAI", icon: Shield, accent: "#A16207", href: "/compliance", group: "actions" },
];

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
      {/* Trigger — visible on every breakpoint */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu: all Nexura products"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        <Menu className="h-5 w-5" strokeWidth={2.2} />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Nexura OS menu">
            {/* Scrim */}
            <motion.button
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-black/40 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="font-display text-base font-semibold tracking-tight">
                    Nexura<span className="text-primary"> OS</span>
                  </p>
                  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                    Menu · everything in one place
                  </p>
                </div>
                <button
                  ref={closeRef}
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <p className="px-2 pb-2 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                  Products
                </p>
                <div className="space-y-1">
                  {PRODUCTS.map((item) => (
                    <MenuRow key={item.id} item={item} onSelect={() => handleSelect(item)} />
                  ))}
                </div>

                <p className="px-2 pb-2 pt-5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                  Quick Actions
                </p>
                <div className="space-y-1">
                  {ACTIONS.map((item) => (
                    <MenuRow key={item.id} item={item} compact onSelect={() => handleSelect(item)} />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border bg-muted/30 px-5 py-3">
                <p className="text-[0.6rem] leading-relaxed text-muted-foreground">
                  Healthcare is reactive. <span className="font-semibold text-foreground">But Nexura is Predictive.</span>
                </p>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- Drawer row ---------- */
function MenuRow({
  item, compact, onSelect,
}: { item: NavEntry; compact?: boolean; onSelect: () => void }) {
  const Icon = item.icon;
  const isPredictive = item.id === "predictive";
  return (
    <Link
      href={item.href}
      onClick={(e) => {
        if (item.href === "#book") {
          e.preventDefault();
        }
        onSelect();
      }}
      className={cn(
        "group flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-accent/50",
        isPredictive && "bg-violet-500/[0.07] ring-1 ring-violet-500/20 hover:bg-violet-500/[0.12]"
      )}
    >
      <span
        className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white shadow-sm"
        style={{ background: `linear-gradient(135deg, ${item.accent}, color-mix(in srgb, ${item.accent} 65%, #000))` }}
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{item.name}</span>
          {item.badge && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[0.45rem] font-bold uppercase tracking-wider text-white"
              style={{ background: item.accent }}
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
      <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
