"use client";

import { useMemo, useState } from "react";
import { Search, MessageCircleQuestion } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, AuroraBackground } from "./ambient";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Is my health data actually private?",
    a: "Yes. Nexura OS is end-to-end encrypted and certified HIPAA & GDPR compliant. Your data is never sold, and you can export or delete everything in one click. AI models run on private infrastructure — your records are never used to train public models.",
    tags: ["privacy", "security", "data", "gdpr", "hipaa"],
  },
  {
    q: "How fast can I see a real doctor?",
    a: "On Balance and Clinic plans, the median connection time to a verified clinician is 78 seconds. Our care team spans 14 time zones, so someone is always awake when you need them.",
    tags: ["doctor", "speed", "telemedicine", "consult", "time"],
  },
  {
    q: "What wearables and devices are supported?",
    a: "Apple Watch, Fitbit, Oura, Garmin, Whoop, Withings, and any device that exports to Apple Health or Google Fit. We also support continuous glucose monitors from Dexcom and Abbott.",
    tags: ["wearables", "devices", "apple watch", "fitbit", "oura", "garmin"],
  },
  {
    q: "Does Nexura OS replace my doctor?",
    a: "Never — it amplifies them. Every patient keeps their existing physicians; Nexura makes their data flow, their follow-ups warmer, and their time with you far more useful.",
    tags: ["doctor", "replace", "relationship", "care"],
  },
  {
    q: "Can I use Nexura OS for my whole family?",
    a: "Yes. The Balance plan supports up to 4 dependents, including children and elders, with separate privacy controls and dedicated care teams per member.",
    tags: ["family", "dependents", "children", "elderly", "plan"],
  },
  {
    q: "What if I have an emergency?",
    a: "Nexura OS detects deteriorating vitals and can escalate to emergency contacts and local EMS automatically. It complements — never replaces — emergency services. Always dial your local emergency number in a crisis.",
    tags: ["emergency", "safety", "alert", "vitals"],
  },
  {
    q: "How does the AI diagnosis work?",
    a: "Our multi-modal models cross-reference your symptoms, imaging, lab results, and history against a curated medical knowledge base. Every AI insight is reviewed by a human clinician before it reaches you — accuracy you can trust, transparency you can verify.",
    tags: ["ai", "diagnosis", "accuracy", "model"],
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There are no lock-in contracts. Cancel from your settings in two clicks and your data remains exportable for 90 days, after which it's permanently deleted.",
    tags: ["cancel", "subscription", "billing", "plan"],
  },
];

export function Faq() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        f.tags.some((t) => t.includes(q))
    );
  }, [query]);

  return (
    <section id="faq" className="relative overflow-hidden py-24 lg:py-32">
      <AuroraBackground variant="sage" className="opacity-50" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-sage anim-breathe" />
              Questions
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Everything you might{" "}
              <span className="text-gradient-warm">wonder.</span>
            </h2>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="relative mx-auto mt-8 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen("");
              }}
              placeholder="Search questions — privacy, emergency, family…"
              className="h-12 rounded-full border-border bg-card pl-11 pr-4"
              aria-label="Search frequently asked questions"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                clear
              </button>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <div className="mt-8">
            {filtered.length > 0 ? (
              <Accordion
                type="single"
                collapsible
                value={open}
                onValueChange={setOpen}
                className="w-full"
              >
                {filtered.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="mb-3 overflow-hidden rounded-2xl border border-border bg-card px-5 data-[state=open]:shadow-[0_10px_30px_-18px_oklch(0.4_0.05_45/0.18)] last:mb-0"
                  >
                    <AccordionTrigger className="py-5 text-left font-display text-base font-semibold hover:no-underline">
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/60 text-[0.7rem] font-semibold text-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{highlight(item.q, query)}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 pl-9 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className={cn(
                              "rounded-full bg-muted px-2 py-0.5 text-[0.6rem] text-muted-foreground"
                            )}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 py-14 text-center">
                <MessageCircleQuestion className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-medium">No matching question found.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try asking Nexa — our AI companion — in the corner.
                </p>
                <button
                  onClick={() => setQuery("")}
                  className="mt-4 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-accent/40"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-honey/40 px-0.5 text-foreground">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
