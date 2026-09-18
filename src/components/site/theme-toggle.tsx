"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

// Track whether we've hydrated on the client. Using useSyncExternalStore
// avoids the "setState in effect" pattern while still preventing hydration
// mismatches for theme-dependent UI.
const emptySubscribe = () => () => {};
function getMounted() {
  return true;
}
function getServerSnapshot() {
  return false;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getMounted, getServerSnapshot);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group relative grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-border bg-background/60 text-foreground transition-colors hover:bg-accent/50",
        className,
      )}
    >
      {/* soft radial glow that follows theme */}
      <span
        className="pointer-events-none absolute inset-0 opacity-50 blur-md transition-opacity group-hover:opacity-80"
        style={{
          background: isDark
            ? "radial-gradient(circle at 50% 50%, oklch(0.70 0.10 75 / 0.4), transparent 70%)"
            : "radial-gradient(circle at 50% 50%, oklch(0.85 0.10 55 / 0.35), transparent 70%)",
        }}
      />
      <AnimatePresence mode="wait" initial={false}>
        {mounted ? (
          isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <Moon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.8} />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <Sun className="h-[1.15rem] w-[1.15rem] anim-breathe" strokeWidth={1.8} />
            </motion.span>
          )
        ) : (
          <span className="h-[1.15rem] w-[1.15rem]" />
        )}
      </AnimatePresence>
    </button>
  );
}
