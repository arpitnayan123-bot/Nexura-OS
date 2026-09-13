/* ============================================================
   NEXURA PREMIUM KIT — shared "Liquid Gold" building blocks
   ------------------------------------------------------------
   Derived from the ui-ux-pro-max design system (Luxury/Premium
   palette + Liquid Glass style + scroll-storytelling pattern).
   Every product page composes these instead of hand-rolling
   its own hero/heading/card styles, so the whole OS reads like
   one design team made it.
   ============================================================ */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Eyebrow — chapter label with gold dash ---------- */

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("eyebrow", className)}>{children}</span>;
}

/* ---------- SectionHeading — eyebrow + Fraunces title + lede ---------- */

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "center",
  goldWords,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  /** highlight these words inside the title with the gold gradient */
  goldWords?: string[];
  lede?: string;
  align?: "left" | "center";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "max-w-3xl",
        centered && "mx-auto text-center",
        className,
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Eyebrow>{eyebrow}</Eyebrow>
      </motion.div>
      <motion.h2
        className="title-lux mt-4 text-3xl sm:text-4xl lg:text-[2.75rem]"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      >
        {goldWords ? goldify(title, goldWords) : title}
      </motion.h2>
      {lede ? (
        <motion.p
          className={cn("lede-lux mt-5", centered && "mx-auto")}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {lede}
        </motion.p>
      ) : null}
    </div>
  );
}

/** wrap occurrences of goldWords in the champagne gradient span */
function goldify(node: React.ReactNode, words: string[]): React.ReactNode {
  if (typeof node === "string") {
    let parts: React.ReactNode[] = [node];
    for (const w of words) {
      parts = parts.flatMap((p) => {
        if (typeof p !== "string" || !p.includes(w)) return [p];
        const chunks = p.split(w);
        const out: React.ReactNode[] = [];
        chunks.forEach((c, i) => {
          out.push(c);
          if (i < chunks.length - 1)
            out.push(
              <span key={`${w}-${i}`} className="text-gold-gradient">
                {w}
              </span>,
            );
        });
        return out;
      });
    }
    return parts;
  }
  return node;
}

/* ---------- PageHero — premium hero for marketing/product pages ---------- */

export function PageHero({
  eyebrow,
  title,
  goldWords,
  lede,
  children,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  goldWords?: string[];
  lede?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden pt-32 pb-14 sm:pt-40 sm:pb-20", className)}>
      {/* ambient gold light + fine grain */}
      <div aria-hidden className="aurora-gold -top-32 left-1/2 h-[26rem] w-[42rem] -translate-x-1/2" />
      <div aria-hidden className="grain-fine" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center"
        >
          <Eyebrow>{eyebrow}</Eyebrow>
        </motion.div>
        <motion.h1
          className="title-lux mt-5 text-4xl sm:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {goldWords ? goldify(title, goldWords) : title}
        </motion.h1>
        {lede ? (
          <motion.p
            className="lede-lux mx-auto mt-6 max-w-2xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            {lede}
          </motion.p>
        ) : null}
        {children ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            {children}
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}

/* ---------- Buttons (wrappers so pages can't get the classes wrong) ---------- */

export function LuxButton({
  children,
  href,
  onClick,
  variant = "charcoal",
  className,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "charcoal" | "gold" | "glass";
  className?: string;
}) {
  const cls = cn(
    "h-11 rounded-full px-6 text-[0.95rem] font-medium cursor-pointer",
    variant === "charcoal" && "btn-lux",
    variant === "gold" && "btn-gold",
    variant === "glass" && "btn-glass-lux",
    className,
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function ArrowCta({ label, href }: { label: string; href: string }) {
  return (
    <LuxButton href={href} variant="gold">
      <span className="flex items-center gap-2">
        {label}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </LuxButton>
  );
}

/* ---------- Ornament — hairline + champagne diamond ---------- */

export function Ornament({ className }: { className?: string }) {
  return (
    <div className={cn("ornament mx-auto max-w-xs", className)} aria-hidden>
      <span />
    </div>
  );
}

/* ---------- Stat — Fraunces numeral with gold option ---------- */

export function Stat({
  value,
  label,
  gold,
  className,
}: {
  value: string;
  label: string;
  gold?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("text-center", className)}>
      <div className={cn("stat-lux text-4xl sm:text-5xl", gold && "text-gold-gradient")}>
        {value}
      </div>
      <div className="mt-2 text-[0.8rem] font-medium tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

/* ============================================================
   LIQUID GOLD 2.0 — MOTION KIT
   ------------------------------------------------------------
   Physics-first micro-interactions from the taste-skill:
   useMotionValue / useSpring OUTSIDE the React render cycle,
   spring presets (never linear), reduced-motion respected.
   ============================================================ */

import {
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

const SPRING = { stiffness: 110, damping: 18, mass: 0.6 };
const SPRING_SOFT = { stiffness: 60, damping: 16, mass: 0.8 };
const EASE_LUX = [0.16, 1, 0.3, 1] as const;

/* ---------- MagneticButton — cursor-attracted CTA physics ---------- */

export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, SPRING);
  const y = useSpring(my, SPRING);

  return (
    <motion.span
      ref={ref}
      className={cn("inline-block", className)}
      style={reduce ? undefined : { x, y }}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) * strength);
        my.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/* ---------- TiltCard — 3D pointer tilt with champagne glare ---------- */

export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), SPRING_SOFT);
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), SPRING_SOFT);

  return (
    <motion.div
      ref={ref}
      className={cn("[perspective:900px]", className)}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
    >
      <motion.div
        style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ---------- SpotlightCard — champagne spotlight follows the cursor ---------- */

export function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={cn("spotlight-card", className)}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}

