"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, BrainCircuit, ChevronRight, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useBooking } from "./booking-context";
import { HamburgerMenu } from "./hamburger-menu";
import { HowItWorksExplorer } from "./how-it-works/explorer";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const { openBooking } = useBooking();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "py-2" : "py-4"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav
          className={cn(
            "relative flex items-center justify-between rounded-2xl px-4 transition-all duration-500 sm:px-5",
            scrolled
              ? "glass-lux h-14 shadow-none"
              : "h-16 bg-transparent"
          )}
        >
          {/* Logo */}
          <Link href="#top" className="group flex items-center gap-2.5">
            <Logo />
            <div className="flex flex-col leading-none">
              <span className="font-display text-[1.05rem] font-semibold tracking-tight">
                Nexura<span className="text-primary"> OS</span>
              </span>
              <span className="text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                Health · OS
              </span>
            </div>
          </Link>

          {/* Actions — single cluster, works on all breakpoints */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => setHowOpen(true)}
              variant="ghost"
              className="rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <CircleHelp className="h-4 w-4" />
                <span className="hidden lg:inline">How it works</span>
                <span className="hidden sm:inline lg:hidden">How&nbsp;it&nbsp;works</span>
              </span>
            </Button>
            <Link
              href="/predictive"
              className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <BrainCircuit className="h-4 w-4" />
              <span className="hidden lg:inline">Predictive</span>
            </Link>
            <Button
              onClick={() => openBooking()}
              className="btn-gold group rounded-full"
            >
              <span className="flex items-center gap-1.5">
                <span className="sm:hidden">Book</span>
                <span className="hidden sm:inline">Book a visit</span>
                <ChevronRight className="hidden h-4 w-4 transition-transform group-hover:translate-x-0.5 sm:inline" />
              </span>
            </Button>
            <HamburgerMenu />
          </div>
        </nav>
      </div>

      {/* How-it-works explorer — every feature of the ecosystem, in crisp steps */}
      <HowItWorksExplorer open={howOpen} onOpenChange={setHowOpen} />
    </header>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-coral via-honey to-sage anim-gradient",
        className
      )}
    >
      <Activity className="h-4.5 w-4.5 text-white" strokeWidth={2.6} />
      <span className="absolute inset-0 rounded-xl ring-1 ring-white/30" />
    </span>
  );
}
