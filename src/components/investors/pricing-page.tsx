"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, ArrowRight, Building2, Stethoscope, Pill, HeartPulse, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/premium/kit";

const TIERS = [
  {
    product: "Hospital OS",
    icon: Building2,
    color: "#B8860B",
    href: "/hospital",
    plans: [
      { name: "Starter", price: "₹50,000", period: "/month", desc: "Up to 50 beds", features: ["Dashboard + OPD + IPD", "EHR + Nursing", "Basic billing", "Email support", "1 hospital location"], cta: "Start onboarding" },
      { name: "Professional", price: "₹1,50,000", period: "/month", desc: "Up to 200 beds", features: ["All 18 modules", "AI clinical assistant", "Insurance + TPA claims", "Blood Bank + Radiology", "ABDM-ready (alignment in progress)", "Priority support", "1 hospital location"], cta: "Start onboarding", popular: true },
      { name: "Enterprise", price: "₹5,00,000", period: "/month", desc: "200+ beds / multi-location", features: ["Everything in Professional", "Multi-hospital chain", "Custom AI training", "Dedicated CSM", "99.9% SLA", "On-premise option", "API access"], cta: "Contact sales" },
    ],
  },
  {
    product: "Clinic OS",
    icon: Stethoscope,
    color: "#A16207",
    href: "/clinic",
    plans: [
      { name: "Solo", price: "₹2,000", period: "/month", desc: "1 doctor", features: ["SOAP consultation", "Drug autocomplete (54 meds)", "Patient register", "Basic billing", "Public booking page"], cta: "Start onboarding" },
      { name: "Practice", price: "₹8,000", period: "/month", desc: "Up to 5 doctors", features: ["Everything in Solo", "ABHA lookup (simulated)", "AI symptom triage", "Telemedicine", "Follow-up reminders (call-based)", "Revenue analytics"], cta: "Start onboarding", popular: true },
      { name: "Chain", price: "₹15,000", period: "/month", desc: "Unlimited doctors", features: ["Everything in Practice", "Multi-clinic management", "Centralized patient DB", "Custom branding", "API access", "Priority support"], cta: "Contact sales" },
    ],
  },
  {
    product: "Pharmacia",
    icon: Pill,
    color: "#F59E0B",
    href: "/pharmacy",
    plans: [
      { name: "Single Store", price: "₹1,500", period: "/month", desc: "1 pharmacy", features: ["Billing POS", "Inventory + batches", "GST e-invoice", "Schedule H register", "1 pharmacy location"], cta: "Start onboarding" },
      { name: "Pro", price: "₹4,000", period: "/month", desc: "Up to 3 stores", features: ["Everything in Single Store", "AI prescription OCR", "Voice billing", "Predictive analytics", "Supplier + customer ledger", "Multi-store sync"], cta: "Start onboarding", popular: true },
      { name: "Chain", price: "₹8,000", period: "/month", desc: "Unlimited stores", features: ["Everything in Pro", "Chain-wide analytics", "Central procurement", "Schedule H audit export", "API access", "Priority support"], cta: "Contact sales" },
    ],
  },
  {
    product: "Patient Portal",
    icon: HeartPulse,
    color: "#0EA5E9",
    href: "/portal",
    plans: [
      { name: "Patient", price: "Free", period: "forever", desc: "For patients", features: ["Unified health record", "Appointment history", "Prescriptions + bills", "Family member management", "Basic AI insights"], cta: "Sign up free" },
      { name: "Blood Test at Home", price: "₹199+", period: "per test", desc: "Pay per use", features: ["Phlebotomist home visit", "Sample collection", "Digital report in 6–24h by panel", "AI-assisted report reading", "8 test panels available"], cta: "Book a test", popular: true },
      { name: "AI Report Reading", price: "Free", period: "with report", desc: "In the Patient Portal", features: ["AI-assisted reading of blood reports", "Plain-English value explanations", "Rule-based fallback summary", "Not a diagnosis — share with your doctor"], cta: "View in portal" },
    ],
  },
];