/* ---------- TextReveal — word-by-word masked rise for display type ---------- */

export function TextReveal({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.045,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="reveal-word">
          <motion.span
            className={wordClassName}
            initial={{ y: "108%" }}
            animate={{ y: "0%" }}
            transition={{
              duration: 0.85,
              delay: delay + i * stagger,
              ease: EASE_LUX,
            }}
          >
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ---------- Counter — tabular count-up on first view ---------- */

export function Counter({
  to,
  suffix = "",
  prefix = "",
  decimals = 0,
  duration = 1.6,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduce]);

  const shown = reduce ? to : val;

  return (
    <span ref={ref} className={cn("tabular", className)}>
      {prefix}
      {shown.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ---------- StaggerGroup / StaggerItem — orchestrated children ---------- */

export function StaggerGroup({
  children,
  className,
  stagger = 0.09,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: "div" | "section" | "ul";
}) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({
  children,
  className,
  y = 18,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? {} : { opacity: 0, y, filter: "blur(3px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.65, ease: EASE_LUX },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Marquee — infinite logo/value rail with edge mask ---------- */

export function Marquee({
  children,
  duration = 42,
  className,
}: {
  children: React.ReactNode;
  duration?: number;
  className?: string;
}) {
  return (
    <div className={cn("marquee-mask overflow-hidden", className)}>
      <div className="marquee-track" style={{ "--marquee-dur": `${duration}s` } as React.CSSProperties}>
        {children}
        {children}
      </div>
    </div>
  );
}

/* ---------- ScrollProgress — hairline gold reading bar ---------- */

export function ScrollProgress({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const sx = useMotionValue(0);
  const scaleX = useSpring(sx, { stiffness: 140, damping: 26, mass: 0.4 });
  useEffect(() => {
    if (reduce) return;
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      sx.set(max > 0 ? h.scrollTop / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduce, sx]);
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      className={cn(
        "fixed inset-x-0 top-0 z-[70] h-[2px] origin-left",
        "bg-gradient-to-r from-[#A16207] via-[#D9B87C] to-[#A16207]",
        className,
      )}
      style={{ scaleX }}
    />
  );
}

export { SPRING, SPRING_SOFT, EASE_LUX };
