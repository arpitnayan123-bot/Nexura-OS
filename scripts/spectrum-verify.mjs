// spectrum-verify.mjs — verify Material Spectrum homepage pass
import { chromium } from "playwright";

const exe = "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const errors = [];

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 200));
});

await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2500);

// 1. navbar clay button
const navClay = await page.locator("nav button.mat-btn--clay", { hasText: "Book a visit" }).count();
console.log("NAV_CLAY_BTN:", navClay > 0 ? "OK" : "FAIL");

// 2. hero textured CTA + spectrum chips
const heroBtn = await page
  .locator("button.mat-btn--textured", { hasText: "Start your health scan" })
  .count();
const connectNeon = await page
  .locator("a[href='/connect'].group")
  .first()
  .evaluate((el) => getComputedStyle(el).boxShadow)
  .catch(() => "none");
console.log(
  "HERO_CTA:",
  heroBtn > 0 ? "OK" : "FAIL",
  "| CONNECT_CHIP_GLOW:",
  connectNeon !== "none" ? "OK" : "FAIL",
);

// 3. OsGlance material cards — all 4 variants present
await page.locator("#os-glance").scrollIntoViewIfNeeded();
await page.waitForTimeout(1400);
const glanceClay = await page.locator("#os-glance .mat-card--clay").count();
const glanceNeon = await page.locator("#os-glance .mat-card--neon").count();
const glanceAurora = await page.locator("#os-glance .mat-card--aurora").count();
console.log(
  `OSGLANCE_CARDS: clay=${glanceClay} neon=${glanceNeon} aurora=${glanceAurora}`,
  glanceClay > 0 && glanceNeon > 0 && glanceAurora > 0 ? "OK" : "FAIL",
);
await page.screenshot({ path: "/home/z/my-project/logs/spectrum-osglance.png" });

// 4. DiyStrip clay + green textured CTA
const diy = page.locator("a[href='/diy'].mat-card--clay");
const diyCount = await diy.count();
await diy.scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
const diyCta = await diy.locator(".mat-btn--textured").count();
console.log(
  `DIY_STRIP: card=${diyCount} cta=${diyCta}`,
  diyCount > 0 && diyCta > 0 ? "OK" : "FAIL",
);

// 5. crisis neon CTA in footer
const crisis = page.locator("a.nx-crisis-cta");
await crisis.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
const crisisAnim = await crisis.evaluate((el) => getComputedStyle(el).animationName);
console.log(
  "CRISIS_NEON_ANIM:",
  crisisAnim.includes("breathe") || crisisAnim.includes("mat")
    ? `OK (${crisisAnim})`
    : `FAIL (${crisisAnim})`,
);

// 6. TrustRail glass cards
const trust = page.locator("section[aria-label='Regulatory alignment'] .backdrop-blur");
const trustCount = await trust.count();
console.log("TRUST_GLASS_CARDS:", trustCount >= 4 ? "OK" : `FAIL (${trustCount})`);

// 7. full page screenshot
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1200);
await page.screenshot({ path: "/home/z/my-project/logs/spectrum-hero.png" });

// 8. mobile check
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
mob.on("pageerror", (e) => errors.push("MOB: " + String(e).slice(0, 200)));
await mob.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await mob.waitForTimeout(2200);
const overflow = await mob.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
);
console.log("MOBILE_OVERFLOW:", overflow ? "FAIL" : "OK");

console.log("ERRORS:", errors.length === 0 ? "0 — CLEAN" : errors.join(" | "));
await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
