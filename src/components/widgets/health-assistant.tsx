"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, HeartPulse, AlertCircle } from "lucide-react";
import { BreathingOrb, EcgLine } from "@/components/site/ambient";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "I've been waking up tired lately",
  "My heart rate feels a bit high",
  "What can Nexura OS do for me?",
  "How do I track my sleep?",
];

const INTRO: Msg = {
  role: "assistant",
  content:
    "Hi, I'm Nexa — your calm AI companion on Nexura OS. How are you feeling today? I can help you make sense of a symptom or just listen.",
};

export function HealthAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INTRO]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next
            .filter((m) => m.content)
            .slice(-8)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const reply = data?.reply ?? "I'm having a quiet moment — could you say that again?";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "I lost my train of thought for a second. Please try once more — I'm listening.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      <motion.button
        aria-label="Open Nexa, the Nexura AI health companion"
        onClick={() => setOpen((v) => !v)}
        initial={false}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full shadow-[0_14px_40px_-10px_oklch(0.70_0.145_45/0.7)] sm:bottom-7 sm:right-7"
      >
        <BreathingOrb size={56} color="var(--coral)" ring className="!absolute inset-0" />
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="relative grid h-7 w-7 place-items-center rounded-full bg-white text-primary shadow"
            >
              <X className="h-4 w-4" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="relative grid h-7 w-7 place-items-center rounded-full bg-white text-primary shadow"
            >
              <Sparkles className="h-4 w-4" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-sage ring-2 ring-white" />
          </span>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-[calc(100vw-2.5rem)] max-w-[24rem] flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_40px_120px_-40px_oklch(0.4_0.05_45/0.5)] sm:right-7"
          >
            {/* header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[oklch(0.70_0.145_45)] to-[oklch(0.60_0.09_30)] p-4 text-primary-foreground">
              <div className="absolute -right-6 -top-6 opacity-40">
                <BreathingOrb size={120} color="white" ring={false} />
              </div>
              <div className="relative flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur">
                  <HeartPulse className="h-5 w-5 anim-breathe" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-base font-semibold">Nexa</p>
                    <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[0.6rem]">
                      <span className="h-1.5 w-1.5 rounded-full bg-white anim-breathe" /> online
                    </span>
                  </div>
                  <p className="text-[0.7rem] text-primary-foreground/85">
                    Your calm AI health companion
                  </p>
                </div>
              </div>
              <div className="relative mt-3 opacity-70">
                <EcgLine width={300} height={28} color="white" className="w-full" />
              </div>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background/40 p-4">
              {messages.map((m, i) => (
                <Bubble key={i} msg={m} />
              ))}
              {loading && <Typing />}

              {messages.length <= 1 && (
                <div className="space-y-1.5 pt-2">
                  <p className="px-1 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                    Try asking
                  </p>
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-xs text-foreground/80 transition-colors hover:bg-accent/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* input */}
            <div className="border-t border-border bg-card p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Tell Nexa how you feel…"
                  className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-all hover:shadow-[0_8px_24px_-6px_oklch(0.70_0.145_45/0.7)] disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <p className="mt-2 flex items-center gap-1 text-[0.6rem] text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Not for emergencies. In a crisis call 108 (ambulance) or 112 (India emergency).
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card text-foreground",
        )}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
