#!/usr/bin/env node
/* ============================================================
 * NXP-FINAL-GOLD — Final platform-wide accent unification
 * (Liquid Gold 2.0 · FINAL PASS)
 *
 * Replaces ALL legacy pre-gold accents in MARKETING surfaces
 * with the platform Liquid Gold family:
 *   deep gold   #A16207  (brand accent, buttons/icons/text)
 *   bronze ink  #8F5E06  (gradient deep slot / hover ink)
 *   amber mid   #B8860B  (hover/border mid)
 *   champagne   #D9B87C  (gradient light slot / on-dark glow)
 *
 * Sub-brand app accents (nxf emerald, connect brown, portal sky)
 * and SEMANTIC status colors are intentionally preserved.
 * Illustration palettes (diy/scenery) untouched.
 * ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = "/home/z/my-project/src/components/site";

/** file -> [ [from, to], ... ] — exact literal replacements */
const PLAN = {
  // Product-bento accents: every product chip/glow/hairline → brand gold
  "features-showcase.tsx": [
    ["accent: \"#C98A7A\"", "accent: \"#A16207\""],
    ["accent: \"#7C3AED\"", "accent: \"#A16207\""],
    ["accent: \"#D98B6E\"", "accent: \"#A16207\""],
    ["accent: \"#F59E0B\"", "accent: \"#A16207\""],
    ["accent: \"#0EA5E9\"", "accent: \"#A16207\""],
    ["accent: \"#10B981\"", "accent: \"#A16207\""],
    ["accent: \"#9DB89E\"", "accent: \"#A16207\""],
    ["accent: \"#1E40AF\"", "accent: \"#A16207\""],
  ],
  // Hamburger menu mirrors the bento data
  "hamburger-menu.tsx": [
    ["accent: \"#C98A7A\"", "accent: \"#A16207\""],
    ["accent: \"#7C3AED\"", "accent: \"#A16207\""],
    ["accent: \"#D98B6E\"", "accent: \"#A16207\""],
    ["accent: \"#F59E0B\"", "accent: \"#A16207\""],
    ["accent: \"#0EA5E9\"", "accent: \"#A16207\""],
    ["accent: \"#10B981\"", "accent: \"#A16207\""],
    ["accent: \"#9DB89E\"", "accent: \"#A16207\""],
    ["accent: \"#1E40AF\"", "accent: \"#A16207\""],
  ],
  // Product showcase tiles: uniform gold brand tile + champagne glow slots
  "product-showcase.tsx": [
    ["accent: \"#C98A7A\"", "accent: \"#A16207\""],
    ["gradient: \"from-[#C98A7A] to-[#A96A5A]\"", "gradient: \"from-[#8F5E06] to-[#D9B87C]\""],
    ["accent: \"#D98B6E\"", "accent: \"#A16207\""],
    ["gradient: \"from-[#D98B6E] to-[#C97A5D]\"", "gradient: \"from-[#8F5E06] to-[#D9B87C]\""],
    ["accent: \"#9DB89E\"", "accent: \"#A16207\""],
    ["gradient: \"from-[#9DB89E] to-[#7DA88E]\"", "gradient: \"from-[#8F5E06] to-[#D9B87C]\""],
    ["gradient: \"from-[#D98B6E] to-[#E0B080]\"", "gradient: \"from-[#8F5E06] to-[#D9B87C]\""],
    ["accent: \"#1E40AF\"", "accent: \"#A16207\""],
    ["gradient: \"from-[#0F172A] to-[#1E40AF]\"", "gradient: \"from-[#5C4408] to-[#B8860B]\""],
  ],
  // Hero chip + NEW badge
  "hero.tsx": [
    ["text-[#D98B6E]", "text-[#A16207]"],
    ["bg-[#D98B6E] px-1.5", "bg-[#A16207] px-1.5"],
  ],
  // How-it-works chapter cards
  "how-it-works/sections-platform.ts": [
    ["accent: \"#C98A7A\"", "accent: \"#A16207\""],
    ["accent: \"#1E40AF\"", "accent: \"#A16207\""],
    ["accent: \"#9DB89E\"", "accent: \"#A16207\""],
    ["accent: \"#7C3AED\"", "accent: \"#A16207\""],
    ["accent: \"#D98B6E\"", "accent: \"#A16207\""],
  ],
  "how-it-works/sections-clinical.ts": [
    ["accent: \"#C98A7A\"", "accent: \"#A16207\""],
    ["accent: \"#1E40AF\"", "accent: \"#A16207\""],
    ["accent: \"#9DB89E\"", "accent: \"#A16207\""],
    ["accent: \"#7C3AED\"", "accent: \"#A16207\""],
    ["accent: \"#D98B6E\"", "accent: \"#A16207\""],
  ],
  "how-it-works/sections-patients.ts": [
    ["accent: \"#C98A7A\"", "accent: \"#A16207\""],
    ["accent: \"#1E40AF\"", "accent: \"#A16207\""],
    ["accent: \"#9DB89E\"", "accent: \"#A16207\""],
    ["accent: \"#7C3AED\"", "accent: \"#A16207\""],
    ["accent: \"#D98B6E\"", "accent: \"#A16207\""],
    ["accent: \"#0EA5E9\"", "accent: \"#A16207\""],
    ["accent: \"#10B981\"", "accent: \"#A16207\""],
  ],
  // Decorative particles/glints on dark canvases → champagne
  "globe-card.tsx": [
    ["color: \"#D98B6E\"", "color: \"#D9B87C\""],
  ],
  "ai-strip.tsx": [
    ["color: \"#D98B6E\"", "color: \"#D9B87C\""],
    ["fill=\"#D98B6E\"", "fill=\"#D9B87C\""],
  ],
  "founder-badge.tsx": [
    ["to-[#D98B6E]/15", "to-[#D9B87C]/15"],
  ],
};

