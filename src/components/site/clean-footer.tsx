"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, HeartHandshake, PhoneCall } from "lucide-react";

export function CleanFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-[#EFE9E0] bg-[#F4EFE4]/40">
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* 108 emergency band — Linen crisis red, cream ink (8.1:1) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="nx-crisis mb-10 flex flex-col gap-5 rounded-[1.75rem] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8"
          aria-label="Emergency helplines"
        >
          <div className="flex items-start gap-3.5">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15"
              aria-hidden="true"
            >
              <PhoneCall className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[1.05rem] font-semibold leading-snug">
                In an emergency, every second counts.
              </p>
              <p className="mt-1 text-sm text-[#FFF4EC]/85">
                <strong className="font-semibold">108</strong> — free, 24×7, across India · Mental
                health: Tele-MANAS <strong className="font-semibold">14416</strong>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <a href="tel:108" className="nx-crisis-cta text-sm">
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              Call 108 now
            </a>
            <a
              href="tel:14416"
              className="nx-crisis-ghost text-sm"
              aria-label="Call Tele-MANAS 14416 mental health helpline"
            >
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              14416
            </a>
          </div>
        </motion.div>

        {/* top — links */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-coral via-honey to-sage anim-gradient">
              <Activity className="h-4 w-4 text-white" strokeWidth={2.6} aria-hidden="true" />
            </span>
            <div className="leading-none">
              <p className="font-display text-sm font-semibold">
                Nexura<span className="text-primary"> OS</span>
              </p>
              <p className="text-[0.55rem] uppercase tracking-[0.22em] text-muted-foreground">
                Health · OS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link href="/founder" className="hover:text-foreground">
              The Founder
            </Link>
            <Link href="/global" className="hover:text-foreground">
              Nexura Global
            </Link>
            <Link href="/know-your-health" className="hover:text-foreground">
              Know Your Health
            </Link>
            <Link href="/connect" className="hover:text-foreground">
              Connect
            </Link>
            <Link href="/hospital" className="hover:text-foreground">
              Nexura Hospital OS
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[#6E6A66]">© {new Date().getFullYear()} Nexura</span>
          </div>
        </div>

        {/* divider */}
        <div className="my-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* bottom — compliance note */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-2"
        >
          <p className="max-w-md text-center text-[0.65rem] leading-relaxed text-[#6E6A66]">
            Built for ABDM (Ayushman Bharat Digital Mission) alignment, Drugs &amp; Cosmetics Rules
            1945, ICD-10, IRDAI TPA guidelines &amp; Indian GST e-invoice structure.
          </p>
          <p className="text-center text-[0.65rem] leading-relaxed text-[#6E6A66]">
            Emergencies: call 108 · Mental health: Tele-MANAS 14416 (free, 24×7)
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
