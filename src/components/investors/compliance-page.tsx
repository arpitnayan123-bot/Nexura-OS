"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, CheckCircle2, Clock, ArrowRight, HeartPulse, FileCheck, Lock, Building2 } from "lucide-react";

const REGULATIONS = [
  {
    name: "ABDM",
    full: "Ayushman Bharat Digital Mission",
    status: "In Progress",
    statusColor: "#D97706",
    desc: "India's national digital health mission. Mandates ABHA ID, health record exchange, and ABDM-compliant APIs.",
    features: [
      "ABHA ID generation + lookup",
      "Health Information Exchange (HIE)",
      "Consent manager integration",
      "ABDM-compliant API endpoints",
      "Health record linking across providers",
    ],
    timeline: "Certification target: Q1 2026",
  },
  {
    name: "DPDP 2023",
    full: "Digital Personal Data Protection Act",
    status: "Built-in",
    statusColor: "#16A34A",
    desc: "India's data privacy law. Requires patient consent, data localization, breach notification, and right to erasure.",
    features: [
      "Explicit patient consent flow",
      "Data localization (India-only servers)",
      "Right to erasure (GDPR-style)",
      "Audit trail for all data access",
      "Breach notification within 72 hours",
      "Data processing impact assessments",
    ],
    timeline: "Compliant since launch",
  },
  {
    name: "NABH",
    full: "National Accreditation Board for Hospitals",
    status: "Standards-ready",
    statusColor: "#9DB89E",
    desc: "Voluntary accreditation for hospitals. Nexura OS tracks all NABH quality indicators.",
    features: [
      "Patient safety indicators",
      "Infection control tracking",
      "Medication error logging",
      "Quality indicator dashboards",
      "NABH audit-ready reports",
      "Continuous quality monitoring",
    ],
    timeline: "Audit-ready: Q2 2026",
  },
  {
    name: "CDSCO",
    full: "Central Drugs Standard Control Organisation",
    status: "Built-in",
    statusColor: "#16A34A",
    desc: "Regulates drugs, medical devices, and clinical trials. Schedule H/H1 drug tracking mandatory.",
    features: [
      "Schedule H / H1 drug register",
      "Drug traceability (barcodes)",
      "Prescription validation",
      "Pharmacovigilance reporting",
      "Batch + expiry tracking (FEFO)",
      "CDSCO audit export (CSV)",
    ],
    timeline: "Compliant since launch",
  },
  {
    name: "IRDAI",
    full: "Insurance Regulatory and Development Authority",
    status: "Built-in",
    statusColor: "#16A34A",
    desc: "Regulates insurance. Cashless pre-auth + TPA claims workflow per IRDAI guidelines.",
    features: [
      "TPA pre-authorization workflow",
      "Cashless claim submission",
      "Claim status tracking",
      "Co-pay + deductible calculation",
      "Discharge summary generation",
      "IRDAI-compliant claim format",
    ],
    timeline: "Compliant since launch",
  },
  {
    name: "GST e-Invoice",
    full: "Goods and Services Tax e-Invoice",
    status: "Built-in",
    statusColor: "#16A34A",
    desc: "Mandatory GST e-invoice for B2B transactions >₹50,000. IRN-ready JSON + e-way bill.",
    features: [
      "IRN-ready JSON generation",
      "CGST + SGST split (correct slabs)",
      "HSN code mapping",
      "E-way bill generation (auto)",
      "State code mapping (all 28 states)",
      "GST return export",
    ],
    timeline: "Compliant since launch",
  },
];

export function CompliancePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Nav */}
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
            <Link href="/investors" className="text-white/60 hover:text-white">Investors</Link>
            <Link href="/" className="text-white/60 hover:text-white">Product</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 mb-6">
              <Shield className="h-3.5 w-3.5 text-[#9DB89E]" /> Regulatory Compliance
            </span>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
              Compliance is our <span className="bg-gradient-to-r from-[#D98B6E] to-[#9DB89E] bg-clip-text text-transparent">moat.</span>
            </h1>
            <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
              Indian healthcare is one of the most regulated sectors in the world. Nexura OS is built
              compliant from the architecture up — not as a feature, but as a principle.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Regulations grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-6xl space-y-6">
          {REGULATIONS.map((reg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 lg:p-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Left: header */}
                <div className="lg:w-1/3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${reg.statusColor}20`, color: reg.statusColor }}>
                      <Shield className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-display text-xl font-semibold">{reg.name}</p>
                      <p className="text-xs text-white/40">{reg.full}</p>
                    </div>
                  </div>
                  <span className="inline-block text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${reg.statusColor}15`, color: reg.statusColor }}>
                    {reg.status}
                  </span>
                  <p className="text-xs text-white/50 mt-3 leading-relaxed">{reg.desc}</p>
                  <p className="text-xs text-white/30 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {reg.timeline}
                  </p>
                </div>
                {/* Right: features */}
                <div className="lg:w-2/3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">What we've built</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {reg.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: reg.statusColor }} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Architecture principles */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 border-t border-white/5">
        <div className="mx-auto max-w-5xl pt-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight mb-8">Architecture principles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Lock, title: "Encryption everywhere", desc: "AES-256 at rest, TLS 1.3 in transit. No plaintext PII ever stored or transmitted." },
              { icon: FileCheck, title: "Audit trail", desc: "Every data access, modification, and deletion is logged with timestamp, user, and IP. Immutable." },
              { icon: Building2, title: "Data localization", desc: "All patient data stays in India. AWS Mumbai region. No cross-border data transfer." },
              { icon: Shield, title: "Role-based access", desc: "Granular RBAC. Doctors see clinical data, admins see financials, patients see their own records only." },
              { icon: CheckCircle2, title: "Consent-first", desc: "DPDP-compliant consent flow. Patients can grant, revoke, or limit data sharing at any time." },
              { icon: Clock, title: "Breach notification", desc: "Automated breach detection. 72-hour notification to authorities + patients per DPDP 2023." },
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#D98B6E]/10 text-[#D98B6E] mb-3">
                  <p.icon className="h-4 w-4" />
                </span>
                <p className="font-medium text-white text-sm">{p.title}</p>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-[#D98B6E]/10 to-[#9DB89E]/5 border border-white/10 p-8 text-center">
          <h2 className="font-display text-2xl font-semibold mb-2">Need a compliance audit?</h2>
          <p className="text-white/60 text-sm mb-6">Our team can walk you through every regulation and how Nexura OS addresses it.</p>
          <a href="mailto:compliance@nexuraai.in" className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#0A0A0A] px-5 py-2.5 text-sm font-semibold hover:bg-white/90">
            Contact compliance team <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
