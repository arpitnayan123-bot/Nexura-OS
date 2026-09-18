#!/usr/bin/env node
/* Nexura OS — theme migration: hardcoded slate/amber/etc → semantic tokens */
const fs = require("fs");
const path = require("path");

const DIR = "/home/z/my-project/src/components/nx";
const FILES = [
  ...fs
    .readdirSync(DIR)
    .filter((f) => /^mod-.*\.tsx$/.test(f))
    .map((f) => path.join(DIR, f)),
  path.join(DIR, "bits.tsx"),
];

// Ordered longest-first to avoid partial-prefix shadowing.
const MAP = [
  /* ---- ink (text) ---- */
  ["text-slate-50", "text-ink"],
  ["text-slate-100", "text-ink"],
  ["text-slate-200", "text-ink"],
  ["text-slate-300", "text-ink-2"],
  ["text-slate-400", "text-ink-3"],
  ["text-slate-500", "text-ink-3"],
  ["text-slate-600", "text-ink-4"],
  ["text-slate-950", "text-accent-ink"],
  /* ---- lines ---- */
  ["border-slate-800/70", "border-line"],
  ["border-slate-800/80", "border-line"],
  ["border-slate-800/60", "border-line"],
  ["border-slate-800/50", "border-line"],
  ["border-slate-800", "border-line"],
  ["border-slate-700", "border-line-2"],
  ["border-slate-600", "border-line-2"],
  ["divide-slate-800", "divide-line"],
  /* ---- surfaces ---- */
  ["bg-slate-950/60", "bg-panel"],
  ["bg-slate-950/40", "bg-panel"],
  ["bg-slate-900/70", "bg-panel"],
  ["bg-slate-900/60", "bg-panel"],
  ["bg-slate-900/40", "bg-panel"],
  ["bg-slate-900", "bg-panel"],
  ["bg-slate-800/80", "bg-inset"],
  ["bg-slate-800/70", "bg-inset"],
  ["bg-slate-800/60", "bg-inset"],
  ["bg-slate-800/50", "bg-inset"],
  ["bg-slate-800", "bg-inset"],
  ["bg-slate-700/70", "bg-inset"],
  ["bg-slate-700", "bg-inset"],
  ["bg-slate-600", "bg-inset"],
  /* ---- accent (amber family → accent tokens) ---- */
  ["text-amber-200", "text-accent"],
  ["text-amber-300", "text-accent"],
  ["text-amber-400", "text-accent"],
  ["text-amber-500", "text-accent"],
  ["bg-amber-400", "bg-accent"],
  ["bg-amber-500/30", "bg-accent-soft"],
  ["bg-amber-500/15", "bg-accent-soft"],
  ["bg-amber-500/10", "bg-accent-soft"],
  ["bg-amber-500/5", "bg-accent-soft"],
  ["bg-amber-500", "bg-accent"],
  ["bg-amber-950/60", "bg-accent-soft"],
  ["bg-amber-950/40", "bg-accent-soft"],
  ["bg-amber-950/30", "bg-accent-soft"],
  ["bg-amber-950/20", "bg-accent-soft"],
  ["bg-amber-950/10", "bg-accent-soft"],
  ["bg-amber-900/40", "bg-accent-soft"],
  ["border-amber-900/60", "border-accent-line"],
  ["border-amber-900/50", "border-accent-line"],
  ["border-amber-900/40", "border-accent-line"],
  ["border-amber-800/60", "border-accent-line"],
  ["border-amber-700/60", "border-accent-line"],
  ["border-amber-500/60", "border-accent-line"],
  ["border-amber-500/50", "border-accent-line"],
  ["border-amber-500/25", "border-accent-line"],
  ["border-amber-500", "border-accent-line"],
  ["ring-amber-500/40", "ring-accent-line"],
  ["ring-amber-500/25", "ring-accent-line"],
  /* ---- good (emerald/teal) ---- */
  ["text-emerald-400/80", "text-good"],
  ["text-emerald-300", "text-good"],
  ["text-emerald-400", "text-good"],
  ["text-emerald-500", "text-good"],
  ["text-teal-300", "text-good"],
  ["bg-emerald-950/60", "bg-good-soft"],
  ["bg-emerald-950/40", "bg-good-soft"],
  ["bg-emerald-950/30", "bg-good-soft"],
  ["bg-emerald-950/20", "bg-good-soft"],
  ["bg-emerald-900/60", "bg-good-soft"],
  ["bg-emerald-600", "bg-good"],
  ["bg-emerald-500", "bg-good"],
  ["bg-teal-950/40", "bg-good-soft"],
  ["bg-teal-500", "bg-good"],
  ["border-emerald-900/60", "border-good-line"],
  ["border-emerald-900/50", "border-good-line"],
  ["border-emerald-800/60", "border-good-line"],
  ["border-emerald-600", "border-good"],
  ["border-teal-800/60", "border-good-line"],
  /* ---- crit (rose) ---- */
  ["text-rose-300/70", "text-crit"],
  ["text-rose-100", "text-crit"],
  ["text-rose-200", "text-crit"],
  ["text-rose-300", "text-crit"],
  ["text-rose-400", "text-crit"],
  ["bg-rose-950/60", "bg-crit-soft"],
  ["bg-rose-950/50", "bg-crit-soft"],
  ["bg-rose-950/40", "bg-crit-soft"],
  ["bg-rose-950/30", "bg-crit-soft"],
  ["bg-rose-950/20", "bg-crit-soft"],
  ["bg-rose-950/10", "bg-crit-soft"],
  ["bg-rose-500", "bg-crit"],
  ["border-rose-900/60", "border-crit-line"],
  ["border-rose-900/50", "border-crit-line"],
  ["border-rose-800/60", "border-crit-line"],
  ["border-rose-800", "border-crit-line"],
  /* ---- info (sky/blue) ---- */
  ["text-sky-400", "text-info"],
  ["text-sky-500", "text-info"],
  ["bg-sky-950/60", "bg-info-soft"],
  ["bg-sky-950/20", "bg-info-soft"],
  ["bg-sky-500/5", "bg-info-soft"],
  ["bg-sky-500", "bg-info"],
  ["bg-blue-400", "bg-info"],
  ["border-sky-900/60", "border-info-line"],
  ["border-sky-800/60", "border-info-line"],
  /* ---- vio (violet) ---- */
  ["text-violet-200/90", "text-ink-2"],
  ["text-violet-200", "text-vio"],
  ["text-violet-300", "text-vio"],
  ["text-violet-400", "text-vio"],
  ["bg-violet-950/60", "bg-vio-soft"],
  ["bg-violet-950/40", "bg-vio-soft"],
  ["bg-violet-950/30", "bg-vio-soft"],
  ["bg-violet-950/20", "bg-vio-soft"],
  ["bg-violet-600/30", "bg-vio-soft"],
  ["bg-violet-600/20", "bg-vio-soft"],
  ["bg-violet-500", "bg-vio"],
  ["border-violet-900/60", "border-vio-line"],
  ["border-violet-900/50", "border-vio-line"],
  ["border-violet-800/60", "border-vio-line"],
  ["ring-violet-500/40", "ring-vio-line"],
  /* ---- misc ---- */
  ["bg-orange-500", "bg-warn"],
];

let total = 0;
for (const file of FILES) {
  let src = fs.readFileSync(file, "utf8");
  let count = 0;
  for (const [from, to] of MAP) {
    const re = new RegExp(`(?<![\\w-])${from.replace(/\//g, "\\/")}(?![\\w-])`, "g");
    src = src.replace(re, () => {
      count++;
      return to;
    });
  }
  // toast bridge: record + focus-aware toasts
  if (src.includes(`from "sonner"`)) {
    src = src.replace(/from "sonner"/g, `from "./os/toast"`);
    count++;
  }
  fs.writeFileSync(file, src);
  console.log(`${path.basename(file).padEnd(22)} ${count}`);
  total += count;
}
console.log(`TOTAL: ${total}`);
