"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Stethoscope,
  CalendarDays,
  Users,
  ClipboardList,
  FileText,
  Wallet,
  HeartPulse,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Reveal, AuroraBackground, FloatingParticles, BreathingOrb } from "./ambient";

const STEPS = [
  { icon: CalendarDays, label: "Patient arrives", desc: "Token booked in one tap" },
  { icon: ClipboardList, label: "Quick consult", desc: "Vitals → Dx → Rx in seconds" },
  { icon: Wallet, label: "Auto-billed", desc: "Invoice + payment, done" },
];

export function ClinicPromo() {
  return (
    <section id="clinic" className="relative overflow-hidden py-24 lg:py-32">
      <AuroraBackground variant="honey" />
      <FloatingParticles count={12} color="var(--honey)" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
                <Stethoscope className="h-3.5 w-3.5" />
                New · Nexura Clinic OS
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[3.2rem]">
                A clinic OS so simple,{" "}
                <span className="text-gradient-warm">it feels calm.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Built for solo practitioners &amp; small clinics. Book, consult,
                prescribe &amp; bill — all on one warm screen. No training
                needed, no clutter, no lag. Just care.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/clinic"
                  className="mat-btn mat-btn--lg mat-btn--glass group"
                  style={{ "--mat-accent": "#0F766E", "--mat-accent-2": "#14B8A6" } as React.CSSProperties}
                >
                  Launch Clinic OS
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <span className="text-xs text-muted-foreground">
                  3 tabs · one screen · zero learning curve
                </span>
              </div>
            </Reveal>

            {/* 3 simple steps */}
            <Reveal delay={0.24}>
              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                {STEPS.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative rounded-2xl border border-border bg-card/60 p-4"
                  >
                    <span className="absolute right-3 top-3 font-display text-2xl font-bold text-muted-foreground/15">{i + 1}</span>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-honey/15 text-honey">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-semibold">{s.label}</p>
                    <p className="text-[0.7rem] text-muted-foreground">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {["Print-ready Rx", "Patient timeline", "Revenue trends", "No install"].map((f) => (
                  <span key={f} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-sage" />{f}</span>
                ))}
              </div>
            </Reveal>
          </div>

          {/* visual */}
          <Reveal delay={0.2} y={32}>
            <ClinicVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ClinicVisual() {
  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-md">
      <BreathingOrb size={280} color="var(--honey)" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />
      <motion.div
        className="absolute inset-0 m-auto h-[88%] w-[88%] overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_30px_80px_-30px_oklch(0.4_0.05_45/0.4)]"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-semibold">Dr. Rao Family Clinic</span>
            <span className="flex items-center gap-1 rounded-full bg-sage/25 px-2 py-0.5 text-[0.55rem]"><span className="h-1 w-1 rounded-full bg-sage anim-breathe" />Today</span>
          </div>
        </div>
        <div className="space-y-2 p-3">
          {/* 3 simple tabs */}
          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            {["Today", "Patients", "Billing"].map((t, i) => (
              <span key={t} className={`flex-1 rounded-md px-2 py-1 text-center text-[0.6rem] font-medium ${i === 0 ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>{t}</span>
            ))}
          </div>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { l: "Patients", v: "8", c: "var(--coral)" },
              { l: "Today", v: "9", c: "var(--sage)" },
              { l: "Waiting", v: "2", c: "var(--honey)" },
              { l: "Revenue", v: "₹2.4k", c: "var(--clay)" },
            ].map((k) => (
              <div key={k.l} className="rounded-lg border border-border bg-background p-2">
                <p className="text-[0.5rem] uppercase tracking-wide text-muted-foreground">{k.l}</p>
                <p className="font-display text-sm font-bold" style={{ color: k.c }}>{k.v}</p>
              </div>
            ))}
          </div>
          {/* queue */}
          {[
            { n: "Sunita Sharma", t: "09:30", s: "done", c: "sage" },
            { n: "Rahul Verma", t: "10:00", s: "arrived", c: "honey" },
            { n: "Arjun Kumar", t: "10:30", s: "booked", c: "muted" },
          ].map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.12 }}
              className="flex items-center gap-2 rounded-lg border border-border bg-background p-1.5"
            >
              <span className="grid h-6 w-6 place-items-center rounded bg-primary/10 text-[0.55rem] font-bold text-primary">#{i + 1}</span>
              <div className="flex-1"><p className="text-[0.65rem] font-medium">{r.n}</p><p className="text-[0.5rem] text-muted-foreground">{r.t}</p></div>
              <span className={`rounded-full px-1.5 py-0.5 text-[0.5rem] font-medium ${r.c === "sage" ? "bg-sage/15 text-sage" : r.c === "honey" ? "bg-honey/15 text-honey" : "bg-muted text-muted-foreground"}`}>{r.s}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* floating consult chip */}
      <motion.div
        className="absolute -right-2 top-1/3 w-32 rounded-xl border border-border bg-card p-2.5 shadow-xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      >
        <ClipboardList className="h-3.5 w-3.5 text-honey" />
        <p className="mt-1 text-[0.6rem] font-semibold">Quick consult</p>
        <p className="text-[0.5rem] text-muted-foreground">Vitals → Rx → bill</p>
      </motion.div>
    </div>
  );
}
