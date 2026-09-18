"use client";

/* ============================================================
   NEXURA EMERGENCY — "Seconds, respected."
   ------------------------------------------------------------
   Emergency response experience: press-and-hold SOS dispatch,
   ambulance fleet with live ETAs, nearest-ER network, blood
   bank availability check, medical ID card and first-aid
   quick guides.

   Design: Liquid Gold canvas with a RESTRICTED crimson accent
   used only for semantic emergency states (never decoration —
   per the platform's taste rule that status colors stay
   semantic). Dark keeps it calm; crimson says urgent.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Siren,
  Ambulance,
  MapPin,
  Clock3,
  Droplets,
  Phone,
  HeartPulse,
  ShieldCheck,
  Radio,
  ChevronDown,
  Check,
  Navigation,
  FileText,
  Zap,
  Users,
} from "lucide-react";
import {
  Eyebrow,
  SectionHeading,
  Ornament,
  Counter,
  StaggerGroup,
  StaggerItem,
  Magnetic,
  TextReveal,
  ScrollProgress,
} from "@/components/premium/kit";

/* ---------- press-and-hold SOS button ---------- */

function SosButton() {
  const HOLD_MS = 1400;
  const [progress, setProgress] = useState(0);
  const [held, setHeld] = useState(false);
  const [armed, setArmed] = useState(false);
  const raf = useRef<number>(0);
  const start = useRef<number>(0);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    if (!armed) setProgress(0);
    setHeld(false);
  };

  const tick = (t: number) => {
    const p = Math.min((t - start.current) / HOLD_MS, 1);
    setProgress(p);
    if (p >= 1) {
      setArmed(true);
      setHeld(false);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (armed) return;
    setHeld(true);
    start.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const R = 88;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center gap-5">
      <button
        type="button"
        onMouseDown={begin}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={(e) => {
          e.preventDefault();
          begin();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          stop();
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={
          armed ? "Emergency dispatch armed" : "Press and hold to dispatch emergency help"
        }
        aria-pressed={armed}
        className={`relative flex h-56 w-56 select-none items-center justify-center rounded-full outline-none transition-transform sm:h-64 sm:w-64 ${
          held ? "scale-[0.97]" : ""
        } focus-visible:ring-4 focus-visible:ring-[#E58F7A]/40`}
      >
        {/* progress ring */}
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 200 200"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r={R} fill="none" stroke="#2E2A20" strokeWidth="4" />
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={armed ? "#E58F7A" : "#D9B87C"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - (armed ? 1 : progress))}
            style={{ transition: armed ? "stroke-dashoffset 0.3s ease" : "none" }}
          />
        </svg>
        {/* breathing halo */}
        <span
          aria-hidden
          className={`absolute inset-6 rounded-full ${armed ? "nxl-sos-armed" : "nxl-sos-halo"}`}
        />
        <span
          className={`relative flex h-40 w-40 flex-col items-center justify-center rounded-full text-center shadow-[0_24px_70px_-18px_rgba(229,70,54,0.55)] sm:h-44 sm:w-44 ${
            armed
              ? "bg-gradient-to-b from-[#E56454] to-[#B03024] text-white"
              : "bg-gradient-to-b from-[#E56454] to-[#A62A1F] text-white"
          }`}
        >
          {armed ? (
            <>
              <Radio className="h-9 w-9 nxl-pulse" aria-hidden="true" />
              <span className="mt-2 text-sm font-bold uppercase tracking-[0.18em]">
                Dispatch armed
              </span>
              <span className="mt-1 text-xs text-white/80">help is being routed</span>
            </>
          ) : (
            <>
              <Siren className="h-9 w-9" aria-hidden="true" />
              <span className="mt-2 text-sm font-bold uppercase tracking-[0.18em]">
                Hold for SOS
              </span>
              <span className="mt-1 text-xs text-white/75">1.5 seconds</span>
            </>
          )}
        </span>
      </button>

      <AnimatePresence>
        {armed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col items-center gap-3 text-center"
            role="status"
          >
            <p className="max-w-md text-sm leading-relaxed text-[#E8DFCB]">
              <strong className="text-[#F5EDD8]">Demo armed.</strong> In production this instantly
              alerts the nearest Nexura ambulance, your emergency contacts, and streams your medical
              ID to the responding paramedic.
            </p>
            <button
              type="button"
              onClick={() => {
                setArmed(false);
                setProgress(0);
              }}
              className="text-xs text-[#C8A55B] underline-offset-4 hover:underline"
            >
              Reset demo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- fleet cards ---------- */

const FLEET = [
  {
    name: "Advanced Life Support",
    code: "ALS",
    eta: "7 min",
    price: "₹2,500 pickup + ₹90/km",
    crew: "Paramedic + critical care nurse + driver",
    gear: "Defibrillator · ventilator · infusion pumps · O₂",
    tag: "Critical",
  },
  {
    name: "Basic Life Support",
    code: "BLS",
    eta: "6 min",
    price: "₹1,500 pickup + ₹60/km",
    crew: "EMT + driver",
    gear: "O₂ · suction · spine board · AED",
    tag: "Standard",
  },
  {
    name: "Patient Transport",
    code: "PTV",
    eta: "9 min",
    price: "₹900 pickup + ₹40/km",
    crew: "Trained driver + attendant",
    gear: "Wheelchair · stretcher · vital monitor",
    tag: "Planned",
  },
];

function Fleet() {
  return (
    <section className="relative px-6 py-20 sm:py-24" aria-labelledby="fleet-heading">
      <SectionHeading
        eyebrow="The fleet"
        title={
          <span id="fleet-heading">
            Right vehicle. <em className="text-gold-gradient not-italic">Right crew.</em>
          </span>
        }
        lede="Every unit is GPS-tracked, equipment-audited daily, and staffed beyond state norms. The app assigns by acuity — not by queue."
      />
      <StaggerGroup className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-3">
        {FLEET.map((f) => (
          <StaggerItem key={f.code}>
            <div className="group relative h-full rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7 transition-colors hover:border-[#A16207]/60">
              <div className="flex items-center justify-between">
                <Ambulance className="h-6 w-6 text-[#C8A55B]" aria-hidden="true" />
                <span className="rounded-full border border-[#3A3428] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#C8A55B]">
                  {f.tag}
                </span>
              </div>
              <h3 className="mt-5 font-serif text-xl font-semibold text-[#F5EDD8]">{f.name}</h3>
              <div className="mt-1 text-xs font-mono uppercase tracking-wider text-[#8A8070]">
                {f.code}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#B3A892]">
                <strong className="text-[#E8DFCB]">Crew:</strong> {f.crew}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#B3A892]">
                <strong className="text-[#E8DFCB]">Onboard:</strong> {f.gear}
              </p>
              <div className="mt-6 flex items-end justify-between border-t border-[#2E2A20] pt-5">
                <div>
                  <div className="text-xs text-[#8A8070]">Avg arrival</div>
                  <div className="font-serif text-2xl font-semibold tabular-nums text-[#F5EDD8]">
                    {f.eta}
                  </div>
                </div>
                <div className="text-right text-xs tabular-nums text-[#9C927E]">{f.price}</div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

/* ---------- nearest ER network ---------- */

const ERS = [
  {
    name: "Nexura City Hospital",
    dist: "1.8 km",
    eta: "6 min",
    beds: "ICU 3 · Gen 11",
    open: "24×7 trauma",
  },
  {
    name: "Manipal — Old Airport Rd",
    dist: "3.4 km",
    eta: "9 min",
    beds: "ICU 5 · Gen 8",
    open: "24×7",
  },
  {
    name: "Fortis — Cunningham Rd",
    dist: "5.1 km",
    eta: "13 min",
    beds: "ICU 2 · Gen 14",
    open: "24×7 cardiac",
  },
  {
    name: "Apollo — Sheshadripuram",
    dist: "6.7 km",
    eta: "17 min",
    beds: "ICU 6 · Gen 9",
    open: "24×7",
  },
];

function ErNetwork() {
  return (
    <section className="relative px-6 py-20 sm:py-24" aria-labelledby="er-heading">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Nearest emergency rooms</Eyebrow>
            <h2 id="er-heading" className="display-md mt-4 text-[#F5EDD8]">
              Live beds, before you ride.
            </h2>
          </div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#3A3428] px-4 py-1.5 text-xs text-[#9C927E]">
            <MapPin className="h-3.5 w-3.5 text-[#C8A55B]" aria-hidden="true" />
            Indiranagar, Bengaluru · updated 40s ago
          </p>
        </div>
        <StaggerGroup className="mt-10 overflow-hidden rounded-3xl border border-[#2E2A20] bg-[#191611]/80">
          {ERS.map((er) => (
            <StaggerItem key={er.name}>
              <div className="flex flex-wrap items-center gap-4 border-b border-[#241F16] px-6 py-5 last:border-b-0 transition-colors hover:bg-[#1D1912]/80">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium text-[#EFE7D3]">{er.name}</div>
                  <div className="mt-0.5 text-xs text-[#8A8070]">
                    {er.open} · {er.beds} open now
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums text-[#E8DFCB]">{er.dist}</div>
                  <div className="text-xs tabular-nums text-[#C8A55B]">{er.eta} drive</div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
        <p className="mt-5 text-xs leading-relaxed text-[#6E6654]">
          Bed counts are simulated for the demo. In production, Nexura ERs stream availability every
          30 seconds through the Hospital OS network.
        </p>
      </div>
    </section>
  );
}

/* ---------- blood bank check ---------- */

const BLOOD_TYPES = ["O+", "O−", "A+", "A−", "B+", "B−", "AB+", "AB−"];
const UNITS: Record<string, number> = {
  "O+": 34,
  "O−": 6,
  "A+": 28,
  "A−": 9,
  "B+": 31,
  "B−": 7,
  "AB+": 12,
  "AB−": 4,
};

function BloodBank() {
  const [type, setType] = useState("O+");
  const units = UNITS[type];
  const level = units >= 20 ? "Healthy" : units >= 8 ? "Low" : "Critical";
  const levelCls =
    units >= 20
      ? "text-[#8FBF8F] border-[#8FBF8F]/40"
      : units >= 8
        ? "text-[#E3C578] border-[#E3C578]/40"
        : "text-[#E58F7A] border-[#E58F7A]/40";

  return (
    <section className="relative px-6 py-20 sm:py-24" aria-labelledby="blood-heading">
      <SectionHeading
        eyebrow="Blood bank, live"
        title={
          <span id="blood-heading">
            Know before <em className="text-gold-gradient not-italic">you rush.</em>
          </span>
        }
        lede="Tap a blood type to see simulated unit availability across the Nexura network right now. In production, this syncs with Hospital OS blood-bank modules."
      />
      <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7 sm:p-9">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose blood type">
          {BLOOD_TYPES.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setType(b)}
              aria-pressed={type === b}
              className={`rounded-xl px-4 py-2 text-sm font-semibold tabular-nums transition-all ${
                type === b
                  ? "border border-[#A16207] bg-[#A16207]/15 text-[#F5EDD8]"
                  : "border border-[#2E2A20] text-[#B3A892] hover:border-[#A16207]/50"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-8 flex flex-wrap items-center justify-between gap-6"
            aria-live="polite"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3A3428] bg-[#241F16]">
                <Droplets className="h-7 w-7 text-[#E58F7A]" aria-hidden="true" />
              </div>
              <div>
                <div className="font-serif text-3xl font-semibold tabular-nums text-[#F5EDD8]">
                  {units} <span className="text-base font-normal text-[#8A8070]">units</span>
                </div>
                <div className="text-xs text-[#8A8070]">
                  {type} available across 6 network banks
                </div>
              </div>
            </div>
            <span
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${levelCls}`}
            >
              {level}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ---------- medical ID + contacts ---------- */

function MedicalId() {
  return (
    <section className="relative px-6 py-20 sm:py-24" aria-labelledby="mid-heading">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div>
          <Eyebrow>Your medical ID</Eyebrow>
          <h2 id="mid-heading" className="display-md mt-4 text-[#F5EDD8]">
            Speaks when <em className="text-gold-gradient not-italic">you can&apos;t.</em>
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[#B3A892]">
            Blood group, allergies, chronic conditions, current medications, emergency contacts and
            insurance — one QR away on your lock screen. Responding paramedics scan first, treat
            faster, and avoid the allergies that complicate emergencies.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              "Offline QR — works on a locked phone, no app, no network",
              "Auto-shared with the dispatched Nexura ambulance crew",
              "Gold-sealed DPDP consent: you choose exactly what is visible",
            ].map((li) => (
              <li key={li} className="flex items-start gap-2.5 text-sm text-[#C9BFAE]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#A16207]" aria-hidden="true" />
                {li}
              </li>
            ))}
          </ul>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="frame-lux rounded-3xl border border-[#3A3428] bg-gradient-to-b from-[#1D1810] to-[#15120C] p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#C8A55B]">
                <HeartPulse className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                  Nexura Medical ID
                </span>
              </div>
              <ShieldCheck className="h-4 w-4 text-[#8A8070]" aria-hidden="true" />
            </div>
            <div className="mt-6 space-y-3 text-sm">
              {[
                ["Name", "Arjun Mehta"],
                ["Blood", "O+ · 27 yrs"],
                ["Allergies", "Penicillin, sulfonamides"],
                ["Conditions", "Asthma (mild, intermittent)"],
                ["Meds", "Salbutamol inhaler PRN"],
                ["Emergency", "Priya Mehta · +91 98••• 4•2•1"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-baseline justify-between gap-4 border-b border-dashed border-[#2E2A20] pb-2.5 last:border-b-0"
                >
                  <span className="text-xs uppercase tracking-[0.12em] text-[#8A8070]">{k}</span>
                  <span className="text-right text-[13px] text-[#EFE7D3]">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-[#2E2A20] bg-[#241F16] px-4 py-3 text-[11px] text-[#9C927E]">
              <FileText className="h-4 w-4 text-[#C8A55B]" aria-hidden="true" />
              Lock-screen QR · paramedic-safe view
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- first-aid accordion ---------- */

const GUIDES = [
  {
    q: "Choking (adult, conscious)",
    steps: [
      "Ask “Are you choking?” — if they can't speak, act.",
      "Give 5 firm back blows between shoulder blades.",
      "Then 5 abdominal thrusts (Heimlich), above the navel.",
      "Alternate 5+5 until the object clears or they collapse → start CPR.",
    ],
  },
  {
    q: "Burns — first 60 seconds",
    steps: [
      "Cool the burn under gently running cool water for 20 minutes.",
      "Remove rings/watches near the area before swelling starts.",
      "Cover loosely with cling film or a clean, non-fluffy cloth.",
      "Never apply ice, toothpaste, ghee or ointments. Chemical/electrical burns → hospital.",
    ],
  },
  {
    q: "CPR — hands-only, adult",
    steps: [
      "Check response and breathing. No response, no normal breathing → act.",
      "Call 108 / dispatch the SOS above; put on speaker.",
      "Heel of hand centre of chest, other hand on top, arms locked.",
      "Push hard and fast — 100–120/min, 5–6 cm deep. Don't stop until help takes over.",
    ],
  },
  {
    q: "Seizure — do's and hard don'ts",
    steps: [
      "Clear the area; cushion the head. Time the seizure.",
      "Turn them on their side once movements ease (recovery position).",
      "Do NOT restrain, hold down, or put anything in the mouth.",
      "Seizure > 5 min, first-ever, pregnancy, or injury → ambulance immediately.",
    ],
  },
];

function FirstAid() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="relative px-6 py-20 sm:py-24" aria-labelledby="aid-heading">
      <SectionHeading
        eyebrow="While help is coming"
        title={
          <span id="aid-heading">
            Four moves that <em className="text-gold-gradient not-italic">save the minute.</em>
          </span>
        }
        lede="Offline, image-free, written with emergency physicians. Review them once — they compress to memory remarkably well."
      />
      <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-3xl border border-[#2E2A20] bg-[#191611]/80">
        {GUIDES.map((g, i) => {
          const isOpen = open === i;
          return (
            <div key={g.q} className="border-b border-[#241F16] last:border-b-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`aid-panel-${i}`}
                className="flex w-full items-center justify-between gap-4 px-7 py-5 text-left transition-colors hover:bg-[#1D1912]/70"
              >
                <span className="text-[15px] font-medium text-[#EFE7D3]">{g.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#C8A55B] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`aid-panel-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="overflow-hidden"
                  >
                    <ol className="space-y-2.5 px-7 pb-6">
                      {g.steps.map((s, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-3 text-sm leading-relaxed text-[#B3A892]"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#3A3428] text-[11px] tabular-nums text-[#C8A55B]">
                            {j + 1}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <p className="mx-auto mt-6 max-w-2xl px-6 text-center text-xs text-[#6E6654]">
        Guides are awareness aids, not a substitute for certified first-aid training or professional
        medical direction.
      </p>
    </section>
  );
}

/* ---------- root ---------- */

export function EmergencyExperience() {
  const stats = useMemo(
    () => [
      { icon: Ambulance, value: 12, suffix: "", label: "Units within 3 km" },
      { icon: Clock3, value: 7, suffix: " min", label: "Median response" },
      { icon: Users, value: 46, suffix: "", label: "ERs on network" },
      { icon: Zap, value: 98.6, suffix: "%", label: "Dispatch acceptance", decimals: 1 },
    ],
    [],
  );

  return (
    <div className="nxe-root relative min-h-dvh bg-[#141210] text-[#EFE7D3]">
      <ScrollProgress />

      {/* hero */}
      <header className="relative overflow-hidden px-6 pt-36 pb-16 sm:pt-44">
        <div className="aurora-gold" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Eyebrow>Nexura Emergency · 24×7</Eyebrow>
          </motion.div>
          <h1 className="display-xl mt-6 text-balance">
            <TextReveal text="Seconds," />
            <br />
            <span className="text-gold-gradient">
              <TextReveal text="respected." />
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#C9BFAE]"
          >
            One press-and-hold dispatches the nearest ambulance to your GPS pin with your medical ID
            already streaming to the crew — while your family hears it from you, not a call centre.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.8 }}
            className="mt-12"
          >
            <SosButton />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 inline-flex items-center gap-2 text-xs text-[#8A8070]"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#C8A55B]" aria-hidden="true" />
            For real emergencies in India, always also call 108 / 112.
          </motion.p>
        </div>
      </header>

      {/* stat strip */}
      <section className="relative px-6 py-10" aria-label="Emergency response at a glance">
        <StaggerGroup className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <StaggerItem key={s.label}>
              <div className="spotlight-card rounded-2xl border border-[#2E2A20] bg-[#191611]/80 p-6 text-center">
                <s.icon className="mx-auto h-5 w-5 text-[#C8A55B]" aria-hidden="true" />
                <div className="mt-3 font-serif text-3xl font-semibold tabular-nums text-[#F5EDD8]">
                  <Counter
                    to={s.value}
                    suffix={s.suffix}
                    decimals={"decimals" in s ? s.decimals : 0}
                  />
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.14em] text-[#9C927E]">
                  {s.label}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      <Fleet />
      <ErNetwork />
      <BloodBank />
      <MedicalId />
      <FirstAid />

      {/* finale */}
      <section className="relative px-6 py-24 text-center sm:py-28">
        <Ornament className="mx-auto mb-8" />
        <h2 className="display-lg text-balance text-[#F5EDD8]">
          Save it before <em className="text-gold-gradient not-italic">you need it.</em>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[#B3A892]">
          Set up your medical ID and emergency contacts now — it takes four minutes and does its
          best work on your worst day.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <Link
              href="/portal"
              className="btn-gold inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.95rem] font-medium"
            >
              <Navigation className="h-4 w-4" aria-hidden="true" />
              <span>Set up my Medical ID</span>
            </Link>
          </Magnetic>
          <a
            href="tel:108"
            className="inline-flex items-center gap-2 rounded-full border border-[#3A3428] px-6 py-3 text-sm font-medium text-[#E8DFCB] transition-colors hover:border-[#E58F7A]/60 hover:text-white"
          >
            <Phone className="h-4 w-4 text-[#E58F7A]" aria-hidden="true" />
            Call 108 now
          </a>
        </div>
      </section>

      <footer className="border-t border-[#241F16] px-6 py-10 text-center text-xs leading-relaxed text-[#6E6654]">
        Nexura Emergency is a demo experience — in production it coordinates licensed ambulance
        partners and hospital ERs.
        <br />
        India national emergency numbers: Ambulance 108 · Police 100 · All-in-one 112. A product of
        Nexura OS
      </footer>
    </div>
  );
}
