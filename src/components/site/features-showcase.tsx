"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import {
  Building2, Stethoscope, Pill, HeartPulse, MessageCircle,
  Sparkles, Globe, Clock, TrendingUp, Shield, BrainCircuit, Sprout,
  ArrowUpRight, FlaskConical, Siren, Activity, type LucideIcon,
} from "lucide-react";
import { useBooking } from "./booking-context";
import { Counter, SpotlightCard } from "@/components/premium/kit";

/* ============================================================
   FEATURES SHOWCASE — All menu items displayed on homepage
   Premium grid with grouped sections (Products + Quick Actions)
   ============================================================ */

type Feature = {
  id: string;
  name: string;
  sub: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  href: string;
  badge?: string;
  isAction?: boolean;
  action?: string;
};

const PRODUCTS: Feature[] = [
  { id: "hospital", name: "Hospital OS", sub: "HMS", desc: "22-module hospital operating system — OPD, IPD, OT, EHR, Nursing, Lab, Radiology, Blood Bank, Billing, Insurance, AI Assistant. ABDM-ready with NABH-aligned workflows.", icon: Building2, accent: "#A16207", href: "/hospital", badge: "Flagship" },
  { id: "predictive", name: "Nexura Predictive", sub: "Health Foresight Engine", desc: "Healthcare is Reactive. But Nexura is Predictive. Maps twelve disease-risk domains from symptoms, diet, BMI, fitness, sleep and history — calibrated for Indian bodies, explainable by design.", icon: BrainCircuit, accent: "#A16207", href: "/predictive", badge: "AI 2.0" },
  { id: "clinic", name: "Clinic OS", sub: "EMR", desc: "HealthPlix-style EMR with SOAP consultation, drug autocomplete with interaction guard, ABHA lookup (simulated), public booking page.", icon: Stethoscope, accent: "#A16207", href: "/clinic", badge: "New" },
  { id: "pharmacy", name: "Pharmacia", sub: "POS", desc: "AI-powered pharmacy POS with voice billing, prescription OCR, GST e-invoice, Schedule H register, predictive analytics.", icon: Pill, accent: "#A16207", href: "/pharmacy", badge: "New" },
  { id: "portal", name: "Patient Portal", sub: "Unified Health", desc: "Unified health record across all products. Blood test at home with phlebotomist visit + AI report interpretation.", icon: HeartPulse, accent: "#A16207", href: "/portal", badge: "New" },
  { id: "connect", name: "Nexura Connect", sub: "Communication", desc: "Doctor-patient chat, call coordination & Rx sync across all products.", icon: MessageCircle, accent: "#A16207", href: "/connect" },
  { id: "kyh", name: "Know Your Health", sub: "AI Tools", desc: "15 AI tools — symptom checker, derma scan, X-ray reader, diet planner, lab analyzer & more.", icon: Sparkles, accent: "#A16207", href: "/know-your-health" },
  { id: "labs", name: "Nexura Labs", sub: "Diagnostics, Decoded", desc: "400+ tests collected at home in 30-minute windows, run in NABL-certified labs, decoded by AI into plain language — reports in 4–12 hours.", icon: FlaskConical, accent: "#A16207", href: "/labs", badge: "New" },
  { id: "vitals", name: "Nexura Vitals", sub: "Your body, in real time", desc: "Connect the wearables you already own — heart rate, SpO₂, HRV, sleep and stress become one calm, physician-grade picture with trends explained.", icon: Activity, accent: "#A16207", href: "/vitals", badge: "New" },
  { id: "emergency", name: "Nexura Emergency", sub: "Seconds, respected", desc: "Press-and-hold SOS dispatches the nearest ambulance with your medical ID streaming to the crew. Live ER beds, blood-bank availability, offline first-aid.", icon: Siren, accent: "#A16207", href: "/emergency", badge: "SOS" },
  { id: "global", name: "Nexura Global", sub: "Medical Tourism", desc: "World-class Indian healthcare for global patients. Discovery portal, cost calculator, coordinator dashboard.", icon: Globe, accent: "#A16207", href: "/global" },
  { id: "diy", name: "Nexura DIY", sub: "Your Wellness Roadmap", desc: "Tell it like it is — one chat builds a safe, realistic wellness roadmap. Safety screen, honest timeframes, no sign-in needed.", icon: Sprout, accent: "#A16207", href: "/diy", badge: "Free · No sign-in" },
];

const ACTIONS: Feature[] = [
  { id: "book", name: "Book Appointment", sub: "Schedule a visit", desc: "Book a doctor appointment", icon: Clock, accent: "#A16207", href: "#book", isAction: true, action: "book" },
  { id: "symptoms", name: "Check Symptoms", sub: "AI triage", desc: "AI-powered symptom checker", icon: Sparkles, accent: "#A16207", href: "/know-your-health#symptoms-checker", isAction: true },
  { id: "connect-doc", name: "Chat with Doctor", sub: "Nexura Connect", desc: "Start a conversation", icon: MessageCircle, accent: "#A16207", href: "/connect/patient", isAction: true },
  { id: "investors", name: "Investor Deck", sub: "Seed Round", desc: "Vision, market, traction, ask", icon: TrendingUp, accent: "#A16207", href: "/investors", isAction: true },
  { id: "pricing", name: "Pricing", sub: "SaaS Plans", desc: "Transparent pricing in INR", icon: TrendingUp, accent: "#A16207", href: "/pricing", isAction: true },
  { id: "compliance", name: "Compliance", sub: "Regulatory", desc: "ABDM, DPDP, NABH, CDSCO, IRDAI", icon: Shield, accent: "#A16207", href: "/compliance", isAction: true },
];

