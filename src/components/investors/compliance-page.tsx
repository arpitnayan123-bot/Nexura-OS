"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, CheckCircle2, Clock, ArrowRight, HeartPulse, FileCheck, Lock, Building2, Download, PencilLine, Trash2, LifeBuoy } from "lucide-react";

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
      "Single-region deployment; India-region hosting planned",
      "Right to erasure (self-serve in Foresight; clinic-desk assisted)",
      "Hash-chained, tamper-evident audit trail",
      "Breach-response playbook; automated detection planned",
      "Data-retention engine with configurable purge profiles",
    ],
    timeline: "Alignment tracked since launch",
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
    timeline: "Alignment tracked since launch",
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
    timeline: "Alignment tracked since launch",
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
    timeline: "Alignment tracked since launch",
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
      <section className="relative overflow-hidden pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div aria-hidden className="aurora-gold -top-32 left-1/2 h-[24rem] w-[40rem] -translate-x-1/2 opacity-35" />
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="badge-lux mb-6 border-white/15 bg-white/5 text-[#EED9A8]">
              <Shield className="h-3.5 w-3.5 text-[#D9B87C]" /> Regulatory Compliance
            </span>
            <h1 className="title-lux text-4xl sm:text-5xl">
              Compliance is our <span className="text-gold-gradient">moat.</span>
            </h1>
            <p className="lede-lux mx-auto mt-6 max-w-2xl text-white/60">
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
              className="group relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-500 hover:border-[#D9B87C]/25 lg:p-8"
            >
              {/* champagne top-light reveal */}
              <span aria-hidden className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#D9B87C]/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
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
              { icon: Lock, title: "Encryption in transit", desc: "TLS/HTTPS for all traffic today. At-rest encryption is on the roadmap and not yet enabled on the current database." },
              { icon: FileCheck, title: "Tamper-evident audit trail", desc: "Every API action is logged with timestamp, user, and role into a SHA-256 hash chain — retroactive edits break the chain, and Merkle block roots can be shared with auditors for independent verification." },
              { icon: Building2, title: "Hosting & residency", desc: "Single-region deployment today; Mumbai-region India hosting planned. No cross-border replication is built into the architecture." },
              { icon: Shield, title: "Role-based access", desc: "Session-based auth with role + attribute permission checks enforced on every /api route — doctors see clinical data, admins see financials, patients see their own records." },
              { icon: CheckCircle2, title: "Consent-first", desc: "Consent is captured as granted/denied per purpose (treatment, data share, research, telemedicine) and every capture is audit-logged. Withdrawal requests are handled via the clinic desk." },
              { icon: Clock, title: "Breach response", desc: "Breach-response playbook defined; automated detection planned. Incidents are reviewed manually today through the incident module." },
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

      {/* Your DPDP rights */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 border-t border-white/5">
        <div className="mx-auto max-w-5xl pt-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Your DPDP rights</h2>
          <p className="text-sm text-white/50 mt-2 mb-8">How to exercise them today — self-serve where the product supports it, clinic-desk assisted where it is manual.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Download, title: "Access & export your data", desc: "Foresight Settings → “Download my data (JSON)” exports everything the engine stores about you. For hospital records, ask at the clinic desk." },
              { icon: PencilLine, title: "Correct inaccurate data", desc: "Raise corrections with your doctor or the clinic desk. Fixes are made on the source record, and every change lands in the audit trail." },
              { icon: Trash2, title: "Withdraw consent & delete", desc: "Settings → “Delete all my runs” wipes your Foresight data instantly. Hospital consents (treatment, data share, research) are withdrawn via the clinic desk — and audit-logged." },
              { icon: LifeBuoy, title: "Grievance redressal", desc: "Start at the clinic desk, or email compliance@nexuraai.in. Every request is logged and tracked to closure." },
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#9DB89E]/10 text-[#9DB89E] mb-3">
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
