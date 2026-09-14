#!/usr/bin/env node
/* ============================================================
   backend-core-1 — product-route auth sweep codemod
   Rewrites every clinic/pharmacy route from
     export async function GET(req: NextRequest) {...}
   to
     async function GET_impl(req: NextRequest) {...}
     ...
     export const GET = withProductAuth("clinic.x.GET", GET_impl);
   Files that already use withProductAuth are skipped.
   Route bodies are NOT touched — only export shims move.
   ============================================================ */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/app/api/clinic", "src/app/api/pharmacy"];
const HANDLERS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const changed = [];
const skipped = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (entry === "route.ts") walk_file(p);
  }
}

function routeName(file) {
  const rel = relative("src/app/api", file).replace(/\\/g, "/");
  return rel.replace(/\/route\.ts$/, "").replace(/\//g, ".");
}

function walk_file(file) {
  const src = readFileSync(file, "utf8");
  if (src.includes("withProductAuth")) {
    skipped.push([file, "already swept"]);
    return;
  }
  if (/export const (GET|POST|PUT|PATCH|DELETE)/.test(src)) {
    skipped.push([file, "arrow-style export"]);
    return;
  }
  const re = /^export async function (GET|POST|PUT|PATCH|DELETE)\(/gm;
  const found = [...src.matchAll(re)].map((m) => m[1]);
  if (found.length === 0) {
    skipped.push([file, "no plain handler exports"]);
    return;
  }
  let out = src.replace(re, "async function $1_impl(");

  // Insert the import after the last top-of-file import line.
  const lines = out.split("\n");
  let lastImport = -1;
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    if (/^import /.test(lines[i])) lastImport = i;
  }
  const importLine = 'import { withProductAuth } from "@/lib/nx/product-auth";';
  if (lastImport >= 0) lines.splice(lastImport + 1, 0, importLine);
  else lines.unshift(importLine);
  out = lines.join("\n");

  // Append wrapper exports.
  const name = routeName(file);
  const wrappers = found
    .map((h) => `export const ${h} = withProductAuth("${name}.${h}", ${h}_impl);`)
    .join("\n");
  out = out.replace(/\n*$/, "\n") + "\n" + wrappers + "\n";

  writeFileSync(file, out);
  changed.push([file, found.join("+")]);
}

ROOTS.forEach(walk);
console.log(`CHANGED ${changed.length}:`);
for (const [f, h] of changed) console.log(`  ${f}  [${h}]`);
console.log(`SKIPPED ${skipped.length}:`);
for (const [f, why] of skipped) console.log(`  ${f}  (${why})`);
