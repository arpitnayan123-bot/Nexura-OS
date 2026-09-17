"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const CREDITS = [
  { text: "Curated India medicine reference — brand, salt, HSN and Schedule H data maintained in-platform", link: null },
  { text: "CDSCO Schedule H & Schedule X compliance checks applied at billing time", link: null },
  { text: "AI prescription reading — server-side AI vision; images are processed, not stored", link: null },
  { text: "Built on Next.js — DPDP-aligned, self-hostable, works offline-first on shop networks", link: null },
];

export function CreditsFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-[#1E2228] bg-[#0A0C0F]">
      {/* particle animation background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#F59E0B]/20"
            initial={{ x: `${Math.random() * 100}%`, y: "100%", opacity: 0 }}
            animate={{ y: "-100%", opacity: [0, 0.6, 0] }}
            transition={{
              duration: 8 + Math.random() * 8,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative px-6 py-6">
        {/* credits with fade-in stagger */}
        <div className="space-y-1.5">
          {CREDITS.map((c, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="flex items-center gap-1 text-[0.65rem] text-[#7D848E]"
            >
              {c.text}
              {c.link && <ExternalLink className="inline h-2.5 w-2.5 opacity-40" />}
            </motion.p>
          ))}
        </div>

        {/* Nexura AI branding — slow glowing pulse */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-4 flex items-center gap-2"
        >
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 rounded-full bg-[#F59E0B]"
          />
          <p className="text-xs font-medium text-[#6B7280]">
            Nexura Pharmacia — Built in India for Indian Pharmacies — by{" "}
            <motion.span
              animate={{ color: ["#6B7280", "#F59E0B", "#6B7280"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="font-semibold"
            >
              Nexura AI
            </motion.span>{" "}
            <a href="https://nexuraai.in" target="_blank" rel="noreferrer" className="text-[#A3762A] underline hover:text-[#E8B04B]">
              (nexuraai.in)
            </a>
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
