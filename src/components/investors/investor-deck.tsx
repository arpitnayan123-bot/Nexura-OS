"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight, TrendingUp, Shield, Brain, HeartPulse, Building2,
  Stethoscope, Pill, MessageCircle, Globe, Sparkles, Users,
  CheckCircle2, Activity, Zap, Target, Eye, Rocket,
} from "lucide-react";

/* ============================================================
   NEXURA OS — INVESTOR DECK
   Dark, premium, venture-scale narrative.
   ============================================================ */

export function InvestorDeck() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Nav />
      <Hero />
      <Problem />
      <Solution />
      <Market />
      <Traction />
      <BusinessModel />
      <Products />
      <CompetitiveLandscape />
      <Compliance />
      <Roadmap />
      <Team />
      <Ask />
      <Footer />
    </div>
  );
}

/* ---------- Nav ---------- */
function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0A0A0A]/70 border-b border-white/5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#D98B6E] to-[#E0B080]">
            <HeartPulse className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="font-display text-sm font-semibold">Nexura OS</span>
        </Link>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/pricing" className="text-white/60 hover:text-white">Pricing</Link>
          <Link href="/compliance" className="text-white/60 hover:text-white">Compliance</Link>
          <Link href="/" className="text-white/60 hover:text-white">Product</Link>
        </div>
      </div>
    </nav>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-[#D98B6E]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-[#9DB89E]/10 blur-3xl" />
      </div>
      <div ref={ref} className="relative mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 mb-6"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          Seed Round · Seeking $8M · India HealthTech
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1]"
        >
          Building the OS for{" "}
          <span className="bg-gradient-to-r from-[#D98B6E] via-[#E0B080] to-[#9DB89E] bg-clip-text text-transparent">
            Indian healthcare.
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-lg text-white/60 max-w-2xl mx-auto leading-relaxed"
        >
          Nexura OS is the first unified, AI-native healthcare platform for India —
          connecting hospitals, clinics, pharmacies, and 1.4 billion patients through one
          warm, intelligent ecosystem.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <a href="#problem" className="rounded-full bg-white text-[#0A0A0A] px-5 py-2.5 text-sm font-semibold hover:bg-white/90 transition-colors">
            Explore the deck
          </a>
          <a href="#ask" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition-colors">
            Investment ask →
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Section wrapper ---------- */
function Section({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`py-20 px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D98B6E] mb-3">{children}</p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-4">{children}</h2>
  );
}

/* ---------- Problem ---------- */
function Problem() {
  return (
    <Section id="problem" className="border-t border-white/5">
      <SectionLabel>The Problem</SectionLabel>
      <SectionTitle>Indian healthcare is fragmented, paper-based, and invisible.</SectionTitle>
      <p className="text-white/60 text-lg leading-relaxed mb-12 max-w-3xl">
        70% of Indian healthcare runs on paper registers. Patients carry physical files across
        hospitals. Doctors write prescriptions by hand. Pharmacies maintain stock in notebooks.
        There is no unified patient identity, no longitudinal health record, no real-time data.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { stat: "70%", label: "Paper-based", sub: "clinics still use registers" },
          { stat: "0", label: "Patient identity", sub: "no unified health record" },
          { stat: "4 hrs", label: "Wait time", sub: "average OPD wait in India" },
          { stat: "₹0", label: "Data liquidity", sub: "patient owns nothing" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <p className="font-display text-3xl font-bold text-[#D98B6E]">{s.stat}</p>
            <p className="mt-2 text-sm font-medium text-white">{s.label}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Solution ---------- */
function Solution() {
  return (
    <Section id="solution" className="border-t border-white/5">
      <SectionLabel>The Solution</SectionLabel>
      <SectionTitle>One ecosystem. Eight products. Zero friction.</SectionTitle>
      <p className="text-white/60 text-lg leading-relaxed mb-12 max-w-3xl">
        Nexura OS unifies every stakeholder — hospitals, clinics, pharmacies, patients, doctors —
        into a single AI-native platform. One login. One health record. One warm experience.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Building2, title: "Hospital OS", desc: "18-module HMS with AI clinical intelligence, NEWS2, NABH compliance", color: "#C98A7A" },
          { icon: Stethoscope, title: "Clinic OS", desc: "HealthPlix-style EMR with SOAP, drug autocomplete, ABHA registry", color: "#D98B6E" },
          { icon: Pill, title: "Pharmacia", desc: "AI pharmacy POS with voice billing, Rx OCR, GST e-invoice, Schedule H", color: "#F59E0B" },
          { icon: HeartPulse, title: "Patient Portal", desc: "Unified health record + blood test at home with AI interpretation", color: "#0EA5E9" },
          { icon: MessageCircle, title: "Connect", desc: "Doctor-patient chat, voice, video across all products", color: "#10B981" },
          { icon: Sparkles, title: "Know Your Health", desc: "15 AI tools — symptom checker, derma scan, diet planner, X-ray reader", color: "#9DB89E" },
        ].map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-colors"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl mb-3" style={{ background: `${p.color}20`, color: p.color }}>
              <p.icon className="h-5 w-5" />
            </span>
            <p className="font-medium text-white">{p.title}</p>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Market ---------- */
function Market() {
  return (
    <Section id="market" className="border-t border-white/5">
      <SectionLabel>Market Opportunity</SectionLabel>
      <SectionTitle>$372B Indian healthcare. $48B digital health. We're building the rails.</SectionTitle>
      <div className="grid lg:grid-cols-3 gap-6 mb-12">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">TAM</p>
          <p className="font-display text-3xl font-bold text-[#D98B6E]">$372B</p>
          <p className="text-sm text-white/60 mt-1">Indian healthcare spend (2025)</p>
          <p className="text-xs text-white/30 mt-2">Growing 12% CAGR. 1.4B population.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">SAM</p>
          <p className="font-display text-3xl font-bold text-[#E0B080]">$48B</p>
          <p className="text-sm text-white/60 mt-1">Digital health + hospital IT</p>
          <p className="text-xs text-white/30 mt-2">70,000 hospitals + 3M clinics + 850K pharmacies.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">SOM (5yr)</p>
          <p className="font-display text-3xl font-bold text-[#9DB89E]">$2.1B</p>
          <p className="text-sm text-white/60 mt-1">Target revenue at 5% SAM penetration</p>
          <p className="text-xs text-white/30 mt-2">15,000 hospitals + 100,000 clinics + 200,000 pharmacies.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#D98B6E]/10 to-[#9DB89E]/5 p-8">
        <h3 className="font-display text-lg font-semibold mb-4">The ABDM tailwind</h3>
        <p className="text-white/60 text-sm leading-relaxed mb-4">
          The Ayushman Bharat Digital Mission (ABDM) is India's national mandate to digitize
          healthcare. Every patient gets an ABHA ID. Every hospital must connect. Every prescription
          must be digital. This is a forced market creation — and Nexura OS is built natively for it.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="font-display text-2xl font-bold text-white">680M+</p><p className="text-xs text-white/40">ABHA IDs created</p></div>
          <div><p className="font-display text-2xl font-bold text-white">₹41B</p><p className="text-xs text-white/40">Govt digital health budget</p></div>
          <div><p className="font-display text-2xl font-bold text-white">2026</p><p className="text-xs text-white/40">Mandatory compliance year</p></div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- Traction ---------- */
function Traction() {
  return (
    <Section id="traction" className="border-t border-white/5">
      <SectionLabel>Traction</SectionLabel>
      <SectionTitle>Live product. Real modules. Built for scale.</SectionTitle>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { stat: "8", label: "Products shipped", sub: "All live with real data" },
          { stat: "145", label: "Data models", sub: "Production-grade Prisma schema" },
          { stat: "172", label: "API endpoints", sub: "REST + real-time polling" },
          { stat: "15+", label: "AI features", sub: "LLM + VLM + ASR powered" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"
          >
            <p className="font-display text-3xl font-bold bg-gradient-to-br from-[#D98B6E] to-[#E0B080] bg-clip-text text-transparent">{s.stat}</p>
            <p className="text-sm font-medium text-white mt-1">{s.label}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="font-medium text-white mb-4 text-sm">Target pipeline (discussion stage — no pilots signed yet)</h3>
        <div className="space-y-3">
          {[
            { name: "Aarogya Multi-Specialty Hospital", city: "Mumbai", beds: 220, stage: "Discussion stage" },
            { name: "Sunrise Pharma Chain", city: "Pune", stores: 12, stage: "Demo scheduled" },
            { name: "Dr. Rao Family Clinic", city: "Mumbai", doctors: 3, stage: "Discussion stage" },
          ].map((p, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <p className="text-sm text-white">{p.name}</p>
                <p className="text-xs text-white/40">{p.city} · {p.beds ? `${p.beds} beds` : p.stores ? `${p.stores} stores` : `${p.doctors} doctors`}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.stage.includes("Demo") ? "bg-[#D98B6E]/10 text-[#D98B6E]" : "bg-white/5 text-white/40"}`}>
                {p.stage}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- Business Model ---------- */
function BusinessModel() {
  return (
    <Section id="business" className="border-t border-white/5">
      <SectionLabel>Business Model</SectionLabel>
      <SectionTitle>SaaS + transaction fees. B2B2C flywheel.</SectionTitle>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="font-medium text-white mb-4">Revenue streams</h3>
          <div className="space-y-4">
            {[
              { name: "Hospital OS — SaaS", model: "₹50K–₹5L/month per hospital", desc: "Tiered by bed count + modules", icon: Building2 },
              { name: "Clinic OS — SaaS", model: "₹2K–₹15K/month per clinic", desc: "Tiered by doctor count", icon: Stethoscope },
              { name: "Pharmacia — SaaS + transaction", model: "₹1K–₹8K/month + 0.5% on UPI", desc: "Per pharmacy + payment fees", icon: Pill },
              { name: "Patient Portal — Freemium", model: "Free for patients", desc: "Monetize via blood test + teleconsult", icon: HeartPulse },
              { name: "Blood Test at Home", model: "₹199–₹2,999 per test", desc: "30% margin after phlebotomist + lab", icon: Activity },
              { name: "AI API (B2B)", model: "₹0.50–₹5 per AI call", desc: "Symptom checker, Rx OCR, lab interpretation", icon: Brain },
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#D98B6E]/10 text-[#D98B6E] shrink-0">
                  <r.icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{r.name}</p>
                  <p className="text-xs text-[#D98B6E] font-mono">{r.model}</p>
                  <p className="text-xs text-white/40 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="font-medium text-white mb-4">Unit economics (Year 3 target)</h3>
          <div className="space-y-3">
            {[
              { metric: "ARPA (hospital)", value: "₹2.4L/yr", note: "avg revenue per account" },
              { metric: "Gross margin", value: "82%", note: "SaaS + AI (high margin)" },
              { metric: "CAC (hospital)", value: "₹1.8L", note: "direct sales + demos" },
              { metric: "LTV (hospital)", value: "₹24L", note: "5yr avg retention 85%" },
              { metric: "LTV/CAC ratio", value: "13.3x", note: "venture-scale unit economics" },
              { metric: "Payback period", value: "9 months", note: "fast CAC recovery" },
              { metric: "Net Revenue Retention", value: "128%", note: "expansion via modules" },
            ].map((u, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-white">{u.metric}</p>
                  <p className="text-xs text-white/40">{u.note}</p>
                </div>
                <p className="font-display text-lg font-bold text-[#9DB89E]">{u.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Link href="/pricing" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#D98B6E] hover:text-[#E0B080]">
        See full pricing breakdown <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Section>
  );
}

/* ---------- Products ---------- */
function Products() {
  return (
    <Section id="products" className="border-t border-white/5">
      <SectionLabel>Product Suite</SectionLabel>
      <SectionTitle>Eight products. One platform. Built Indian, for India.</SectionTitle>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Building2, name: "Hospital OS", href: "/hospital", desc: "18 modules — OPD, IPD, OT, EHR, Nursing, Lab, Radiology, Blood Bank, Billing, Insurance, AI Assistant. ABDM + NABH.", badge: "Flagship", color: "#C98A7A" },
          { icon: Stethoscope, name: "Clinic OS", href: "/clinic", desc: "SOAP consultation, drug autocomplete (54 Indian medicines), ABHA registry, public booking page.", badge: "New", color: "#D98B6E" },
          { icon: Pill, name: "Pharmacia", href: "/pharmacy", desc: "Voice billing, prescription OCR, GST e-invoice, Schedule H register, predictive analytics.", badge: "New", color: "#F59E0B" },
          { icon: HeartPulse, name: "Patient Portal", href: "/portal", desc: "Unified health record. Blood test at home with phlebotomist visit + AI report interpretation.", badge: "New", color: "#0EA5E9" },
          { icon: MessageCircle, name: "Connect", href: "/connect", desc: "Doctor-patient chat, voice, video. Auto-connects when consultations complete or triage flags urgency.", color: "#10B981" },
          { icon: Sparkles, name: "Know Your Health", href: "/know-your-health", desc: "15 AI tools — symptom checker, derma scan, X-ray reader, diet planner, lab analyzer.", color: "#9DB89E" },
        ].map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <Link href={p.href} className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${p.color}20`, color: p.color }}>
                  <p.icon className="h-5 w-5" />
                </span>
                {p.badge && (
                  <span className="rounded-full px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-wider" style={{ background: `${p.color}20`, color: p.color }}>
                    {p.badge}
                  </span>
                )}
              </div>
              <p className="font-medium text-white">{p.name}</p>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">{p.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#D98B6E] opacity-0 group-hover:opacity-100 transition-opacity">
                Launch product <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Competitive Landscape ---------- */
function CompetitiveLandscape() {
  return (
    <Section id="competitive" className="border-t border-white/5">
      <SectionLabel>Competitive Landscape</SectionLabel>
      <SectionTitle>No one does what we do. Not even close.</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-2 text-white/40 font-medium text-xs uppercase tracking-wider">Capability</th>
              <th className="text-center py-3 px-2 text-[#D98B6E] font-semibold">Nexura OS</th>
              <th className="text-center py-3 px-2 text-white/40">Insta HMS</th>
              <th className="text-center py-3 px-2 text-white/40">Apollo 24/7</th>
              <th className="text-center py-3 px-2 text-white/40">Practo Ray</th>
              <th className="text-center py-3 px-2 text-white/40">Tata 1mg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {[
              { cap: "Hospital OS (18 modules)", nexura: true, insta: true, apollo: false, practo: false, tata: false },
              { cap: "Clinic EMR (SOAP + drugs)", nexura: true, insta: false, apollo: false, practo: true, tata: false },
              { cap: "Pharmacy POS + GST", nexura: true, insta: false, apollo: false, practo: false, tata: true },
              { cap: "Patient Portal (unified)", nexura: true, insta: false, apollo: true, practo: false, tata: true },
              { cap: "Blood test at home + AI", nexura: true, insta: false, apollo: true, practo: false, tata: true },
              { cap: "AI clinical assistant", nexura: true, insta: false, apollo: false, practo: false, tata: false },
              { cap: "AI lab report interpretation", nexura: true, insta: false, apollo: false, practo: false, tata: false },
              { cap: "Doctor-patient chat/voice/video", nexura: true, insta: false, apollo: true, practo: true, tata: false },
              { cap: "15 AI health tools", nexura: true, insta: false, apollo: false, practo: false, tata: false },
              { cap: "ABDM native", nexura: true, insta: false, apollo: true, practo: false, tata: false },
              { cap: "Schedule H + NABH compliance", nexura: true, insta: true, apollo: false, practo: false, tata: false },
              { cap: "Unified patient identity", nexura: true, insta: false, apollo: false, practo: false, tata: false },
            ].map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02]">
                <td className="py-2.5 px-2 text-white/80">{row.cap}</td>
                <td className="text-center py-2.5 px-2">{row.nexura ? <CheckCircle2 className="h-4 w-4 text-[#D98B6E] mx-auto" /> : <span className="text-white/20">—</span>}</td>
                <td className="text-center py-2.5 px-2">{row.insta ? <CheckCircle2 className="h-4 w-4 text-white/40 mx-auto" /> : <span className="text-white/20">—</span>}</td>
                <td className="text-center py-2.5 px-2">{row.apollo ? <CheckCircle2 className="h-4 w-4 text-white/40 mx-auto" /> : <span className="text-white/20">—</span>}</td>
                <td className="text-center py-2.5 px-2">{row.practo ? <CheckCircle2 className="h-4 w-4 text-white/40 mx-auto" /> : <span className="text-white/20">—</span>}</td>
                <td className="text-center py-2.5 px-2">{row.tata ? <CheckCircle2 className="h-4 w-4 text-white/40 mx-auto" /> : <span className="text-white/20">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-white/40">
        Nexura OS is the only platform that combines hospital + clinic + pharmacy + patient + AI + blood testing into one unified ecosystem. Competitors do one thing. We do everything.
      </p>
    </Section>
  );
}

/* ---------- Compliance ---------- */
function Compliance() {
  return (
    <Section id="compliance" className="border-t border-white/5">
      <SectionLabel>Regulatory Path</SectionLabel>
      <SectionTitle>Compliance is our moat.</SectionTitle>
      <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-3xl">
        Indian healthcare regulation is complex. We've built Nexura OS to be compliant from day one —
        not as an afterthought, but as a core architectural principle.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: "ABDM", full: "Ayushman Bharat Digital Mission", status: "In progress", desc: "ABHA ID integration, health record exchange, ABDM-compliant APIs", icon: Shield, color: "#D98B6E" },
          { name: "DPDP 2023", full: "Digital Personal Data Protection Act", status: "Built-in", desc: "Patient consent, data localization, right to erasure, audit trail", icon: Shield, color: "#9DB89E" },
          { name: "NABH", full: "National Accreditation Board for Hospitals", status: "Standards-ready", desc: "Quality indicators, patient safety, infection control tracking", icon: Shield, color: "#E0B080" },
          { name: "CDSCO", full: "Central Drugs Standard Control Organisation", status: "Built-in", desc: "Schedule H/H1 register, drug traceability, pharmacovigilance", icon: Shield, color: "#C98A7A" },
          { name: "IRDAI", full: "Insurance Regulatory and Development Authority", status: "Built-in", desc: "TPA claims workflow, cashless pre-auth, claim status tracking", icon: Shield, color: "#0EA5E9" },
          { name: "GST e-Invoice", status: "Built-in", desc: "IRN-ready JSON, CGST/SGST split, HSN codes, e-way bill", icon: Shield, color: "#F59E0B" },
        ].map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${c.color}20`, color: c.color }}>
                <c.icon className="h-4 w-4" />
              </span>
              <span className="text-[0.55rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${c.color}15`, color: c.color }}>
                {c.status}
              </span>
            </div>
            <p className="font-medium text-white text-sm">{c.name}</p>
            <p className="text-xs text-white/40 mt-0.5">{c.full}</p>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">{c.desc}</p>
          </motion.div>
        ))}
      </div>
      <Link href="/compliance" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#D98B6E] hover:text-[#E0B080]">
        Full compliance roadmap <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Section>
  );
}

