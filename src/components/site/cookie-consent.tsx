"use client";

import { useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "nexura-consent-v1";

type Consent = "all" | "essential" | null;

// --- useSyncExternalStore to read localStorage without setState-in-effect ---
function subscribe(callback: () => void) {
  const handler = (e: Event) => {
    if (e instanceof StorageEvent && e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getSnapshot(): Consent {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY) as Consent | null;
    return v ?? null;
  } catch {
    return null;
  }
}

function getServerSnapshot(): Consent {
  // On the server we pretend a choice was already made so we never render
  // the banner during SSR — avoids hydration mismatch. The client snapshot
  // becomes authoritative after hydration.
  return "essential";
}

function writeConsent(c: Consent) {
  try {
    if (c) window.localStorage.setItem(STORAGE_KEY, c);
  } catch {
    /* ignore */
  }
  // dispatch a synthetic event so subscribers re-render
  window.dispatchEvent(
    new StorageEvent("storage", { key: STORAGE_KEY, newValue: c })
  );
}

export function CookieConsent() {
  // Client snapshot = real localStorage; server snapshot = "essential" (banner hidden).
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const show = consent === null;
  const choose = (c: Consent) => writeConsent(c);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl sm:inset-x-4 sm:bottom-4"
          role="dialog"
          aria-label="Cookie consent"
          aria-live="polite"
        >
          <div className="relative overflow-hidden rounded-[1.5rem] border border-border bg-card p-4 shadow-[0_30px_80px_-30px_oklch(0.4_0.05_45/0.45)] sm:p-5">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-honey/25 blur-2xl"
            />
            <button
              onClick={() => choose("essential")}
              aria-label="Dismiss and keep essential only"
              className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-honey/20 text-honey">
                <Cookie className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold">
                  Warm, essential cookies only.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  We use a handful of calm cookies for your session and to
                  understand what helps. No tracking, no selling. You decide.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => choose("essential")}
                  className="rounded-full text-xs"
                >
                  Essential only
                </Button>
                <Button
                  size="sm"
                  onClick={() => choose("all")}
                  className="rounded-full text-xs"
                >
                  Allow all
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
