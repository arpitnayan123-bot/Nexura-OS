#!/usr/bin/env node
/* ============================================================
 * NXP-FINAL-GOLD — App-surface accent unification (FINAL PASS)
 *
 * Replaces the legacy pre-gold coral/rose accent family with the
 * Liquid Champagne Gold brand family across ALL app components
 * (portal, connect, clinic, pharmacy, KYH, investors, booking).
 *
 * Mapping (white-ink contrast verified):
 *   #D98B6E coral        → #A16207 deep gold  (brand accent, 4.9:1 w/ white)
 *   #C97759 coral hover  → #8A5A04 deep gold hover
 *   #C97A5D coral hover  → #8A5A04
 *   #A55A4A dark coral   → #8A5A04 deep gold ink
 *   #C98A7A rose         → #B8860B gold mid (borders/rings/slots)
 *   #9A6A5A deep rose    → #8A5A04 deep gold ink
 *   #E0B080 light amber  → #C9962E refined amber
 *   gradient ramps       → deep-gold ramps (white text safe end-to-end)
 *   sage gradient ends   → deep sage #7A9A7B (wellness arc preserved)
 *
 * NOT touched: nxf emerald/navy (predictive sub-brand), semantic
 * status colors, illustration palettes, neutral warm neutrals.
 * ============================================================ */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["/home/z/my-project/src/components", "/home/z/my-project/src/app"];
const SKIP_DIRS = new Set(["node_modules", "premium", "diy", "predictive"]);

/** Ordered replacements — qualified patterns FIRST, flats LAST. */
const REPLS = [
  // 1) full ramps with white ink (portal booking headers, connect)
  ["from-[#D98B6E] via-[#C97759] to-[#9DB89E]", "from-[#8F5E06] via-[#A16207] to-[#B8860B]"],
  ["from-[#D98B6E] to-[#E0B080]", "from-[#A16207] to-[#C9962E]"],
  ["from-[#D98B6E] to-[#C98A7A]", "from-[#A16207] to-[#8F5E06]"],
  ["from-[#D98B6E] to-[#C97759]", "from-[#A16207] to-[#8A5A04]"],
  ["from-[#D98B6E] to-[#9DB89E]", "from-[#A16207] to-[#7A9A7B]"],
  ["from-[#D98B6E]/60 to-[#C98A7A]/60", "from-[#A16207]/60 to-[#8F5E06]/60"],
  ["from-[#D98B6E]/40 to-[#C98A7A]/40", "from-[#A16207]/40 to-[#8F5E06]/40"],
  ["from-[#D98B6E]/15 to-[#9DB89E]/15", "from-[#A16207]/15 to-[#7A9A7B]/15"],
  ["from-[#D98B6E]/10 via-[#E0B080]/5 to-[#9DB89E]/10", "from-[#A16207]/10 via-[#C9962E]/5 to-[#7A9A7B]/10"],
  ["from-[#D98B6E]/10 to-[#9DB89E]/5", "from-[#A16207]/10 to-[#7A9A7B]/5"],
  ["from-[#D98B6E]/8 to-[#E0B080]/8", "from-[#A16207]/8 to-[#C9962E]/8"],
  ["hover:bg-[#C97759]", "hover:bg-[#8A5A04]"],
  ["hover:border-[#C97759]", "hover:border-[#8A5A04]"],
  ["hover:text-[#E0B080]", "hover:text-[#D9B87C]"],
  ["to-[#C97A5D]", "to-[#8A5A04]"],
  ["to-[#E0B080]", "to-[#C9962E]"],
  ["to-[#9DB89E]", "to-[#7A9A7B]"],
  ["via-[#C97759]", "via-[#A16207]"],
  // 2) hex-alpha rgba-style forms (KYH washes)
  ["#C98A7A15", "#A1620715"],
  ["#C98A7A20", "#A1620720"],
  ["#C98A7A18, #C98A7A08", "#A1620718, #A1620708"],
  // 3) qualified solid bg with white ink (rose → deep gold)
  ["bg-[#C98A7A] font-serif text-base font-bold text-white", "bg-[#A16207] font-serif text-base font-bold text-[#FFFDF6]"],
  ["bg-[#C98A7A] font-serif text-4xl font-bold text-white", "bg-[#A16207] font-serif text-4xl font-bold text-[#FFFDF6]"],
  // 4) flat tokens
  ["#D98B6E", "#A16207"],
  ["#C97759", "#8A5A04"],
  ["#C97A5D", "#8A5A04"],
  ["#A55A4A", "#8A5A04"],
  ["#C98A7A", "#B8860B"],
  ["#9A6A5A", "#8A5A04"],
  ["#E0B080", "#C9962E"],
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (/\.(tsx?|css)$/.test(name)) yield p;
  }
}

const changed = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (file.includes("/site/") && !file.includes("segment-error-boundary")) {
      // marketing site components already unified by final-gold-codemod
      if (!file.endsWith("segment-error-boundary.tsx")) continue;
    }
    let src = readFileSync(file, "utf8");
    const before = src;
    for (const [from, to] of REPLS) {
      while (src.includes(from)) src = src.replace(from, to);
    }
    if (src !== before) {
      writeFileSync(file, src);
      changed.push(file.replace("/home/z/my-project/", ""));
    }
  }
}
console.log(`Files changed: ${changed.length}`);
for (const f of changed) console.log("  ✓", f);