/* ---------- Roadmap ---------- */
function Roadmap() {
  return (
    <Section id="roadmap" className="border-t border-white/5">
      <SectionLabel>Roadmap</SectionLabel>
      <SectionTitle>18 months to market leadership.</SectionTitle>
      <div className="space-y-4">
        {[
          { phase: "Q1 2026", title: "Seed + Pilot Validation", items: ["3 hospital pilots in discussion", "10 clinic conversations in pipeline", "Pharmacy POS beta with 5 stores", "ABDM integration in progress"], status: "current" },
          { phase: "Q2 2026", title: "Product Depth + AI", items: ["HL7/FHIR integration", "Voice-to-SOAP for doctors", "AI drug interaction checker", "Patient Portal v2 with wearable sync"], status: "next" },
          { phase: "Q3 2026", title: "Scale + Series A", items: ["50 hospitals onboarded", "200 clinics live", "Telemedicine marketplace launch", "Series A: $25M raise"], status: "planned" },
          { phase: "Q4 2026", title: "Multi-city + Insurance", items: ["Mumbai + Delhi + Bangalore + Chennai", "Insurance claims automation (IRDAI)", "Phlebotomist network (500+ cities)", "NABH accreditation for partners"], status: "planned" },
          { phase: "Q1-Q2 2027", title: "Marketplace + API Platform", items: ["Open AI API for healthcare", "Third-party app marketplace", "International expansion (SE Asia)", "$10M ARR milestone"], status: "vision" },
        ].map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <span className={`grid h-10 w-10 place-items-center rounded-full border-2 shrink-0 ${r.status === "current" ? "bg-[#D98B6E] border-[#D98B6E] text-white" : r.status === "next" ? "border-[#D98B6E] text-[#D98B6E]" : "border-white/20 text-white/40"}`}>
                {r.status === "current" ? <Rocket className="h-4 w-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
              </span>
              {i < 4 && <div className="w-px flex-1 bg-white/10 my-1" />}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-[#D98B6E] uppercase tracking-wider">{r.phase}</p>
                {r.status === "current" && <span className="text-[0.5rem] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#22C55E] text-white">Now</span>}
              </div>
              <p className="font-medium text-white mb-2">{r.title}</p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {r.items.map((item, j) => (
                  <div key={j} className="flex items-center gap-1.5 text-xs text-white/50">
                    <CheckCircle2 className="h-3 w-3 text-[#9DB89E]" /> {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Team ---------- */
function Team() {
  return (
    <Section id="team" className="border-t border-white/5">
      <SectionLabel>Team</SectionLabel>
      <SectionTitle>Built by builders who understand Indian healthcare.</SectionTitle>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: "Arpit Nayan", role: "Founder & CEO", desc: "Full-stack architect. Built Nexura OS from zero — 8 products, 145 data models, 172 API endpoints.", initials: "AN", color: "#D98B6E" },
          { role: "CTO (hiring)", desc: "Will lead engineering scale-up. Targeting ex-Practo/Innovaccer/Cerner.", initials: "CT", color: "#9DB89E", hiring: true },
          { role: "Head of Compliance (hiring)", desc: "Will own ABDM + NABH + DPDP certification. Targeting ex-NHA/IRDAI.", initials: "HC", color: "#E0B080", hiring: true },
          { role: "VP Sales (hiring)", desc: "Will lead hospital + clinic GTM. Targeting ex-Insta/Apollo/Practo.", initials: "VS", color: "#C98A7A", hiring: true },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full font-display font-bold text-white" style={{ background: m.color }}>
                {m.initials}
              </span>
              <div>
                {m.name && <p className="font-medium text-white">{m.name}</p>}
                <p className="text-xs text-white/40">{m.role}</p>
              </div>
            </div>
            <p className="text-xs text-white/50 mt-3 leading-relaxed">{m.desc}</p>
            {m.hiring && <span className="mt-2 inline-block text-[0.5rem] font-bold uppercase tracking-wider text-[#D98B6E] bg-[#D98B6E]/10 px-2 py-0.5 rounded-full">Hiring</span>}
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Ask ---------- */
function Ask() {
  return (
    <Section id="ask" className="border-t border-white/5">
      <SectionLabel>The Ask</SectionLabel>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#D98B6E]/10 via-[#E0B080]/5 to-[#9DB89E]/10 p-8 lg:p-12">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
          Raising $8M Seed.
        </h2>
        <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-2xl">
          To scale from pilot to 50 hospitals, 200 clinics, and 100 pharmacies across 4 cities —
          while building the AI layer that makes Nexura OS the default healthcare OS for India.
        </p>
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <div>
            <p className="font-display text-2xl font-bold text-[#D98B6E]">$3M</p>
            <p className="text-xs text-white/40 mt-1">Engineering team (8 hires)</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-[#E0B080]">$2M</p>
            <p className="text-xs text-white/40 mt-1">Sales + GTM (4 cities)</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-[#9DB89E]">$3M</p>
            <p className="text-xs text-white/40 mt-1">Compliance + AI infrastructure</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="mailto:invest@nexuraai.in" className="rounded-full bg-white text-[#0A0A0A] px-5 py-2.5 text-sm font-semibold hover:bg-white/90 transition-colors">
            Request data room →
          </a>
          <a href="/pricing" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition-colors">
            See pricing
          </a>
          <a href="/compliance" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition-colors">
            Compliance roadmap
          </a>
        </div>
        <p className="mt-8 text-xs text-white/30">
          Contact: Arpit Nayan · invest@nexuraai.in · Nexura AI Technologies Pvt. Ltd. · CIN: U72900MH2025PTC000001
        </p>
      </div>
    </Section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="border-t border-white/5 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-[#D98B6E] to-[#E0B080]">
            <HeartPulse className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-xs text-white/40">© 2026 Nexura AI Technologies Pvt. Ltd. · Built in India 🇮🇳</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/40">
          <Link href="/pricing">Pricing</Link>
          <Link href="/compliance">Compliance</Link>
          <Link href="/">Product</Link>
          <Link href="/portal">Patient Portal</Link>
        </div>
      </div>
    </footer>
  );
}
