#!/usr/bin/env node
// Dead-end scanner: find fetch() targets in components/pages that have no matching API route
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();
const apiDir = path.join(root, "src/app/api");

// 1. Collect real API routes
const routes = new Set();
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "route.ts") {
      const rel = path.relative(path.join(root, "src/app"), p).replace(/\/route\.ts$/, "");
      routes.add("/" + rel);
    }
  }
}
walk(apiDir);

// dynamic segments: /nx/patients/[id] -> match /nx/patients/xyz
function routeExists(target) {
  if (routes.has(target)) return true;
  for (const r of routes) {
    const rSeg = r.split("/");
    const tSeg = target.split("/");
    if (rSeg.length !== tSeg.length) continue;
    let ok = true;
    for (let i = 0; i < rSeg.length; i++) {
      if (rSeg[i].startsWith("[") && rSeg[i].endsWith("]")) continue;
      if (rSeg[i] !== tSeg[i]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

// 2. Extract fetch targets from all tsx/ts in src
const targets = new Map(); // url -> [files]
function scanFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) scanFiles(p);
    else if (/\.(tsx?|ts)$/.test(e.name)) {
      const src = fs.readFileSync(p, "utf8");
      const re = /fetch\(\s*[`'"]([^`'"]+)[`'"]/g;
      let m;
      while ((m = re.exec(src))) {
        let url = m[1];
        if (url.startsWith("/api/")) {
          // strip query/template parts
          url = url.split("?")[0].split("${")[0];
          if (!targets.has(url)) targets.set(url, new Set());
          targets.get(url).add(path.relative(root, p));
        }
      }
      // also axios-style or client calls skipped; fetch covers this codebase
    }
  }
}
scanFiles(path.join(root, "src"));

// 3. Report
const missing = [...targets.entries()].filter(([u]) => !routeExists(u));
console.log(`API routes: ${routes.size}, distinct fetch targets: ${targets.size}`);
if (missing.length === 0) { console.log("NO DEAD ENDS"); process.exit(0); }
console.log("\nDEAD ENDS (fetched but no route):");
for (const [u, files] of missing.sort()) {
  console.log(`  ${u}`);
  for (const f of files) console.log(`     <- ${f}`);
}
