"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarHeart,
  Phone,
  Mail,
  MapPin,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { Reveal, AuroraBackground, BreathingOrb, FloatingParticles, GrainOverlay } from "./ambient";
import { Logo } from "./navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function CtaFooter() {
  return (
    <div id="cta" className="relative">
      <CtaBanner />
      <Footer />
    </div>
  );
}

function CtaBanner() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "early_access" }),
      });
      if (!res.ok) throw new Error();
      toast.success("You're on the list — welcome to calmer care.");
      setEmail("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <AuroraBackground variant="default" />
      <FloatingParticles count={16} />
      <GrainOverlay />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          {/* Liquid Gold climax — deep charcoal ground, champagne light */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#26221E] via-[#1C1917] to-[#141210] p-8 text-[#F6F1E7] shadow-[0_48px_120px_-48px_oklch(0.2_0.03_55/0.7)] sm:p-12">
            {/* champagne aurora hearts inside the card */}
            <div
              aria-hidden
              className="aurora-gold -right-24 -top-24 h-80 w-80 opacity-50"
              style={{ filter: "blur(70px)" }}
            />
            <div
              aria-hidden
              className="aurora-gold -bottom-28 left-1/4 h-64 w-72 opacity-30"
              style={{ animationDelay: "-5s", filter: "blur(80px)" }}
            />
            <div className="absolute -right-12 -top-12 opacity-30">
              <BreathingOrb size={260} color="#D9B87C" ring={false} />
            </div>
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <span className="badge-lux bg-white/8 text-[#EED9A8]">
                  <CalendarHeart className="h-3.5 w-3.5" /> Early access · Q1 cohort
                </span>
                <h2 className="title-lux mt-5 text-3xl sm:text-4xl lg:text-[2.9rem]">
                  Begin a <span className="text-gold-gradient">calmer relationship</span> with your
                  health today.
                </h2>
                <p className="mt-4 max-w-md text-sm text-[#F6F1E7]/75 sm:text-base">
                  Join 184,000+ people on the early-access list. We'll send you a warm welcome and
                  your personal scan link.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#F6F1E7]/70">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> HIPAA &amp; GDPR
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> No card required
                  </span>
                </div>
              </div>

              <form
                onSubmit={submit}
                className="rounded-3xl border border-white/12 bg-white/8 p-5 backdrop-blur-md"
              >
                <label
                  htmlFor="cta-email"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-[#EED9A8]/90"
                >
                  Email
                </label>
                <Input
                  id="cta-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@calmer.health"
                  className="mt-2 h-12 rounded-xl border-white/20 bg-white/90 text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="btn-gold group mt-3 h-12 w-full rounded-xl"
                >
                  {loading ? "Reserving…" : "Reserve my spot"}
                  {!loading && (
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  )}
                </Button>
                <p className="mt-2 text-center text-[0.65rem] text-[#F6F1E7]/60">
                  By joining you agree to our calm privacy policy.
                </p>
              </form>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    {
      title: "Platform",
      links: [
        "AI diagnostics",
        "Continuous monitoring",
        "Care plans",
        "Telemedicine",
        "Pharmacy sync",
      ],
    },
    {
      title: "Company",
      links: ["About", "Careers", "Press", "Partners", "Trust & safety"],
    },
    {
      title: "Resources",
      links: ["Help center", "Clinical evidence", "Developer API", "Status", "Changelog"],
    },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-card/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <Logo />
              <div className="leading-none">
                <p className="font-display text-lg font-semibold">
                  Nexura<span className="text-primary"> OS</span>
                </p>
                <p className="text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                  Health · OS
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A calmer operating system for health. Quietly listening, gently nudging, always human
              at the core.
            </p>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <a className="flex items-center gap-2 hover:text-foreground" href="tel:+18005550100">
                <Phone className="h-3.5 w-3.5" /> +1 (800) 555-0100
              </a>
              <a
                className="flex items-center gap-2 hover:text-foreground"
                href="mailto:care@nexura.os"
              >
                <Mail className="h-3.5 w-3.5" /> care@nexura.os
              </a>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" /> 14 Calmer Lane, Suite 200
              </p>
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                {c.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-3" />
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Nexura. Crafted with warmth. Not a replacement for
            emergency care.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sage anim-breathe" />
              All systems calm
            </span>
            <a href="/privacy" className="hover:text-foreground">
              Privacy
            </a>
            <a href="/terms" className="hover:text-foreground">
              Terms
            </a>
            <a href="/privacy" className="hover:text-foreground">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
