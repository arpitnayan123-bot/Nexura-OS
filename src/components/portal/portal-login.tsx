"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeartPulse,
  Phone,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Loader2,
  KeyRound,
  Building2,
  FlaskConical,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEMO_PHONE = "+919820099880";
const DEMO_OTP = "1234";

const TRUST_BADGES = [
  { label: "ABDM-aligned", icon: ShieldCheck },
  { label: "DPDP 2023 principles", icon: ShieldCheck },
  { label: "Phone-first login", icon: Phone },
];

const FEATURES = [
  {
    icon: Building2,
    title: "Unified Records",
    desc: "Hospital, clinic, lab & pharmacy in one calm place.",
  },
  {
    icon: FlaskConical,
    title: "Blood at Home",
    desc: "Pick a home-visit slot from tomorrow — reports in 6–24 hours by panel.",
  },
  {
    icon: Brain,
    title: "AI Report Reading",
    desc: "Optional AI-assisted reading of your blood-test reports, in plain English.",
  },
];

type Stage = "phone" | "otp";

export function PortalLogin() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState(DEMO_PHONE);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentOtp, setSentOtp] = useState<string>("");

  // Check if already logged in
  useEffect(() => {
    fetch("/api/portal/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) router.replace("/portal");
      })
      .catch(() => {});
  }, [router]);

  const sendOtp = async (p?: string) => {
    const phoneToUse = p ?? phone;
    if (phoneToUse.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_otp", phone: phoneToUse }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to send OTP");
      setSentOtp(d.otp || DEMO_OTP);
      setStage("otp");
      toast.success("OTP sent", { description: `Demo OTP: ${d.otp}` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Verification failed");
      toast.success("Welcome back to Nexura Portal");
      router.replace("/portal");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const useDemo = async () => {
    setPhone(DEMO_PHONE);
    setOtp(DEMO_OTP);
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: DEMO_PHONE, otp: DEMO_OTP }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      toast.success("Welcome, Suresh", {
        description: "Demo credentials verified — entering your portal.",
      });
      router.replace("/portal");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAF7F2]">
      {/* Ambient warm blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-32 h-[32rem] w-[32rem] rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.85 0.10 80 / 0.55), transparent 70%)",
          }}
          animate={{ x: [0, 30, -10, 0], y: [0, -10, 20, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.86 0.08 155 / 0.45), transparent 70%)",
          }}
          animate={{ x: [0, -20, 10, 0], y: [0, 20, -10, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.85 0.10 75 / 0.4), transparent 70%)",
          }}
          animate={{ x: [0, 15, -15, 0], y: [0, -15, 15, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Floating particles */}
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 67) % 100}%`,
              top: `${(i * 37) % 100}%`,
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              background:
                i % 3 === 0
                  ? "oklch(0.72 0.12 80 / 0.4)"
                  : i % 3 === 1
                    ? "oklch(0.74 0.06 155 / 0.4)"
                    : "oklch(0.80 0.10 75 / 0.4)",
            }}
            animate={{ y: [0, -30, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 6 + (i % 4), repeat: Infinity, delay: -i * 0.5 }}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Glass card — Liquid Glass lux */}
          <div className="glass-lux relative overflow-hidden rounded-3xl shadow-[var(--shadow-lux-2)]">
            {/* Header gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#8F5E06] via-[#A16207] to-[#B8860B] p-7 text-white">
              <div
                aria-hidden
                className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl"
                style={{ animation: "nexura-breathe 6s ease-in-out infinite" }}
              />
              {/* champagne aurora heart */}
              <div
                aria-hidden
                className="aurora-gold -left-10 bottom-[-60%] h-48 w-64 opacity-45"
                style={{ filter: "blur(60px)" }}
              />
              {/* champagne top-light */}
              <div
                aria-hidden
                className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
              />
              <div className="relative flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                  <HeartPulse className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="font-display text-2xl font-semibold leading-none">
                    Nexura Portal
                  </h1>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-white/85">
                    Your calm health companion
                  </p>
                </div>
              </div>
              <p className="relative mt-4 text-sm leading-relaxed text-white/90">
                One account for your hospital records, blood tests at home, and AI-guided health
                insights — built for India.
              </p>

              {/* Trust badges */}
              <div className="relative mt-5 flex flex-wrap gap-2">
                {TRUST_BADGES.map((b) => (
                  <span
                    key={b.label}
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[0.65rem] font-medium text-white backdrop-blur"
                  >
                    <b.icon className="h-3 w-3" />
                    {b.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="p-7">
              <AnimatePresence mode="wait">
                {stage === "phone" ? (
                  <motion.div
                    key="phone"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Mobile number
                    </label>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#E7E5E4] bg-white px-4 py-3 focus-within:border-[#A16207] focus-within:ring-2 focus-within:ring-[#A16207]/20">
                      <Phone className="h-4 w-4 text-stone-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98200 99999"
                        className="flex-1 bg-transparent text-sm font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => sendOtp()}
                      disabled={loading}
                      className="btn-gold group mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Send OTP
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>

                    <div className="mt-4 flex items-center gap-3 text-[0.7rem] text-stone-400">
                      <div className="h-px flex-1 bg-stone-200" />
                      OR
                      <div className="h-px flex-1 bg-stone-200" />
                    </div>

                    <button
                      onClick={useDemo}
                      disabled={loading}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E7E5E4] bg-white px-4 py-3.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-[#9DB89E] hover:bg-[#9DB89E]/8 active:scale-[0.98] disabled:opacity-60"
                    >
                      <Sparkles className="h-4 w-4 text-[#9DB89E]" />
                      Use demo credentials
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Enter OTP sent to {phone}
                    </label>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#E7E5E4] bg-white px-4 py-3 focus-within:border-[#A16207] focus-within:ring-2 focus-within:ring-[#A16207]/20">
                      <KeyRound className="h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="• • • • • •"
                        className="flex-1 bg-transparent text-sm font-semibold tracking-[0.4em] text-stone-800 placeholder:text-stone-300 focus:outline-none"
                      />
                    </div>
                    {sentOtp && (
                      <p className="mt-2 text-[0.7rem] text-stone-400">
                        Demo OTP: <span className="font-semibold text-stone-600">{sentOtp}</span>
                      </p>
                    )}

                    <button
                      onClick={verifyOtp}
                      disabled={loading || otp.length < 4}
                      className="btn-gold group mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Verify &amp; Continue
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setStage("phone")}
                      className="mt-3 w-full text-center text-xs font-medium text-stone-500 transition-colors hover:text-stone-700"
                    >
                      ← Change number
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Feature highlights below */}
          <div className="mt-6 grid gap-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-[#E7E5E4] bg-white/60 p-3 backdrop-blur",
                  "transition-all hover:bg-white/80 hover:shadow-[0_4px_12px_-4px_oklch(0.4_0.05_45/0.1)]",
                )}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#A16207]/10 text-[#A16207]">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-800">{f.title}</p>
                  <p className="text-[0.75rem] leading-snug text-stone-500">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="mt-6 text-center text-[0.7rem] leading-relaxed text-stone-400">
            By continuing, you agree to Nexura&apos;s Terms &amp; Privacy Policy compliant with DPDP
            Act 2023.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
