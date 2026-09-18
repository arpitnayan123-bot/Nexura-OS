"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Highly-visible microphone status indicator.
 * Idle → coral outline. Listening → pulsing red solid. Processing → amber spin.
 */
export function MicIndicator({
  listening,
  processing,
}: {
  listening: boolean;
  processing: boolean;
}) {
  const state = listening ? "listening" : processing ? "processing" : "idle";
  const color =
    state === "listening"
      ? "bg-destructive text-white"
      : state === "processing"
        ? "bg-honey text-foreground"
        : "bg-card text-muted-foreground border border-border";

  return (
    <div className="pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2">
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg",
            color,
          )}
        >
          {state === "listening" && (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              <Mic className="h-3.5 w-3.5" />
              Listening… speak your bill
            </>
          )}
          {state === "processing" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Parsing your voice…
            </>
          )}
          {state === "idle" && (
            <>
              <Volume2 className="h-3.5 w-3.5" />
              Voice ready — press F3
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