export function PricingPage() {
  const [activeProduct, setActiveProduct] = useState(0);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#FAF7F2]/80 border-b border-[#E7E5E4]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#A16207] to-[#C9962E]">
              <HeartPulse className="h-4 w-4 text-white" strokeWidth={2.5} />
            </span>
            <span className="font-display text-sm font-semibold text-[#0F172A]">Nexura OS</span>
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/investors" className="text-[#64748B] hover:text-[#0F172A]">Investors</Link>
            <Link href="/" className="text-[#64748B] hover:text-[#0F172A]">Product</Link>
            <Link href="/portal" className="btn-gold rounded-full px-3 py-1.5 font-medium">Patient Portal</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <PageHero
        eyebrow="Pricing"
        title={<>Simple, <span className="text-gold-gradient">transparent</span> pricing.</>}
        lede="Pay for what you use. No hidden fees. Cancel anytime. Built for Indian healthcare budgets."
      />

      {/* Product tabs */}
      <section className="px-4 sm:px-6 lg:px-8 mb-12">
        <div className="mx-auto max-w-2xl flex flex-wrap items-center justify-center gap-2">
          {TIERS.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveProduct(i)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                activeProduct === i
                  ? "text-white shadow-md"
                  : "bg-white text-[#64748B] border border-[#E7E5E4] hover:bg-[#F8FAFC]"
              )}
              style={activeProduct === i ? { background: t.color } : {}}
            >
              <t.icon className="h-4 w-4" />
              {t.product}
            </button>
          ))}
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            key={activeProduct}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {TIERS[activeProduct].plans.map((plan, i) => (
              <div
                key={i}
                className={cn(
                  "card-lux relative rounded-3xl p-6 lg:p-8",
                  plan.popular
                    ? "frame-lux border-[#A16207]/40 bg-gradient-to-b from-white to-[#FBF4E4] shadow-[var(--shadow-lux-2)] md:scale-105"
                    : "card-lux-hover"
                )}
              >
                {plan.popular && (
                  <>
                    <span className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#D9B87C] to-transparent" />
                    <span className="badge-lux absolute -top-3.5 left-1/2 -translate-x-1/2 text-[0.6rem] font-bold uppercase tracking-[0.14em]">
                      <Sparkles className="h-3 w-3" /> Most Popular
                    </span>
                  </>
                )}
                <p className="font-display text-lg font-semibold text-[#0F172A]">{plan.name}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{plan.desc}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="stat-lux tabular text-3xl text-[#0F172A]">{plan.price}</span>
                  <span className="text-sm text-[#94A3B8]">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-[#64748B]">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-[#A16207]/12 text-[#A16207] shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={TIERS[activeProduct].href}
                  className={cn(
                    "mt-6 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all",
                    plan.popular
                      ? "btn-gold rounded-xl"
                      : "border border-[#E7E5E4] text-[#0F172A] hover:border-[#A16207]/35 hover:bg-[#FBF8F0]"
                  )}
                >
                  {plan.cta} <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 border-t border-[#E7E5E4]">
        <div className="mx-auto max-w-3xl pt-16">
          <div className="mb-8 text-center"><span className="eyebrow">Good to know</span></div>
          <h2 className="title-lux text-center text-2xl text-[#0F172A] mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: "Is there a free trial?", a: "New deployments start with an onboarding offer — contact us and we'll set up a guided walkthrough with demo data. Trial length and terms are finalised during onboarding." },
              { q: "Can I switch plans later?", a: "Absolutely. You can upgrade or downgrade at any time. Changes take effect immediately and we prorate the difference." },
              { q: "Do you offer discounts for NGOs or government hospitals?", a: "Yes. We offer up to 50% discount for government hospitals, NGO-run clinics, and charitable trusts. Contact sales for details." },
              { q: "Is my data secure?", a: "All data is encrypted in transit (TLS 1.3); at-rest encryption is on the roadmap — see the Compliance page for current status. We're DPDP 2023 compliant and ABDM-ready (alignment in progress, not yet integrated). Hosting in India is planned; processing may route through AI providers today — see the Compliance page." },
              { q: "Do you provide training?", a: "Yes. Every plan includes free onboarding training. Professional and Enterprise plans include dedicated training sessions for your team." },
              { q: "What payment modes do you accept?", a: "Payment modes are finalised during onboarding so they match how your organisation already pays — talk to us about the options, including annual-billing arrangements." },
            ].map((faq, i) => (
              <div key={i} className="card-lux card-lux-hover rounded-2xl p-5">
                <p className="font-medium text-[#0F172A]">{faq.q}</p>
                <p className="text-sm text-[#64748B] mt-1.5 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — Liquid Gold climax */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#26221E] via-[#1C1917] to-[#141210] p-8 lg:p-12 text-center text-[#F6F1E7] shadow-[var(--shadow-lux-3)]">
          <div aria-hidden className="aurora-gold -top-24 left-1/2 h-64 w-[30rem] -translate-x-1/2 opacity-45" />
          <h2 className="title-lux relative text-2xl sm:text-3xl">Ready to <span className="text-gold-gradient">digitize</span> your healthcare?</h2>
          <p className="relative mt-2 text-[#F6F1E7]/75">Join the ABDM revolution. Start your onboarding today.</p>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/hospital" className="btn-gold h-11 rounded-full px-5 text-sm font-semibold">
              Explore Hospital OS
            </Link>
            <Link href="/portal" className="btn-glass-lux h-11 rounded-full border-white/20 bg-white/10 px-5 text-sm font-semibold text-white">
              Patient Portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
