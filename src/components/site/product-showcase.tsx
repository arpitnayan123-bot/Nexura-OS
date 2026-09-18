"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  ArrowUpRight,
  MessageCircle,
  Sparkles,
  Globe,
  FlaskConical,
} from "lucide-react";
import { Reveal } from "./ambient";

const PRODUCTS = [
  {
    icon: Building2,
    name: "Hospital OS",
    tagline: "Complete HMS",
    desc: "Epic + Oracle inspired — OPD, IPD, OT, EHR, nursing station, BPA alerts, AI clinical intelligence, insurance & TPA, blood bank, staff management, ABHA, WhatsApp.",
    href: "/hospital",
    accent: "#A16207",
    gradient: "from-[#8F5E06] to-[#D9B87C]",
    badge: "Flagship",
  },
  {
    icon: Globe,
    name: "Nexura Global",
    tagline: "Medical Tourism",
    desc: "World-class Indian healthcare for global patients. Discovery portal, cost calculator, hospital profiles, coordinator dashboard.",
    href: "/global",
    accent: "#A16207",
    gradient: "from-[#5C4408] to-[#B8860B]",
    badge: "New",
  },
  {
    icon: MessageCircle,
    name: "Nexura Connect",
    tagline: "Doctor-Patient Link",
    desc: "Unified chat, voice & video. Auto-connects when consultations complete or symptom triage flags urgency.",
    href: "/connect",
    accent: "#A16207",
    gradient: "from-[#8F5E06] to-[#D9B87C]",
    badge: "New",
  },
  {
    icon: Sparkles,
    name: "Know Your Health",
    tagline: "AI Health Tools",
    desc: "15 AI tools — symptom checker, lab analyzer, derma scan, X-ray reader, diet planner & more. Powered by AI.",
    href: "/know-your-health",
    accent: "#A16207",
    gradient: "from-[#8F5E06] to-[#D9B87C]",
    badge: "New",
  },
  {
    icon: FlaskConical,
    name: "Nexura Labs",
    tagline: "Diagnostics, Decoded",
    desc: "400+ tests collected at home in 30-minute windows, run in NABL-certified labs, decoded by AI into plain language — reports in 4–12 hours.",
    href: "/labs",
    accent: "#A16207",
    gradient: "from-[#8F5E06] to-[#D9B87C]",
    badge: "New",
  },
];

export function ProductShowcase() {
  return (
    <section className="relative py-20 lg:py-28">
      {/* champagne ambience behind the chapter */}
      <div
        aria-hidden
        className="aurora-gold top-24 left-1/2 h-[24rem] w-[40rem] -translate-x-1/2 opacity-45"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">The Nexura suite</span>
            <h2 className="title-lux mt-4 text-3xl sm:text-4xl lg:text-[2.75rem]">
              Four products. <span className="text-gold-gradient">One warm ecosystem.</span>
            </h2>
            <p className="lede-lux mt-4 text-base sm:text-lg">
              From a full hospital OS to AI health tools — choose what fits.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <Link
                href={p.href}
                className="card-lux card-lux-hover group relative block overflow-hidden rounded-[1.75rem] p-6 sm:p-8"
              >
                {/* hover gradient glow */}
                <div
                  className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30"
                  style={{ background: p.accent }}
                />

                {/* icon — champagne-ringed tile */}
                <div className="relative flex items-start justify-between">
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl text-white anim-breathe"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${p.accent}, color-mix(in srgb, ${p.accent} 70%, #E8C889))`,
                      boxShadow: `0 10px 24px -10px color-mix(in srgb, ${p.accent} 55%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.35)`,
                    }}
                  >
                    <p.icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <div className="flex items-center gap-2">
                    {"badge" in p && p.badge && (
                      <span className="badge-lux px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em]">
                        {p.badge}
                      </span>
                    )}
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-border/70 text-muted-foreground/50 transition-all duration-300 group-hover:border-[#A16207]/40 group-hover:bg-[#A16207]/8 group-hover:text-[#A16207]">
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>

                {/* text */}
                <div className="relative mt-5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl font-semibold tracking-tight">{p.name}</h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-[0.6rem] font-medium"
                      style={{
                        background: `color-mix(in srgb, ${p.accent} 12%, transparent)`,
                        color: p.accent,
                      }}
                    >
                      {p.tagline}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                </div>

                {/* bottom champagne hairline wipe */}
                <div
                  className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)`,
                  }}
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
