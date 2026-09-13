"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

/* =============================================================
   Nexura OS — Ambient background primitives (always looping)
   ============================================================= */

/** Soft drifting aurora blobs that fill section backgrounds with warm light */
export function AuroraBackground({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "sage" | "honey";
}) {
  const palettes = {
    default: [
      "from-[oklch(0.85_0.12_45_0.55)] to-[oklch(0.80_0.10_30_0.0)]",
      "from-[oklch(0.86_0.08_75_0.50)] to-[oklch(0.85_0.07_90_0.0)]",
      "from-[oklch(0.84_0.06_155_0.45)] to-[oklch(0.85_0.05_150_0.0)]",
    ],
    sage: [
      "from-[oklch(0.84_0.06_155_0.55)] to-[oklch(0.85_0.05_150_0.0)]",
      "from-[oklch(0.86_0.09_180_0.45)] to-[oklch(0.85_0.06_170_0.0)]",
      "from-[oklch(0.85_0.07_140_0.40)] to-[oklch(0.84_0.05_140_0.0)]",
    ],
    honey: [
      "from-[oklch(0.85_0.10_75_0.55)] to-[oklch(0.85_0.08_85_0.0)]",
      "from-[oklch(0.85_0.12_55_0.50)] to-[oklch(0.85_0.10_45_0.0)]",
      "from-[oklch(0.84_0.06_100_0.42)] to-[oklch(0.85_0.05_100_0.0)]",
    ],
  }[variant];

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "absolute -top-24 -left-24 h-[42rem] w-[42rem] rounded-full bg-gradient-to-br blur-3xl anim-aurora opacity-90",
          palettes[0]
        )}
        style={{ animationDelay: "0s" }}
      />
      <div
        className={cn(
          "absolute top-1/3 -right-32 h-[36rem] w-[36rem] rounded-full bg-gradient-to-br blur-3xl anim-aurora opacity-80",
          palettes[1]
        )}
        style={{ animationDelay: "-6s", animationDuration: "22s" }}
      />
      <div
        className={cn(
          "absolute -bottom-40 left-1/4 h-[38rem] w-[38rem] rounded-full bg-gradient-to-br blur-3xl anim-aurora opacity-70",
          palettes[2]
        )}
        style={{ animationDelay: "-12s", animationDuration: "26s" }}
      />
    </div>
  );
}

/** Floating warm particles drifting upward — gentle, low-opacity */
export function FloatingParticles({
  count = 18,
  className,
  color = "var(--coral)",
}: {
  count?: number;
  className?: string;
  color?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 3 + Math.random() * 7,
        delay: -Math.random() * 14,
        duration: 12 + Math.random() * 10,
        drift: `${(Math.random() - 0.5) * 40}px`,
        opacity: 0.25 + Math.random() * 0.45,
      })),
    // regenerate when count changes; only after mount to avoid SSR mismatch
    [count, mounted]
  );

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {mounted &&
        particles.map((p) => (
          <span
            key={p.id}
            className="absolute bottom-0 rounded-full"
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                background: color,
                opacity: p.opacity,
                filter: "blur(0.5px)",
                ["--drift" as string]: p.drift,
                animation: `nexura-particle-rise ${p.duration}s linear infinite`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
    </div>
  );
}

/** Breathing soft orb — used as ambient accent + as a live "pulse" indicator */
export function BreathingOrb({
  className,
  size = 120,
  color = "var(--coral)",
  ring = true,
}: {
  className?: string;
  size?: number;
  color?: string;
  ring?: boolean;
}) {
  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {ring && (
        <span
          className="absolute inset-0 rounded-full pulse-ring"
          style={{ borderColor: color }}
        />
      )}
      <div
        className="absolute inset-0 rounded-full anim-breathe"
        style={{
          background: `radial-gradient(circle at 30% 30%, color-mix(in oklch, ${color} 90%, white 20%), ${color} 60%, color-mix(in oklch, ${color} 60%, transparent) 100%)`,
          filter: "blur(2px)",
          opacity: 0.55,
        }}
      />
      <div
        className="relative h-1/2 w-1/2 rounded-full anim-breathe"
        style={{
          background: `radial-gradient(circle at 35% 30%, white, ${color} 70%)`,
          boxShadow: `0 0 40px 6px color-mix(in oklch, ${color} 50%, transparent)`,
          animationDelay: "-0.6s",
        }}
      />
    </div>
  );
}

/** Animated ECG / heartbeat line drawn with SVG stroke */
export function EcgLine({
  className,
  color = "var(--coral)",
  width = 320,
  height = 60,
}: {
  className?: string;
  color?: string;
  width?: number;
  height?: number;
}) {
  const seg = 64;
  const segments = Math.ceil(width / seg);
  let d = `M0 ${height / 2}`;
  for (let i = 0; i < segments; i++) {
    const x = i * seg;
    d += ` L${x + 18} ${height / 2}`;
    d += ` L${x + 24} ${height / 2 - 4}`;
    d += ` L${x + 30} ${height / 2 + 18}`;
    d += ` L${x + 36} ${height / 2 - 14}`;
    d += ` L${x + 42} ${height / 2 + 4}`;
    d += ` L${x + 50} ${height / 2}`;
    d += ` L${x + seg} ${height / 2}`;
  }

  return (
    <svg
      className={cn("overflow-visible", className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden
    >
      <path
        d={d}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 1200,
          strokeDashoffset: 1200,
          animation: "nexura-ecg 3.6s linear infinite",
        }}
      />
      <path
        d={d}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.18}
      />
    </svg>
  );
}

/** Rotating conic gradient border wrapper */
export function GradientRing({
  className,
  children,
  speed = 14,
}: {
  className?: string;
  children?: React.ReactNode;
  speed?: number;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute -inset-[1.5px] rounded-[inherit] opacity-70 blur-[1px] anim-gradient"
        style={{
          background:
            "conic-gradient(from 0deg, var(--coral), var(--honey), var(--sage), var(--clay), var(--coral))",
          backgroundSize: "200% 200%",
          animation: `nexura-gradient-pan ${speed}s ease infinite`,
        }}
        aria-hidden
      />
      <div className="relative rounded-[inherit] bg-card">{children}</div>
    </div>
  );
}

/** Subtle grain / noise overlay */
export function GrainOverlay({ className }: { className?: string }) {
  return <div aria-hidden className={cn("noise absolute inset-0", className)} />;
}

/** Wrapper that fades + lifts children into view on scroll */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
  once = true,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
