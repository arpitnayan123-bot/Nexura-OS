"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Pill, HeartPulse, Building2, Stethoscope, CheckCircle2, ScanLine, FileText, Video } from "lucide-react";

const COMPLIANCE = [
  { icon: ScanLine, title: "Schedule H2 QR Authentication", desc: "Barcode/QR verification on vaccines, antimicrobials, anticancer & NDPS drugs per Drugs (Seventh Amendment) Rules 2026", products: ["Pharmacy"] },
  { icon: ShieldCheck, title: "Schedule H/H1/NDPS Drug Register", desc: "Mandatory prescription drug register with patient + doctor details per Drugs & Cosmetics Rules 1945, Rule 65", products: ["Pharmacy"] },
  { icon: HeartPulse, title: "ABDM-Ready Health Records (alignment in progress)", desc: "ABHA IDs captured on file, FHIR-based records — Health Information Exchange sync via ABDM is in progress", products: ["Clinic", "Hospital"] },
  { icon: Video, title: "NMC Telemedicine Guidelines", desc: "Video/audio/text consults with mandatory doctor MCI/NMC registration + patient consent per NMC 2020", products: ["Clinic"] },
  { icon: FileText, title: "ICD-10 Diagnosis Coding", desc: "WHO-standard ICD-10 codes on all diagnoses for insurance + government reporting", products: ["Clinic", "Hospital"] },
  { icon: ShieldCheck, title: "IRDAI TPA Cashless Workflow", desc: "Pre-authorization → approval → cashless discharge per IRDAI insurance guidelines", products: ["Hospital"] },
  { icon: Pill, title: "GST e-Invoice (CGST + SGST)", desc: "Indian GST slabs (0/5/12/18%) with CGST + SGST breakdown, GSTR-1 export", products: ["Pharmacy", "Clinic"] },
  { icon: Building2, title: "E-Pharmacy Compliance", desc: "Schedule X/H/H1 drug tracking, prescription upload, RMP verification per draft e-pharmacy rules", products: ["Pharmacy"] },
];

export function IndiaCompliance() {
  return (
    <section className="relative overflow-hidden py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full glass-chip px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-sage" />
            Built for India · Indian Law Compliant
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Every feature complies with{" "}
            <span className="text-gradient-warm">Indian health law.</span>
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-sm text-muted-foreground">
            Researched across US (PioneerRx), China (AI hospital automation), Japan (lean hospital design) —
            and adapted to India's unique regulatory landscape.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {COMPLIANCE.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="group flex items-start gap-3 rounded-2xl glass-soft p-4 transition-all hover:border-primary/30 hover:shadow-depth"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{c.title}</p>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sage" />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.desc}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {c.products.map((p) => (
                    <span key={p} className="rounded-full bg-accent/40 px-1.5 py-0.5 text-[0.55rem] font-medium text-muted-foreground">{p}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
