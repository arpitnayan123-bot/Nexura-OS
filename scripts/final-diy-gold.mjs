#!/usr/bin/env node
/* ============================================================
 * NXP-FINAL-GOLD — DIY accent refinement (Liquid Gold FINAL)
 * Terracotta valley accent → Liquid Champagne Gold family,
 * matching the Hospital OS refinement (Solar Amber → Champagne).
 * Canvas (#F7EFE3 cream), sage secondary (#7A9A7B), and the
 * valley illustration palette (scenery.tsx) are preserved.
 *
 * Mapping (lightness structure preserved):
 *   #B05A34 deep terracotta → #A16207 deep gold  (brand accent)
 *   #C96F45 mid  terracotta → #B8860B gold mid   (borders/hover)
 *   solid bg w/ white text  → #A16207 (AA contrast)
 *   #E29A72 light terracotta→ #D9B87C champagne  (rings/top gradient)
 *   #F6E3D3 soft terra bg   → #F3E8CF soft champagne bg
 *   button gradient         → champagne→gold→bronze  (#D9B87C/#B8860B/#8F5E06)
 * ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";

const REPLS = [
  // deep accent everywhere
  ["#B05A34", "#A16207"],
  // mid gold for borders/hovers/gradients
  ["#C96F45", "#B8860B"],
  // solid radio fill with white ink → deep gold for AA contrast
  ["bg-[#B8860B] text-white", "bg-[#A16207] text-[#FFFDF6]"],
  // light ring + soft bg
  ["#E29A72", "#D9B87C"],
  ["#F6E3D3", "#F3E8CF"],
  // brand chip gradient: champagne → deep gold → sage (wellness arc kept)
  [
    "bg-gradient-to-r from-[#B8860B] via-[#A16207] to-[#7A9A7B]",
    "bg-gradient-to-r from-[#D9B87C] via-[#A16207] to-[#7A9A7B]",
  ],
];

const CSS_REPLS = [
  // .diy-btn-primary + .diy-btn-icon-terra: bevel gradient, border, shadows
  ["border: 1px solid rgba(140, 68, 34, 0.55);", "border: 1px solid rgba(138, 90, 4, 0.55);"],
  [
    "linear-gradient(180deg, #E29A72 0%, #C96F45 48%, #B05A34 100%)",
    "linear-gradient(180deg, #D9B87C 0%, #B8860B 48%, #8F5E06 100%)",
  ],
  ["inset 0 -2px 3px rgba(84, 30, 8, 0.28)", "inset 0 -2px 3px rgba(90, 62, 8, 0.28)"],
  ["0 10px 20px -8px rgba(150, 76, 40, 0.55)", "0 10px 20px -8px rgba(146, 106, 14, 0.55)"],
  ["0 2px 6px -2px rgba(150, 76, 40, 0.35)", "0 2px 6px -2px rgba(146, 106, 14, 0.35)"],
  ["0 14px 26px -10px rgba(150, 76, 40, 0.6)", "0 14px 26px -10px rgba(146, 106, 14, 0.6)"],
  ["0 3px 8px -2px rgba(150, 76, 40, 0.4)", "0 3px 8px -2px rgba(146, 106, 14, 0.4)"],
  ["inset 0 2px 4px rgba(70, 24, 6, 0.35)", "inset 0 2px 4px rgba(74, 52, 6, 0.35)"],
  ["0 4px 10px -6px rgba(150, 76, 40, 0.5)", "0 4px 10px -6px rgba(146, 106, 14, 0.5)"],
  ["0 8px 16px -6px rgba(150, 76, 40, 0.5)", "0 8px 16px -6px rgba(146, 106, 14, 0.5)"],
  [
    "/* ---- textured primary button: mineral grain over a bevel ---- */",
    "/* ---- textured primary button: mineral grain over a bevel ----\n   (accent refined terracotta → Liquid Champagne Gold, FINAL pass) */",
  ],
];

let total = 0;
for (const f of [
  "app.tsx",
  "dashboard.tsx",
  "onboarding.tsx",
  "skincare.tsx",
  "settings.tsx",
  "consent-sheet.tsx",
]) {
  const path = `/home/z/my-project/src/components/diy/${f}`;
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  let n = 0;
  for (const [from, to] of REPLS) {
    while (src.includes(from)) {
      src = src.replace(from, to);
      n++;
    }
  }
  if (n) writeFileSync(path, src);
  console.log(`diy/${f}: ${n}`);
  total += n;
}
{
  const path = "/home/z/my-project/src/app/globals.css";
  let src = readFileSync(path, "utf8");
  let n = 0;
  for (const [from, to] of CSS_REPLS) {
    while (src.includes(from)) {
      src = src.replace(from, to);
      n++;
    }
  }
  writeFileSync(path, src);
  console.log(`globals.css: ${n}`);
  total += n;
}
console.log(`TOTAL: ${total}`);
