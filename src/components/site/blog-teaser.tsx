"use client";

import { motion } from "framer-motion";
import { BookOpen, ArrowUpRight, Clock, Mail, HeartPulse, Brain, Moon } from "lucide-react";
import { Reveal, AuroraBackground, FloatingParticles } from "./ambient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const POSTS = [
  {
    title: "The quiet science of gentle nudges",
    excerpt:
      "Why the best reminder is the one you almost didn't notice — and how we tune Nexura's nudges to your circadian rhythm.",
    read: "6 min",
    tag: "Design",
    accent: "var(--coral)",
    icon: HeartPulse,
  },
  {
    title: "What 2 million heartbeats taught us",
    excerpt:
      "Patterns from continuous monitoring that changed how three clinics approach preventive cardiology.",
    read: "9 min",
    tag: "Research",
    accent: "var(--sage)",
    icon: Brain,
  },
  {
    title: "Sleep is a skill — here's how to learn it",
    excerpt:
      "A warm, evidence-backed field guide to building sleep you can actually rely on. No gadgets required.",
    read: "7 min",
    tag: "Field guide",
    accent: "var(--honey)",
    icon: Moon,
  },
];

export function BlogTeaser() {
  const subscribe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "");
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    toast.success("Subscribed to The Calm Pulse.", {
      description: "A warm letter every other Sunday. Unsubscribe anytime.",
    });
    e.currentTarget.reset();
  };

  return (
    <section id="journal" className="relative overflow-hidden py-24 lg:py-32">
      <AuroraBackground variant="honey" className="opacity-45" />
      <FloatingParticles count={10} color="var(--honey)" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          {/* Left: posts */}
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5 text-honey" />
                The Calm Journal
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.9rem]">
                Slow reading for a <span className="text-gradient-warm">calmer mind.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-4 max-w-md text-muted-foreground sm:text-lg">
                Field guides, research notes, and quiet ideas from our clinicians and engineers —
                written to be read at the pace of a long exhale.
              </p>
            </Reveal>

            <div className="mt-8 space-y-4">
              {POSTS.map((p, i) => (
                <Reveal key={p.title} delay={i * 0.08}>
                  <PostCard {...p} />
                </Reveal>
              ))}
            </div>
          </div>

          {/* Right: newsletter card */}
          <Reveal delay={0.15} y={32}>
            <div className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-gradient-to-br from-[oklch(0.70_0.145_45)] via-[oklch(0.64_0.10_40)] to-[oklch(0.58_0.09_30)] p-7 text-primary-foreground shadow-[0_30px_80px_-50px_oklch(0.4_0.05_45/0.5)] sm:p-9">
              {/* breathing glow */}
              <div
                aria-hidden
                className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl anim-breathe"
              />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                  <Mail className="h-3.5 w-3.5" /> The Calm Pulse
                </span>
                <h3 className="mt-5 font-display text-2xl font-semibold leading-tight sm:text-3xl">
                  A warm letter, every other Sunday.
                </h3>
                <p className="mt-3 max-w-sm text-sm text-primary-foreground/85 sm:text-base">
                  One story, one practice, one small experiment — sent at the pace of rest, not the
                  speed of news.
                </p>

                <form onSubmit={subscribe} className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Input
                    name="email"
                    type="email"
                    placeholder="you@calmer.health"
                    className="h-11 flex-1 rounded-full border-white/20 bg-white/90 text-foreground placeholder:text-muted-foreground"
                    aria-label="Email"
                  />
                  <Button
                    type="submit"
                    className="h-11 rounded-full bg-foreground text-background transition-all hover:bg-background/90"
                  >
                    Subscribe
                  </Button>
                </form>
                <p className="mt-3 text-[0.65rem] text-primary-foreground/70">
                  Join 42,000+ calm readers. No noise, ever. Unsubscribe in one click.
                </p>

                <div className="mt-7 grid grid-cols-3 gap-3 text-center">
                  {[
                    { n: "42k", l: "readers" },
                    { n: "187", l: "letters" },
                    { n: "0", l: "spam" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-2xl bg-white/10 px-2 py-3 backdrop-blur">
                      <p className="font-display text-xl font-semibold">{s.n}</p>
                      <p className="text-[0.6rem] uppercase tracking-wider text-primary-foreground/75">
                        {s.l}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function PostCard({ title, excerpt, read, tag, accent, icon: Icon }: (typeof POSTS)[number]) {
  return (
    <motion.article
      whileHover={{ y: -3, x: 4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
    >
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
        style={{
          background: `color-mix(in oklch, ${accent} 16%, transparent)`,
          color: accent,
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
          <span
            className="rounded-full px-2 py-0.5 font-medium"
            style={{
              background: `color-mix(in oklch, ${accent} 14%, transparent)`,
              color: accent,
            }}
          >
            {tag}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {read}
          </span>
        </div>
        <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
        <div className="mt-2.5 flex items-center gap-1 text-sm font-medium text-foreground/70">
          Read the letter
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </motion.article>
  );
}
