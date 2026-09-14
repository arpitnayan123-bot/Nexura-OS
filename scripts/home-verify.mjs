// home-verify.mjs — verify: search pill hidden on homepage, founder showpiece, hero material CTA
import { chromium } from "playwright";

const exe = "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const errors = [];

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 200)); });

// 1. homepage — search pill must be ABSENT
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2000);
const pillHome = await page.locator(".nx-cmdk-trigger").count();
console.log("PILL_ON_HOME:", pillHome === 0 ? "REMOVED OK" : "FAIL — still present");

// 2. other page — pill must be PRESENT
await page.goto("http://localhost:3000/pricing", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1500);
const pillPricing = await page.locator(".nx-cmdk-trigger").count();
console.log("PILL_ON_PRICING:", pillPricing > 0 ? "PRESENT OK" : "FAIL — missing");

// 3. homepage — hero textured CTA
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2000);
const heroBtn = page.locator("button.mat-btn--textured", { hasText: "Start your health scan" });
console.log("HERO_TEXTURED_BTN:", await heroBtn.count() > 0 ? "OK" : "FAIL");

// 4. founder showpiece — card present, photo big, chips, CTA
const founderCard = page.locator("a[href='/founder']").last();
const section = page.locator("section", { hasText: "walked the ward" }).last();
await section.scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
const photo = await section.locator("img[alt*='Arpit']").count();
const chips = await section.locator(".glass-chip").count();
const readBtn = await section.locator(".mat-btn--textured", { hasText: "Read the story" }).count();
console.log(`FOUNDER_CARD: photo=${photo} chips=${chips} cta=${readBtn}`, photo > 0 && readBtn > 0 ? "OK" : "FAIL");

// 5. click the card → navigates to /founder
await section.locator("a[href='/founder']").first().click();
await page.waitForTimeout(2000);
console.log("FOUNDER_NAV:", page.url().includes("/founder") ? "OK" : "FAIL " + page.url());

// 6. screenshots: hero + founder section
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2200);
await page.screenshot({ path: "/home/z/my-project/logs/home-hero-v2.png" });
const fsec = page.locator("section", { hasText: "walked the ward" }).last();
await fsec.scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await fsec.hover();
await page.waitForTimeout(700);
await page.screenshot({ path: "/home/z/my-project/logs/home-founder-v2.png" });

// 7. mobile overflow
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
mob.on("pageerror", (e) => errors.push("MOB: " + String(e).slice(0, 200)));
await mob.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await mob.waitForTimeout(2000);
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const mobPill = await mob.locator(".nx-cmdk-trigger").count();
console.log("MOBILE_OVERFLOW:", overflow ? "FAIL" : "OK", "| PILL_HIDDEN_MOBILE:", mobPill === 0 ? "OK" : "FAIL");

console.log("ERRORS:", errors.length === 0 ? "0 — CLEAN" : errors.join(" | "));
await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
