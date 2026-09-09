"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          aria-label="Back to top"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: "smooth" })
          }
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.92 }}
          className="fixed bottom-24 left-5 z-40 grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[0_10px_30px_-12px_oklch(0.4_0.05_45/0.3)] backdrop-blur transition-colors hover:bg-accent/50 sm:bottom-7 sm:left-7"
        >
          <ArrowUp className="h-4.5 w-4.5" />
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-primary/20" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