export function FeaturesShowcase() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { openBooking } = useBooking();

  const handleClick = (feature: Feature) => {
    if (feature.action === "book") {
      openBooking();
    }
  };

  return (
    <section id="products" className="relative scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          className="mx-auto max-w-2xl text-center mb-12"
        >
          <p className="nx-micro mb-3">
            Everything Nexura OS
          </p>
          <h2 className="display-md text-foreground">
            One ecosystem.{" "}
            <span className="text-gold-gradient">Every feature.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            9 products and 6 quick actions, built for Indian healthcare: hospitals, clinics, pharmacies, patients, and beyond.
          </p>
        </motion.div>

        {/* Products grid */}
        <div className="mb-4">
          <p className="px-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">
            Products
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p, i) => (
            <FeatureCard
              key={p.id}
              feature={p}
              index={i}
              featured={i === 0}
              onClick={() => handleClick(p)}
            />
          ))}
        </div>

        {/* Quick actions */}
        <div className="mt-10 mb-4">
          <p className="px-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">
            Quick Actions
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((a, i) => (
            <FeatureCard key={a.id} feature={a} index={i} compact onClick={() => handleClick(a)} />
          ))}
        </div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 text-center"
        >
          {[
            { stat: 9, label: "Products" },
            { stat: 6, label: "Quick Actions" },
            { stat: 15, label: "AI Tools" },
            { stat: 1.4, suffix: "B", decimals: 1, label: "People we build for" },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-display text-2xl font-bold text-gradient-warm">
                <Counter
                  to={s.stat}
                  suffix={"suffix" in s ? s.suffix : ""}
                  decimals={"decimals" in s ? s.decimals : 0}
                />
              </div>
              <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground/50 mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Feature card ---------- */
function FeatureCard({ feature, index, compact, featured, onClick }: { feature: Feature; index: number; compact?: boolean; featured?: boolean; onClick?: () => void }) {
  const Icon = feature.icon;
  const content = (
    <>
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: feature.accent }}
      />
      {/* Shimmer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.5rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute -inset-x-1/2 -top-1/2 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative flex items-start gap-3">
        {/* Icon */}
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm ring-1 ring-white/20"
          style={{ background: `linear-gradient(135deg, ${feature.accent}, color-mix(in srgb, ${feature.accent} 65%, #000))` }}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">{feature.name}</h3>
            {feature.badge && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[0.45rem] font-bold uppercase tracking-wider text-white"
                style={{ background: feature.accent }}
              >
                {feature.badge}
              </span>
            )}
          </div>
          <p className="text-[0.6rem] text-muted-foreground mt-0.5">{feature.sub}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      {/* Description (hidden in compact mode, fuller on the flagship) */}
      {!compact && (
        <p className={
          featured
            ? "relative mt-3 max-w-md text-[0.8rem] leading-relaxed text-muted-foreground"
            : "relative mt-2.5 text-[0.65rem] leading-relaxed text-muted-foreground/70 line-clamp-3"
        }>
          {feature.desc}
        </p>
      )}

      {/* Bottom accent */}
      <div
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: feature.accent }}
      />
    </>
  );

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
      className={
        featured
          ? "group relative h-full overflow-hidden rounded-[1.5rem] nx-inset-glass p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-30px_rgba(46,42,38,0.3)]"
          : "group relative h-full overflow-hidden rounded-[1.5rem] nx-inset-glass p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-30px_rgba(46,42,38,0.3)]"
      }
    >
      {featured ? (
        <SpotlightCard className="flex h-full flex-col justify-between rounded-[1.5rem] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm ring-1 ring-white/20"
              style={{ background: `linear-gradient(135deg, ${feature.accent}, color-mix(in srgb, ${feature.accent} 65%, #000))` }}
            >
              <Icon className="h-6 w-6" strokeWidth={2.2} />
            </span>
            {feature.badge && (
              <span
                className="rounded-full px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-wider text-white"
                style={{ background: feature.accent }}
              >
                {feature.badge}
              </span>
            )}
          </div>
          <div className="mt-6">
            <h3 className="font-display text-lg font-semibold text-foreground sm:text-xl">{feature.name}</h3>
            <p className="text-[0.7rem] text-muted-foreground mt-0.5">{feature.sub}</p>
            <p className="relative mt-3 max-w-md text-[0.8rem] leading-relaxed text-muted-foreground">{feature.desc}</p>
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-foreground">
            Explore {feature.name}
            <ArrowUpRight className="h-3.5 w-3.5 text-[#A16207] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </SpotlightCard>
      ) : (
        content
      )}
    </motion.div>
  );

  // For booking action, use a button instead of link
  if (feature.action === "book") {
    return <button onClick={onClick} className="text-left">{card}</button>;
  }

  return (
    <Link
      href={feature.href}
      className={featured ? "block h-full sm:col-span-2 sm:row-span-2" : "block"}
    >
      {card}
    </Link>
  );
}
