"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  format?: "comma" | "plain";
  prefix?: string;
  suffix?: string;
  className?: string;
}

function formatNumber(n: number, format: "comma" | "plain") {
  if (format === "comma") return Math.round(n).toLocaleString("en-US");
  return String(Math.round(n));
}

export function AnimatedNumber({
  value,
  duration = 1.6,
  delay = 0,
  format = "comma",
  prefix = "",
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let start = 0;
    const animate = (t: number) => {
      if (!start) start = t;
      const elapsed = (t - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(animate);
    }, delay * 1000);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [inView, value, duration, delay]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatNumber(display, format)}
      {suffix}
    </span>
  );
}
