"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  HeartPulse,
  Building2,
  ArrowUpRight,
  MessageCircle,
  Sparkles,
  Globe,
} from "lucide-react";
import { Reveal } from "./ambient";

const PRODUCTS = [
  {
    icon: Building2,
    name: "Hospital OS",
    tagline: "Complete HMS",
    desc: "Epic + Oracle inspired — OPD, IPD, OT, EHR, nursing station, BPA alerts, AI clinical intelligence, insurance & TPA, blood bank, staff management, ABHA, WhatsApp.",
    href: "/hospital",
    accent: "#C98A7A",
    gradient: "from-[#C98A7A] to-[#A96A5A]",
    badge: "Flagship",
  },
  {
    icon: Globe,
    name: "Nexura Global",
    tagline: "Medical Tourism",
    desc: "World-class Indian healthcare for global patients. Discovery portal, cost calculator, hospital profiles, coordinator dashboard.",
    href: "/global",
    accent: "#1E40AF",
    gradient: "from-[#0F172A] to-[#1E40AF]",
    badge: "New",
  },
  {
    icon: MessageCircle,
    name: "Nexura Connect",
    tagline: "Doctor-Patient Link",
    desc: "Unified chat, voice & video. Auto-connects when consultations complete or symptom triage flags urgency.",
    href: "/connect",
    accent: "#D98B6E",
    gradient: "from-[#D98B6E] to-[#C97A5D]",
    badge: "New",
  },
  {
    icon: Sparkles,
    name: "Know Your Health",
    tagline: "AI Health Tools",
    desc: "15 AI tools — symptom checker, lab analyzer, derma scan, X-ray reader, diet planner & more. Powered by Gemini.",
    href: "/know-your-health",
    accent: "#9DB89E",
    gradient: "from-[#9DB89E] to-[#7DA88E]",
    badge: "New",
  },
  {
    icon: HeartPulse,
    name: "Hospital OS",
    tagline: "Hospital operating system",
    desc: "AI diagnostics, continuous monitoring & living care plans for patients.",
    href: "#top",
    accent: "#D98B6E",
    gradient: "from-[#D98B6E] to-[#E0B080]",
  },
];

export function ProductShowcase() {
  return (
    <section className="relative py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem]">
              Four products.{" "}
              <span className="text-gradient-warm">One warm ecosystem.</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              From a full hospital OS to AI health tools — choose what fits.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <Link
                href={p.href}
                className="group relative block overflow-hidden rounded-[1.75rem] glass-premium p-6 transition-all hover:shadow-[0_20px_60px_-30px_oklch(0.4_0.05_45/0.3)] sm:p-8"
              >
                {/* hover gradient glow */}
                <div
                  className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30"
                  style={{ background: p.accent }}
                />

                {/* icon */}
                <div className="relative flex items-start justify-between">
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg anim-breathe"
                    style={{ backgroundImage: `linear-gradient(135deg, ${p.accent}, color-mix(in srgb, ${p.accent} 70%, #E8C889))` }}
                  >
                    <p.icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <div className="flex items-center gap-2">
                    {"badge" in p && p.badge && (
                      <span className="rounded-full bg-[#D98B6E] px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-white shadow-sm">
                        {p.badge}
                      </span>
                    )}
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
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

                {/* bottom accent line */}
                <div
                  className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                  style={{ background: p.accent }}
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
