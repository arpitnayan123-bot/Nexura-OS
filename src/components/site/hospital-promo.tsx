"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BedDouble,
  Users,
  FlaskConical,
  Receipt,
  Activity,
  ArrowRight,
  Building2,
  Stethoscope,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { Reveal, AuroraBackground, FloatingParticles, BreathingOrb } from "./ambient";

const MODULES = [
  { icon: Activity, label: "Live Dashboard", desc: "Bed occupancy, OPD, revenue KPIs" },
  { icon: Users, label: "ADT & Patients", desc: "Register, admit, discharge, transfer" },
  { icon: BedDouble, label: "Beds & Wards", desc: "Visual bed map, ICU/CCU/private" },
  { icon: CalendarDays, label: "OPD Appointments", desc: "Tokens, doctor calendars, triage" },
  { icon: Stethoscope, label: "Clinical EHR", desc: "Vitals, diagnoses, Rx, notes" },
  { icon: FlaskConical, label: "Lab & Radiology", desc: "Orders, results, reporting" },
  { icon: Receipt, label: "Billing & Insurance", desc: "Invoices, claims, TPA, GST" },
  { icon: TrendingUp, label: "Analytics", desc: "Revenue trends, ward load" },
];

export function HospitalPromo() {
  return (
    <section id="hospital" className="relative overflow-hidden py-24 lg:py-32">
      <AuroraBackground variant="sage" />
      <FloatingParticles count={12} color="var(--sage)" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
                <Building2 className="h-3.5 w-3.5" />
                New · Nexura Hospital OS
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[3.2rem]">
                The complete <span className="text-gradient-warm">hospital operating system.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Automate every area of your hospital — admissions, EHR, beds, OPD, labs, billing
                &amp; analytics — in one calm, fast, premium web app. No installs. Runs on any
                computer or tablet. Built to replace clunky legacy ERPs with something genuinely
                simple.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/hospital"
                  className="mat-btn mat-btn--lg mat-btn--textured group"
                  style={
                    {
                      "--mat-accent": "#A16207",
                      "--mat-accent-2": "#C88A1F",
                    } as React.CSSProperties
                  }
                >
                  Launch Hospital OS
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <span className="text-xs text-muted-foreground">
                  8 modules · real-time · no install
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                {MODULES.map((m, i) => (
                  <motion.div
                    key={m.label}
                    whileHover={{ y: -2 }}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                      <m.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{m.label}</p>
                      <p className="text-[0.7rem] text-muted-foreground">{m.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* visual */}
          <Reveal delay={0.2} y={32}>
            <HospitalVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function HospitalVisual() {
  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-md">
      <BreathingOrb
        size={280}
        color="var(--coral)"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50"
      />
      <motion.div
        className="absolute inset-0 m-auto h-[88%] w-[88%] overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_30px_80px_-30px_oklch(0.4_0.05_45/0.4)]"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-semibold">Sunrise Care Hospital</span>
            <span className="flex items-center gap-1 rounded-full bg-sage/25 px-2 py-0.5 text-[0.55rem]">
              <span className="h-1 w-1 rounded-full bg-sage anim-breathe" /> Live
            </span>
          </div>
        </div>
        <div className="space-y-2 p-3">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { l: "Beds", v: "17%", s: "7/41", c: "var(--coral)" },
              { l: "OPD today", v: "9", s: "5 done", c: "var(--sage)" },
              { l: "Revenue", v: "₹3.5k", s: "today", c: "var(--honey)" },
              { l: "Admitted", v: "7", s: "active", c: "var(--clay)" },
            ].map((k) => (
              <div key={k.l} className="rounded-lg border border-border bg-background p-2">
                <p className="text-[0.55rem] uppercase tracking-wide text-muted-foreground">
                  {k.l}
                </p>
                <p className="font-display text-base font-bold" style={{ color: k.c }}>
                  {k.v}
                </p>
                <p className="text-[0.5rem] text-muted-foreground">{k.s}</p>
              </div>
            ))}
          </div>
          {/* ward bar */}
          <div className="rounded-lg border border-border bg-background p-2">
            <p className="mb-1 text-[0.55rem] uppercase tracking-wide text-muted-foreground">
              Ward occupancy
            </p>
            {[
              { n: "ICU", v: 50, c: "var(--coral)" },
              { n: "CCU", v: 75, c: "var(--honey)" },
              { n: "General", v: 30, c: "var(--sage)" },
            ].map((w) => (
              <div key={w.n} className="mb-1 flex items-center gap-2">
                <span className="w-12 text-[0.55rem] text-muted-foreground">{w.n}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: w.c }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${w.v}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* patient row */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 font-display text-[0.6rem] font-bold text-primary">
              #3
            </span>
            <div className="flex-1">
              <p className="text-[0.65rem] font-medium">Ramesh Patel</p>
              <p className="text-[0.5rem] text-muted-foreground">SUN-10001 · 09:30</p>
            </div>
            <span className="rounded-full bg-sage/15 px-1.5 py-0.5 text-[0.5rem] font-medium text-sage">
              done
            </span>
          </div>
        </div>
      </motion.div>

      {/* floating chips */}
      <motion.div
        className="absolute -left-2 top-10 w-32 rounded-xl border border-border bg-card p-2.5 shadow-xl"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      >
        <BedDouble className="h-3.5 w-3.5 text-coral" />
        <p className="mt-1 text-[0.6rem] font-semibold">ICU-01 occupied</p>
        <p className="text-[0.5rem] text-muted-foreground">Ramesh Patel · MI</p>
      </motion.div>

      <motion.div
        className="absolute -right-2 bottom-16 w-32 rounded-xl border border-border bg-card p-2.5 shadow-xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      >
        <FlaskConical className="h-3.5 w-3.5 text-honey" />
        <p className="mt-1 text-[0.6rem] font-semibold">CBC resulted</p>
        <p className="text-[0.5rem] text-sage">within normal limits</p>
      </motion.div>
    </div>
  );
}
