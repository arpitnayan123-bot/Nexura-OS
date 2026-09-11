"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, ArrowRight, Building2, Stethoscope, Pill, HeartPulse, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    product: "Hospital OS",
    icon: Building2,
    color: "#C98A7A",
    href: "/hospital",
    plans: [
      { name: "Starter", price: "₹50,000", period: "/month", desc: "Up to 50 beds", features: ["Dashboard + OPD + IPD", "EHR + Nursing", "Basic billing", "Email support", "1 hospital location"], cta: "Start free trial" },
      { name: "Professional", price: "₹1,50,000", period: "/month", desc: "Up to 200 beds", features: ["All 18 modules", "AI clinical assistant", "Insurance + TPA claims", "Blood Bank + Radiology", "ABDM integration", "Priority support", "1 hospital location"], cta: "Start free trial", popular: true },
      { name: "Enterprise", price: "₹5,00,000", period: "/month", desc: "200+ beds / multi-location", features: ["Everything in Professional", "Multi-hospital chain", "Custom AI training", "Dedicated CSM", "99.9% SLA", "On-premise option", "API access"], cta: "Contact sales" },
    ],
  },
  {
    product: "Clinic OS",
    icon: Stethoscope,
    color: "#D98B6E",
    href: "/clinic",
    plans: [
      { name: "Solo", price: "₹2,000", period: "/month", desc: "1 doctor", features: ["SOAP consultation", "Drug autocomplete (54 meds)", "Patient register", "Basic billing", "Public booking page"], cta: "Start free trial" },
      { name: "Practice", price: "₹8,000", period: "/month", desc: "Up to 5 doctors", features: ["Everything in Solo", "ABHA registry", "AI symptom triage", "Telemedicine", "Follow-up reminders (call-based)", "Revenue analytics"], cta: "Start free trial", popular: true },
      { name: "Chain", price: "₹15,000", period: "/month", desc: "Unlimited doctors", features: ["Everything in Practice", "Multi-clinic management", "Centralized patient DB", "Custom branding", "API access", "Priority support"], cta: "Contact sales" },
    ],
  },
  {
    product: "Pharmacia",
    icon: Pill,
    color: "#F59E0B",
    href: "/pharmacy",
    plans: [
      { name: "Single Store", price: "₹1,500", period: "/month", desc: "1 pharmacy", features: ["Billing POS", "Inventory + batches", "GST e-invoice", "Schedule H register", "1 pharmacy location"], cta: "Start free trial" },
      { name: "Pro", price: "₹4,000", period: "/month", desc: "Up to 3 stores", features: ["Everything in Single Store", "AI prescription OCR", "Voice billing", "Predictive analytics", "Supplier + customer ledger", "Multi-store sync"], cta: "Start free trial", popular: true },
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
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#D98B6E] to-[#E0B080]">
              <HeartPulse className="h-4 w-4 text-white" strokeWidth={2.5} />
            </span>
            <span className="font-display text-sm font-semibold text-[#0F172A]">Nexura OS</span>
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/investors" className="text-[#64748B] hover:text-[#0F172A]">Investors</Link>
            <Link href="/" className="text-[#64748B] hover:text-[#0F172A]">Product</Link>
            <Link href="/portal" className="rounded-full bg-[#D98B6E] text-white px-3 py-1.5 font-medium hover:bg-[#C97A5D]">Patient Portal</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D98B6E] mb-3">Pricing</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#0F172A]">
            Simple, transparent pricing.
          </h1>
          <p className="mt-4 text-lg text-[#64748B] max-w-2xl mx-auto">
            Pay for what you use. No hidden fees. Cancel anytime. Built for Indian healthcare budgets.
          </p>
        </motion.div>
      </section>

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
                  "relative rounded-3xl border bg-white p-6 lg:p-8",
                  plan.popular ? "border-[#D98B6E] shadow-xl scale-105" : "border-[#E7E5E4] shadow-sm"
                )}
                style={plan.popular ? { boxShadow: "0 20px 60px -30px rgba(217, 139, 110, 0.4)" } : {}}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D98B6E] px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-white shadow-md">
                    Most Popular
                  </span>
                )}
                <p className="font-display text-lg font-semibold text-[#0F172A]">{plan.name}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{plan.desc}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold text-[#0F172A]">{plan.price}</span>
                  <span className="text-sm text-[#94A3B8]">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-[#64748B]">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-[#9DB89E]/15 text-[#9DB89E] shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={TIERS[activeProduct].href}
                  className={cn(
                    "mt-6 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all",
                    plan.popular
                      ? "bg-[#D98B6E] text-white hover:bg-[#C97A5D]"
                      : "border border-[#E7E5E4] text-[#0F172A] hover:bg-[#F8FAFC]"
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
          <h2 className="font-display text-2xl font-semibold text-center text-[#0F172A] mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: "Is there a free trial?", a: "Yes. All paid plans come with a 14-day free trial. No credit card required. You can explore all features with demo data before committing." },
              { q: "Can I switch plans later?", a: "Absolutely. You can upgrade or downgrade at any time. Changes take effect immediately and we prorate the difference." },
              { q: "Do you offer discounts for NGOs or government hospitals?", a: "Yes. We offer up to 50% discount for government hospitals, NGO-run clinics, and charitable trusts. Contact sales for details." },
              { q: "Is my data secure?", a: "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We're DPDP 2023 compliant and ABDM-compatible. Patient data never leaves India." },
              { q: "Do you provide training?", a: "Yes. Every plan includes free onboarding training. Professional and Enterprise plans include dedicated training sessions for your team." },
              { q: "What payment modes do you accept?", a: "We accept UPI, credit/debit cards, net banking, and bank transfers. Annual billing gets 2 months free." },
            ].map((faq, i) => (
              <div key={i} className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
                <p className="font-medium text-[#0F172A]">{faq.q}</p>
                <p className="text-sm text-[#64748B] mt-1.5 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-[#D98B6E] to-[#E0B080] p-8 lg:p-12 text-center text-white">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold">Ready to digitize your healthcare?</h2>
          <p className="mt-2 text-white/80">Join the ABDM revolution. Start your free trial today.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/hospital" className="rounded-full bg-white text-[#D98B6E] px-5 py-2.5 text-sm font-semibold hover:bg-white/90">
              Explore Hospital OS
            </Link>
            <Link href="/portal" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
              Patient Portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
