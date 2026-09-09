"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor-follow warm glow — a soft radial light that trails the pointer,
 * giving the hero a premium, alive feel. Hidden on touch / reduced motion.
 */
export function CursorGlow({ color = "var(--coral)" }: { color?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mq.matches || reduced.matches) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let moved = false;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!moved && ref.current) {
        moved = true;
        ref.current.style.opacity = "0.55";
      }
    };
    const loop = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      if (ref.current) {
        ref.current.style.transform = `translate(${cx - 250}px, ${cy - 250}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      aria-hidden
      ref={ref}
      className="pointer-events-none fixed left-0 top-0 z-30 h-[500px] w-[500px] rounded-full opacity-0 mix-blend-soft-light transition-opacity duration-700"
      style={{
        background: `radial-gradient(circle at center, color-mix(in oklch, ${color} 45%, transparent), transparent 60%)`,
      }}
    />
  );
}
