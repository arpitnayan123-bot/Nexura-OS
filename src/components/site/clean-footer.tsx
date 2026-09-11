"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export function CleanFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-border bg-card/40">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(50%_100%_at_50%_100%,oklch(0.85_0.10_55/0.15),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* top — links */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-coral via-honey to-sage anim-gradient">
              <Activity className="h-4 w-4 text-white" strokeWidth={2.6} />
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
            <Link href="/founder" className="hover:text-foreground">The Founder</Link>
            <Link href="/global" className="hover:text-foreground">Nexura Global</Link>
            <Link href="/know-your-health" className="hover:text-foreground">Know Your Health</Link>
            <Link href="/connect" className="hover:text-foreground">Connect</Link>
            <Link href="/hospital" className="hover:text-foreground">Nexura Hospital OS</Link>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground/60">© {new Date().getFullYear()} Nexura</span>
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
          <p className="max-w-md text-center text-[0.65rem] leading-relaxed text-muted-foreground/60">
            Built for ABDM (Ayushman Bharat Digital Mission) alignment, Drugs &amp;
            Cosmetics Rules 1945, ICD-10, IRDAI TPA guidelines &amp; Indian GST
            e-invoice structure.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
