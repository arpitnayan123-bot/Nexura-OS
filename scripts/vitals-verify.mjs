// vitals-verify.mjs — interactive verification of /vitals
import { chromium } from "playwright";

const exe = "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto("http://localhost:3000/vitals", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "/home/z/my-project/tool-results/labs/vitals-hero.png" });

// live heart-rate: capture value, wait, capture again — should change if live
await page.locator('div:has(> svg) >> text=Heart rate').first().scrollIntoViewIfNeeded();
const bpm1 = await page.locator('text=/^\\d+\\s*bpm$/').first().textContent();
const paused = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.getAttribute("aria-label")?.includes("Pause"));
  return b ? b.getAttribute("aria-pressed") : "missing";
});
await page.waitForTimeout(3600);
const bpm2 = await page.locator('text=/^\\d+\\s*bpm$/').first().textContent();
console.log("LIVE_HR:", bpm1?.trim(), "→", bpm2?.trim(), "| CHANGED:", bpm1 !== bpm2, "| PAUSE_BTN_PRESSED:", paused);

// pause button works
await page.locator('button[aria-label="Pause live simulation"]').click();
await page.waitForTimeout(400);
const afterPause = await page.locator('button[aria-label="Resume live simulation"]').count();
console.log("PAUSE_TOGGLES:", afterPause > 0 ? "OK" : "FAIL");

// sleep bar + ring gauge presence
const sleep = await page.locator('text=Deep · ').count();
const steps = await page.locator("text=Today's steps").count();
const alerts = await page.locator("text=SpO₂ dipped to 93%").count();
console.log("SLEEP_BAR:", sleep > 0 ? "OK" : "FAIL", "| RING_STEPS:", steps > 0 ? "OK" : "FAIL", "| ALERTS:", alerts > 0 ? "OK" : "FAIL");
await page.screenshot({ path: "/home/z/my-project/tool-results/labs/vitals-dash.png" });

// mobile
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
const mobErrors = [];
mob.on("pageerror", (e) => mobErrors.push(String(e).slice(0, 200)));
await mob.goto("http://localhost:3000/vitals", { waitUntil: "networkidle", timeout: 45000 });
await mob.waitForTimeout(2000);
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
console.log("MOBILE_OVERFLOW:", overflow, "| MOBILE_ERRORS:", mobErrors.length);

console.log("DESKTOP_ERRORS:", errors.length, errors.slice(0, 2));
await browser.close();
