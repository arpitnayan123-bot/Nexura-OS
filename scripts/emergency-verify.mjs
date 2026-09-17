// emergency-verify.mjs — full interactive verification of /emergency
import { chromium } from "playwright";

const exe = "/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const errors = [];

// desktop
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.goto("http://localhost:3000/emergency", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2000);

// blood bank: switch to AB− and check live update
await page.locator('button[aria-pressed]', { hasText: "AB−" }).first().scrollIntoViewIfNeeded();
await page.locator('button[aria-pressed]', { hasText: "AB−" }).first().click();
await page.waitForTimeout(600);
const units = await page.locator("text=4 units").count();
const critical = await page.locator("text=Critical").count();
console.log("BLOODBANK_AB_NEG:", units > 0 && critical > 0 ? "OK" : "FAIL");

// first aid accordion: open "CPR"
await page.locator('button', { hasText: "CPR — hands-only, adult" }).scrollIntoViewIfNeeded();
await page.locator('button', { hasText: "CPR — hands-only, adult" }).click();
await page.waitForTimeout(500);
const cprSteps = await page.locator("text=Push hard and fast").count();
console.log("AID_CPR_OPEN:", cprSteps > 0 ? "OK" : "FAIL");
await page.screenshot({ path: "/home/z/my-project/tool-results/labs/er-blood-aid.png" });

// fleet + ER render counts
const fleetCards = await page.locator('section[aria-labelledby="fleet-heading"] .group').count();
console.log("FLEET_CARDS:", fleetCards);

// mobile
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
const mobErrors = [];
mob.on("pageerror", (e) => mobErrors.push(String(e).slice(0, 200)));
await mob.goto("http://localhost:3000/emergency", { waitUntil: "networkidle", timeout: 45000 });
await mob.waitForTimeout(2000);
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
console.log("MOBILE_OVERFLOW:", overflow, "| MOBILE_ERRORS:", mobErrors.length);
await mob.screenshot({ path: "/home/z/my-project/tool-results/labs/emergency-mobile.png" });

console.log("DESKTOP_ERRORS:", errors.length);
await browser.close();
