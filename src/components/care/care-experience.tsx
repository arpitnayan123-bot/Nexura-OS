"use client";

/* ============================================================
   NEXURA CARE CIRCLE — "One circle. Every generation."
   ------------------------------------------------------------
   Family health management: a switchable member dashboard
   (interactive), kids' vaccination timeline, elders' medication
   adherence, family insurance utilization, and DPDP-grade
   consent controls — who in the circle can see what.

   Liquid Gold canvas; deterministic demo family. The member
   switcher is the premium interaction: switching members
   cross-fades the entire dashboard content.
   ============================================================ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Baby, HeartHandshake, ShieldCheck, Syringe, Pill, CalendarClock,
  Wallet, Lock, Eye, Check, ChevronRight, Stethoscope,
} from "lucide-react";
import {
  Eyebrow, SectionHeading, Ornament, Counter, StaggerGroup, StaggerItem,
  Magnetic, TextReveal, ScrollProgress, SpotlightCard,
} from "@/components/premium/kit";

/* ---------- family data ---------- */

type Member = {
  id: string;
  name: string;
  relation: string;
  age: number;
  uhid: string;
  score: number;
  scoreLabel: string;
  vitals: { label: string; value: string; tone: "ok" | "watch" }[];
  next: { what: string; when: string };
};

const MEMBERS: Member[] = [
  {
    id: "arpit", name: "Arpit Mehta", relation: "Self · 34", age: 34, uhid: "NX-8842-0113",
    score: 84, scoreLabel: "Good",
    vitals: [
      { label: "Resting HR", value: "68 bpm", tone: "ok" },
      { label: "HbA1c", value: "5.9% · watch", tone: "watch" },
      { label: "Last checkup", value: "Full Body Gold · Jun", tone: "ok" },
    ],
    next: { what: "Lipid retest", when: "Sep 22 · 07:30 home collection" },
  },
  {
    id: "priya", name: "Priya Mehta", relation: "Spouse · 32", age: 32, uhid: "NX-8842-0114",
    score: 91, scoreLabel: "Strong",
    vitals: [
      { label: "Resting HR", value: "62 bpm", tone: "ok" },
      { label: "Iron panel", value: "Ferritin 41 · healthy", tone: "ok" },
      { label: "Last checkup", value: "Women's Wellness · Jul", tone: "ok" },
    ],
    next: { what: "Annual dental clean", when: "Oct 03 · Nexura City" },
  },
  {
    id: "aisha", name: "Aisha Mehta", relation: "Daughter · 6", age: 6, uhid: "NX-8842-0115",
    score: 96, scoreLabel: "Thriving",
    vitals: [
      { label: "Weight", value: "21 kg · 60th pct", tone: "ok" },
      { label: "Vaccines", value: "Up to date · next 9y", tone: "ok" },
      { label: "Allergies", value: "Dust mite · mild", tone: "watch" },
    ],
    next: { what: "Flu shot (seasonal)", when: "Oct 12 · pediatric OPD" },
  },
  {
    id: "devi", name: "Devi Mehta", relation: "Mother · 63", age: 63, uhid: "NX-8842-0116",
    score: 72, scoreLabel: "Needs care",
    vitals: [
      { label: "BP", value: "138/86 · watch", tone: "watch" },
      { label: "Adherence", value: "Amlodipine · 82%", tone: "watch" },
      { label: "Last checkup", value: "Senior 60+ · May", tone: "ok" },
    ],
    next: { what: "Cardiology follow-up", when: "Sep 18 · 10:15 Dr. Rao" },
  },
];

const VACCINES = [
  { name: "BCG + Hep B birth dose", when: "Birth", done: true },
  { name: "DTwP / IPV booster", when: "5 years", done: true },
  { name: "Annual influenza", when: "Yearly · Oct", done: true },
  { name: "HPV (course of 2)", when: "9 years", done: false },
  { name: "Td booster", when: "10 years", done: false },
];

