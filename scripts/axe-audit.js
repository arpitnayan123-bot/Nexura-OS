/* Axe-core audit across key consumer surfaces.
   Injects axe from CDN, runs full scan, prints compact violation report. */
const { chromium } = require("playwright");
const fs = require("fs");

const PAGES = [
  ["home", "http://localhost:3000/"],
  ["pricing", "http://localhost:3000/pricing"],
  ["kyh", "http://localhost:3000/know-your-health"],
  ["portal", "http://localhost:3000/portal"],
  ["care", "http://localhost:3000/care"],
  ["vitals", "http://localhost:3000/vitals"],
  ["clinic", "http://localhost:3000/clinic"],
  ["pharmacy", "http://localhost:3000/pharmacy"],
];

const AXE = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";

(async () => {
  const exe = "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
  const browser = await chromium.launch({ executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const report = {};
  for (const [name, url] of PAGES) {
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(2500); // lazy overlays/animations settle
      await page.addScriptTag({ path: "/home/z/my-project/scripts/audit/axe.min.js" });
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, {
          resultTypes: ["violations"],
          rules: { "region": { enabled: false } }, // marketing pages w/o landmass regions: noisy, tracked separately
        });
        return r.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          sample: v.nodes.slice(0, 30).map(n => ({
            t: (n.target[0] || "").toString().slice(0, 90),
            why: (n.failureSummary || "").replace(/\n\s*/g, " | ").slice(0, 200),
          })),
          help: v.help,
        }));
      });
      report[name] = res;
    } catch (e) {
      report[name] = [{ id: "AUDIT_ERROR", impact: "unknown", nodes: 0, sample: [String(e).slice(0, 120)], help: "" }];
    }
    await page.close ? null : null;
    await browser.contexts()[0].pages().length; // noop
    if (ctx.pages) ctx.pages().forEach(p => { if (p !== page && !p.isClosed()) p.close().catch(()=>{}); });
  }
  fs.writeFileSync("/home/z/my-project/scripts/audit/axe-report.json", JSON.stringify(report, null, 1));
  // compact console summary
  for (const [name, vs] of Object.entries(report)) {
    console.log(`\n=== ${name} — ${vs.reduce((a, v) => a + v.nodes, 0)} violation nodes`);
    for (const v of vs) {
      console.log(`  [${v.impact}] ${v.id} ×${v.nodes} — ${v.help}`);
      if (v.sample[0]) console.log(`     e.g. ${v.sample[0]}`);
    }
  }
  await browser.close();
})();