// ---- Global sub-brand: bright amber → deep brand gold (better AA contrast,
// ---- same family). Semantic status colors (#10B981 etc.) untouched.
const GLOBAL_PLAN = [
  ["const GOLD = \"#F59E0B\"", "const GOLD = \"#A16207\""],
  ["#F59E0B/10", "#A16207/10"],
  ["#F59E0B/15", "#A16207/15"],
  ["#F59E0B/20", "#A16207/20"],
  ["#F59E0B/25", "#A16207/25"],
  ["#F59E0B/30", "#A16207/30"],
  ["#F59E0B/35", "#A16207/35"],
  ["#F59E0B/40", "#A16207/40"],
  ["#F59E0B/50", "#A16207/50"],
  ["#F59E0B/60", "#A16207/60"],
  ["#F59E0B/30", "#A16207/30"],
  ["fill-[#F59E0B]", "fill-[#A16207]"],
  ["text-[#F59E0B]", "text-[#A16207]"],
  ["bg-[#F59E0B]", "bg-[#A16207]"],
  ["from-[#F59E0B]", "from-[#A16207]"],
  ["to-[#D97706]", "to-[#8A5A04]"],
  ["text-[#FBBF24]", "text-[#D9B87C]"],
  ["border-[#F59E0B]", "border-[#A16207]"],
  ["shadow-[#F59E0B]", "shadow-[#A16207]"],
  ["ring-[#F59E0B]", "ring-[#A16207]"],
  ["color: \"#F59E0B\"", "color: \"#A16207\""],
  ["border-[#FBBF24]", "border-[#D9B87C]"],
  ["bg-[#FBBF24]", "bg-[#D9B87C]"],
  ["#FBBF24", "#D9B87C"], // catch-all AFTER specific ones
  ["#F59E0B", "#A16207"], // catch-all AFTER qualified ones
  ["#D97706", "#8A5A04"],
];

const FILES_GLOBAL = ["global-page.tsx", "global-dashboard.tsx", "hospital-profile.tsx"];

let total = 0;
for (const [file, repls] of Object.entries(PLAN)) {
  const path = `${ROOT}/${file}`;
  let src = readFileSync(path, "utf8");
  let n = 0;
  for (const [from, to] of repls) {
    while (src.includes(from)) { src = src.replace(from, to); n++; }
  }
  writeFileSync(path, src);
  console.log(`${file}: ${n} replacements`);
  total += n;
}
for (const file of FILES_GLOBAL) {
  const path = `${ROOT}/${file}`;
  let src = readFileSync(path, "utf8");
  let n = 0;
  for (const [from, to] of GLOBAL_PLAN) {
    while (src.includes(from)) { src = src.replace(from, to); n++; }
  }
  writeFileSync(path, src);
  console.log(`${file}: ${n} replacements`);
  total += n;
}
console.log(`TOTAL: ${total} replacements applied`);