const ADHERENCE = [
  { med: "Amlodipine 5 mg", pct: 82, when: "Morning · after food" },
  { med: "Metformin 500 mg", pct: 94, when: "Night" },
  { med: "Vitamin D3 weekly", pct: 71, when: "Sundays" },
];

const CONSENTS = [
  { who: "Priya Mehta", scope: "Full records · Aisha & Devi", on: true },
  { who: "Dr. S. Rao (cardio)", scope: "Devi · cardiology only", on: true },
  { who: "Nexura Labs", scope: "Reports visible to self only", on: false },
  { who: "Family insurance TPA", scope: "Claims data · all members", on: true },
];

/* ---------- member dashboard ---------- */

function MemberDashboard({ m }: { m: Member }) {
  return (
    <motion.div
      key={m.id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.32 }}
      className="grid gap-5 lg:grid-cols-3"
    >
      {/* score card */}
      <div className="flex flex-col justify-between rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-serif text-xl font-semibold text-[#F5EDD8]">{m.name}</div>
              <div className="mt-0.5 text-xs text-[#988F81]">{m.relation} · {m.uhid}</div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${
              m.score >= 85 ? "border-[#8FBF8F]/40 text-[#8FBF8F]" : m.score >= 75 ? "border-[#E3C578]/40 text-[#E3C578]" : "border-[#E58F7A]/40 text-[#E58F7A]"
            }`}>
              {m.scoreLabel}
            </span>
          </div>
        </div>
        <div className="mt-6">
          <div className="font-serif text-5xl font-semibold tabular-nums text-[#F5EDD8]">
            <Counter to={m.score} />
            <span className="text-lg font-normal text-[#988F81]">/100</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#241F16]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#B8860B] to-[#D9B87C]"
              initial={{ width: 0 }}
              animate={{ width: `${m.score}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* vitals list */}
      <div className="rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C8A55B]">Health at a glance</div>
        <ul className="mt-4 space-y-3.5">
          {m.vitals.map((v) => (
            <li key={v.label} className="flex items-center justify-between gap-3 border-b border-dashed border-[#2E2A20] pb-3 last:border-b-0 last:pb-0">
              <span className="text-sm text-[#9C927E]">{v.label}</span>
              <span className={`text-sm font-medium tabular-nums ${v.tone === "ok" ? "text-[#EFE7D3]" : "text-[#E3C578]"}`}>{v.value}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* next up */}
      <div className="flex flex-col justify-between rounded-3xl border border-[#A16207]/40 bg-gradient-to-b from-[#1D1810] to-[#15120C] p-7">
        <div className="flex items-center gap-2 text-[#C8A55B]">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">Next up</span>
        </div>
        <div className="mt-5">
          <div className="font-serif text-2xl font-semibold text-[#F5EDD8]">{m.next.what}</div>
          <div className="mt-1 text-sm text-[#B3A892]">{m.next.when}</div>
        </div>
        <Link
          href="/connect"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#C8A55B] underline-offset-4 hover:underline"
        >
          Coordinate in Connect <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </motion.div>
  );
}

/* ---------- root ---------- */

