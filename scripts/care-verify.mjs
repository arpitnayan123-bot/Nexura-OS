// care-verify.mjs — interactive verification of /care
import { chromium } from "playwright";

const exe = "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto("http://localhost:3000/care", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "/home/z/my-project/tool-results/labs/care-hero.png" });

// member switcher: default Arpit → click Devi → dashboard content changes
const name1 = await page.locator("text=Arpit Mehta").first().isVisible();
await page.locator('button[role="tab"]', { hasText: "Devi" }).click();
await page.waitForTimeout(700);
const name2 = await page.locator("text=Devi Mehta").first().isVisible();
const adherence = await page.locator("text=medication adherence").count();
console.log("SWITCHER:", name1 && name2 ? "OK" : "FAIL", "| ELDER_VIEW:", adherence > 0 ? "OK" : "FAIL");

// consent toggle: flip first consent
const before = await page.locator('button[role="switch"] >> nth=0').getAttribute("aria-checked");
await page.locator('button[role="switch"] >> nth=0').click();
await page.waitForTimeout(300);
const after = await page.locator('button[role="switch"] >> nth=0').getAttribute("aria-checked");
console.log("CONSENT_TOGGLE:", before !== after ? "OK" : "FAIL", `(${before}→${after})`);

// vaccine timeline + wallet
const vaccines = await page.locator("text=HPV (course of 2)").count();
const wallet = await page.locator("text=₹4.1L").count();
console.log("VACCINE_TIMELINE:", vaccines > 0 ? "OK" : "FAIL", "| WALLET:", wallet > 0 ? "OK" : "FAIL");
await page.screenshot({ path: "/home/z/my-project/tool-results/labs/care-dash.png" });

// mobile
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
const mobErrors = [];
mob.on("pageerror", (e) => mobErrors.push(String(e).slice(0, 200)));
await mob.goto("http://localhost:3000/care", { waitUntil: "networkidle", timeout: 45000 });
await mob.waitForTimeout(2000);
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
console.log("MOBILE_OVERFLOW:", overflow, "| MOBILE_ERRORS:", mobErrors.length);
console.log("DESKTOP_ERRORS:", errors.length);
await browser.close();
