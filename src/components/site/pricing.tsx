"use client";

import { Fragment, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { Reveal, AuroraBackground, BreathingOrb } from "./ambient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Magnetic } from "./magnetic";

const PLANS = [
  {
    name: "Calm",
    tagline: "For the curious self-carer",
    monthly: 0,
    yearly: 0,
    accent: "var(--sage)",
    features: [
      "AI symptom check-in",
      "Daily wellbeing summary",
      "Basic wearable sync",
      "Community care circle",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Balance",
    tagline: "For individuals who want a care team",
    monthly: 24,
    yearly: 19,
    accent: "var(--coral)",
    features: [
      "Everything in Calm",
      "Dedicated clinician + AI companion",
      "Continuous monitoring & alerts",
      "Living care plans",
      "Priority telemedicine (avg 78s)",
    ],
    cta: "Start 14-day trial",
    highlight: true,
  },
  {
    name: "Clinic",
    tagline: "For practices and institutions",
    monthly: null,
    yearly: null,
    accent: "var(--honey)",
    features: [
      "Everything in Balance",
      "Care team workspace (up to 50 seats)",
      "Custom AI model fine-tune",
      "SSO, audit logs, BAA",
      "Dedicated success partner",
    ],
    cta: "Talk to us",
    highlight: false,
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="relative overflow-hidden py-24 lg:py-32">
      <AuroraBackground variant="honey" className="opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-coral anim-breathe" />
              Pricing
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Care that fits your <span className="text-gradient-warm">life &amp; budget.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-4 text-muted-foreground sm:text-lg">
              No surprise bills. Cancel anytime. Every plan is HIPAA &amp; GDPR compliant out of the
              box.
            </p>
          </Reveal>

          {/* billing toggle */}
          <Reveal delay={0.16}>
            <div className="mt-7 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
              <button
                onClick={() => setYearly(false)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  !yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                Yearly
                <span className="ml-1.5 rounded-full bg-sage/30 px-1.5 py-0.5 text-[0.6rem] text-foreground">
                  -20%
                </span>
              </button>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <PlanCard plan={p} yearly={yearly} />
            </Reveal>
          ))}
        </div>

        <ComparisonTable />
      </div>
    </section>
  );
}

const COMPARISON = [
  {
    group: "Care team",
    rows: [
      { label: "AI symptom check-in", calm: true, balance: true, clinic: true },
      { label: "Dedicated clinician", calm: false, balance: true, clinic: true },
      { label: "24/7 AI companion", calm: false, balance: true, clinic: true },
      { label: "Specialist matching", calm: false, balance: true, clinic: true },
      { label: "Care team seats", calm: "—", balance: "1", clinic: "50" },
    ],
  },
  {
    group: "Monitoring & data",
    rows: [
      { label: "Wearable sync", calm: "Basic", balance: "All", clinic: "All + API" },
      { label: "Continuous vitals streaming", calm: false, balance: true, clinic: true },
      { label: "Smart alerts & escalation", calm: false, balance: true, clinic: true },
      { label: "Data export", calm: true, balance: true, clinic: true },
    ],
  },
  {
    group: "Telemedicine",
    rows: [
      { label: "Video consults", calm: false, balance: true, clinic: true },
      { label: "Median connect time", calm: "—", balance: "78s", clinic: "30s" },
      { label: "AI visit scribe", calm: false, balance: true, clinic: true },
      { label: "Same-day pharmacy sync", calm: false, balance: true, clinic: true },
    ],
  },
  {
    group: "Privacy & scale",
    rows: [
      { label: "HIPAA & GDPR", calm: true, balance: true, clinic: true },
      { label: "SSO + audit logs", calm: false, balance: false, clinic: true },
      { label: "Custom AI fine-tune", calm: false, balance: false, clinic: true },
      { label: "Dedicated success partner", calm: false, balance: false, clinic: true },
    ],
  },
] as const;

function ComparisonTable() {
  const [open, setOpen] = useState(false);

  return (
    <Reveal delay={0.1}>
      <div className="mt-10">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group mx-auto flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent/40"
        >
          <span className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/60 text-[0.6rem] font-semibold">
              ≡
            </span>
            {open ? "Hide" : "Compare"} all plans
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        <motion.div
          initial={false}
          animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-border bg-card p-2">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Capability
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.name}
                      className={cn(
                        "p-3 text-center font-display text-sm font-semibold",
                        p.highlight && "text-primary",
                      )}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((group) => (
                  <Fragment key={group.group}>
                    <tr className="bg-muted/30">
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        {group.group}
                      </td>
                    </tr>
                    {group.rows.map((r) => (
                      <tr key={r.label} className="border-b border-border/60 last:border-0">
                        <td className="p-3 font-medium text-foreground/85">{r.label}</td>
                        <td className="p-3 text-center">
                          <Cell v={r.calm} />
                        </td>
                        <td className="p-3 text-center">
                          <Cell v={r.balance} highlight />
                        </td>
                        <td className="p-3 text-center">
                          <Cell v={r.clinic} />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </Reveal>
  );
}

function Cell({ v, highlight }: { v: boolean | string; highlight?: boolean }) {
  if (typeof v === "string") {
    return (
      <span
        className={cn("text-xs font-medium", highlight ? "text-primary" : "text-muted-foreground")}
      >
        {v}
      </span>
    );
  }
  return v ? (
    <Check
      className={cn("mx-auto h-4.5 w-4.5", highlight ? "text-primary" : "text-sage")}
      strokeWidth={2.5}
    />
  ) : (
    <span className="mx-auto block h-1 w-1 rounded-full bg-muted-foreground/40" />
  );
}

function PlanCard({ plan, yearly }: { plan: (typeof PLANS)[number]; yearly: boolean }) {
  const price = yearly ? plan.yearly : plan.monthly;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-card p-7",
        plan.highlight
          ? "border-primary/30 shadow-[0_30px_80px_-40px_oklch(0.70_0.145_45/0.5)]"
          : "border-border",
      )}
    >
      {plan.highlight && (
        <>
          <div className="absolute -right-10 -top-10 opacity-40">
            <BreathingOrb size={180} color={plan.accent} ring={false} />
          </div>
          <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[0.65rem] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Most loved
          </span>
        </>
      )}

      <div className="relative">
        <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

        <div className="mt-6 flex items-end gap-1">
          {price === null ? (
            <span className="font-display text-3xl font-semibold">Custom</span>
          ) : price === 0 ? (
            <span className="font-display text-4xl font-semibold">Free</span>
          ) : (
            <>
              <span className="font-display text-4xl font-semibold">${price}</span>
              <span className="mb-1 text-sm text-muted-foreground">/mo</span>
            </>
          )}
        </div>
        {price !== null && price > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {yearly ? "billed annually" : "billed monthly"}
          </p>
        )}
      </div>

      <Magnetic strength={plan.highlight ? 0.3 : 0.18}>
        <Button
          className={cn(
            "relative mt-6 w-full rounded-full",
            plan.highlight
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background text-foreground hover:bg-accent/40",
          )}
          variant={plan.highlight ? "default" : "outline"}
        >
          {plan.cta}
        </Button>
      </Magnetic>

      <ul className="relative mt-7 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm">
            <span
              className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
              style={{
                background: `color-mix(in oklch, ${plan.accent} 18%, transparent)`,
                color: plan.accent,
              }}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-foreground/80">{f}</span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}