export function CareExperience() {
  const [activeId, setActiveId] = useState(MEMBERS[0].id);
  const [consents, setConsents] = useState(CONSENTS.map((c) => c.on));
  const active = useMemo(() => MEMBERS.find((m) => m.id === activeId) ?? MEMBERS[0], [activeId]);

  return (
    <div className="nxc-root relative min-h-dvh bg-[#141210] text-[#EFE7D3]">
      <ScrollProgress />

      {/* hero */}
      <header className="relative overflow-hidden px-6 pt-36 pb-14 sm:pt-44">
        <div className="aurora-gold" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Eyebrow>Nexura Care Circle · Family health</Eyebrow>
          </motion.div>
          <h1 className="display-xl mt-6 text-balance">
            <TextReveal text="One circle." />
            <br />
            <span className="text-gold-gradient">
              <TextReveal text="Every generation." />
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#C9BFAE]"
          >
            Parents in Patna, kids in Bengaluru, insurance in a drawer somewhere. Care Circle puts
            your whole family&apos;s health in one calm view — with consent controls that would make
            a privacy officer smile.
          </motion.p>
        </div>
      </header>

      <main>

      {/* member switcher + dashboard */}
      <section className="relative px-6 pb-6" aria-labelledby="members-heading">
        <h2 id="members-heading" className="sr-only">Family member dashboard</h2>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose family member">
            {MEMBERS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={activeId === m.id}
                onClick={() => setActiveId(m.id)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                  activeId === m.id
                    ? "border border-[#A16207] bg-[#A16207]/15 text-[#F5EDD8] shadow-[0_8px_24px_-10px_rgba(161,98,7,0.5)]"
                    : "border border-[#2E2A20] text-[#B3A892] hover:border-[#A16207]/50 hover:text-[#E8DFCB]"
                }`}
              >
                <Users className="h-4 w-4 text-[#C8A55B]" aria-hidden="true" />
                {m.name.split(" ")[0]}
                <span className="text-xs text-[#988F81]">{m.relation.split(" · ")[1]}</span>
              </button>
            ))}
          </div>
          <div className="mt-6">
            <AnimatePresence mode="wait">
              <MemberDashboard m={active} />
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* kids + elders */}
      <section className="relative px-6 py-20 sm:py-24" aria-labelledby="gens-heading">
        <SectionHeading
          eyebrow="Vaccines & medicines"
          title={<span id="gens-heading">The little things, <em className="text-gold-gradient not-italic">never slipping.</em></span>}
          lede="Vaccination schedules that move with school transfers, and adherence tracked from the pharmacy itself — not from memory."
        />
        <div className="mx-auto mt-14 grid max-w-6xl gap-5 lg:grid-cols-2">
          {/* vaccination timeline */}
          <SpotlightCard className="rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
            <div className="flex items-center gap-2 text-[#C8A55B]">
              <Syringe className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">Aisha · immunization record</span>
            </div>
            <ol className="mt-6 space-y-0">
              {VACCINES.map((v, i) => (
                <li key={v.name} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < VACCINES.length - 1 && (
                    <span className="absolute left-[9px] top-6 h-full w-px bg-[#2E2A20]" aria-hidden="true" />
                  )}
                  <span className={`relative mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border ${
                    v.done ? "border-[#A16207] bg-[#A16207]/20 text-[#D9B87C]" : "border-[#3A3428] bg-[#241F16] text-transparent"
                  }`}>
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${v.done ? "text-[#EFE7D3]" : "text-[#9C927E]"}`}>{v.name}</div>
                    <div className="text-xs text-[#988F81]">{v.when}{!v.done && " · due later"}</div>
                  </div>
                </li>
              ))}
            </ol>
          </SpotlightCard>

          {/* adherence */}
          <SpotlightCard className="rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
            <div className="flex items-center gap-2 text-[#C8A55B]">
              <Pill className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">Devi · medication adherence · 30 days</span>
            </div>
            <div className="mt-6 space-y-6">
              {ADHERENCE.map((a) => (
                <div key={a.med}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-[#EFE7D3]">{a.med}</span>
                    <span className={`text-sm font-semibold tabular-nums ${a.pct >= 90 ? "text-[#8FBF8F]" : a.pct >= 80 ? "text-[#E3C578]" : "text-[#E58F7A]"}`}>{a.pct}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#241F16]">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${a.pct >= 90 ? "from-[#5E7B5E] to-[#8FBF8F]" : a.pct >= 80 ? "from-[#B8860B] to-[#D9B87C]" : "from-[#A65443] to-[#E58F7A]"}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${a.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                  </div>
                  <div className="mt-1.5 text-xs text-[#988F81]">{a.when} · synced from Pharmacia</div>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-2xl border border-[#E3C578]/30 bg-[#E3C578]/5 px-4 py-3 text-xs leading-relaxed text-[#E3C578]">
              Amlodipine adherence at 82% — Connect can schedule a gentle daily reminder call with her pharmacist.
            </p>
          </SpotlightCard>
        </div>
      </section>

      {/* wallet + consent */}
      <section className="relative px-6 pb-20" aria-labelledby="trust-heading">
        <SectionHeading
          eyebrow="Money & privacy"
          title={<span id="trust-heading">Shared care, <em className="text-gold-gradient not-italic">clear boundaries.</em></span>}
        />
        <div className="mx-auto mt-12 grid max-w-6xl gap-5 lg:grid-cols-2">
          {/* insurance utilization */}
          <div className="rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
            <div className="flex items-center gap-2 text-[#C8A55B]">
              <Wallet className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">Family cover · Star Health · FY 2026</span>
            </div>
            <div className="mt-6">
              <div className="flex items-end justify-between">
                <div className="font-serif text-4xl font-semibold tabular-nums text-[#F5EDD8]">
                  ₹4.1L <span className="text-base font-normal text-[#988F81]">used of ₹10L</span>
                </div>
                <span className="text-xs text-[#9C927E]">41% · renews Apr 01</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#241F16]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#8F5E06] via-[#B8860B] to-[#D9B87C]"
                  initial={{ width: 0 }}
                  whileInView={{ width: "41%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <ul className="mt-5 space-y-2 text-sm text-[#B3A892]">
                <li className="flex justify-between border-b border-dashed border-[#2E2A20] pb-2"><span>Devi · cardiology (May)</span><span className="tabular-nums text-[#EFE7D3]">₹2.6L</span></li>
                <li className="flex justify-between border-b border-dashed border-[#2E2A20] pb-2"><span>Aisha · tonsillitis (Jan)</span><span className="tabular-nums text-[#EFE7D3]">₹34,200</span></li>
                <li className="flex justify-between"><span>Arpit · Full Body Gold (Jun)</span><span className="tabular-nums text-[#EFE7D3]">₹24,900</span></li>
              </ul>
            </div>
          </div>

          {/* consent matrix */}
          <div className="rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
            <div className="flex items-center gap-2 text-[#C8A55B]">
              <Lock className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">Who sees what · DPDP consent</span>
            </div>
            <ul className="mt-5 space-y-3">
              {CONSENTS.map((c, i) => (
                <li key={c.who} className="flex items-center justify-between gap-4 rounded-2xl border border-[#2E2A20] px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#EFE7D3]">{c.who}</div>
                    <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-[#988F81]">
                      <Eye className="h-3 w-3" aria-hidden="true" /> {c.scope}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={consents[i]}
                    aria-label={`Toggle record access for ${c.who}`}
                    onClick={() => setConsents((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                    className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                      consents[i] ? "border-[#A16207] bg-[#A16207]/30" : "border-[#3A3428] bg-[#241F16]"
                    }`}
                  >
                    <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all ${
                      consents[i] ? "left-6 bg-[#D9B87C]" : "left-0.5 bg-[#6E6654]"
                    }`} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-[#8B8476]">
              Consent changes are logged, timestamped and revocable — the audit trail ships with the DPDP compliance report.
            </p>
          </div>
        </div>
      </section>

      {/* finale */}
      <section className="relative px-6 pb-24 text-center sm:pb-28">
        <Ornament className="mx-auto mb-8" />
        <h2 className="display-lg text-balance text-[#F5EDD8]">
          Bring the family <em className="text-gold-gradient not-italic">into the circle.</em>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[#B3A892]">
          Add up to eight members, invite them by phone, and decide together what sharing looks
          like. Care Circle is included with every Nexura account.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <Link href="/portal" className="btn-gold inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.95rem] font-medium">
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              <span>Start your Care Circle</span>
            </Link>
          </Magnetic>
          <Link href="/labs" className="inline-flex items-center gap-2 text-sm font-medium text-[#C8A55B] underline-offset-4 hover:underline">
            Book a family screening day <Stethoscope className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      </main>

      <footer className="border-t border-[#241F16] px-6 py-10 text-center text-xs leading-relaxed text-[#8B8476]">
        Nexura Care Circle — demo family, simulated data. Consent tools reflect DPDP Act 2023 principles. A product of Nexura OS
      </footer>
    </div>
  );
}
