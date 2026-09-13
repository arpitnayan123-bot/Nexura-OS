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
