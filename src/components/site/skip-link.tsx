"use client";

import { useEffect, useRef } from "react";

/**
 * Skip link — first focusable element, visible on Tab focus.
 * Lets keyboard users jump straight to main content.
 */
export function SkipLink({ target = "#main" }: { target?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // ensure the main landmark has an id we can target
    const main = document.querySelector("main");
    if (main && !main.id) main.id = "main";
  }, []);
  return (
    <a
      ref={ref}
      href={target}
      className="sr-only z-[100] rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:shadow-lg"
    >
      Skip to content
    </a>
  );
}
