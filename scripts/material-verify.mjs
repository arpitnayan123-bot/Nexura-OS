// material-verify.mjs — browser verification of Material Atelier 2.0 on homepage
import { chromium } from "playwright";

const exe = "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const errors = [];

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 200)); });

await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2500);

// 1. material buttons present with all 5 variants
const counts = {};
for (const m of ["clay", "glass", "textured", "neon", "aurora"]) {
  counts[m] = await page.locator(`.mat-btn--${m}`).count();
}
console.log("MATERIAL_BUTTONS:", JSON.stringify(counts));
const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log("TOTAL:", total, total >= 13 ? "OK" : "FAIL");

// 2. featured clay card present
const clayCard = await page.locator(".mat-card--clay").count();
console.log("CLAY_CARD:", clayCard > 0 ? "OK" : "FAIL");

// 3. material buttons are inside the products section and visible
const btn = page.locator("#products .mat-btn").first();
await btn.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const visible = await btn.isVisible();
console.log("BUTTON_VISIBLE:", visible ? "OK" : "FAIL");

// 4. hover interaction on a clay button (transform should change)
const clayBtn = page.locator("#products .mat-btn--clay").first();
await clayBtn.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const before = await clayBtn.evaluate((el) => getComputedStyle(el).boxShadow);
await clayBtn.hover();
await page.waitForTimeout(500);
const after = await clayBtn.evaluate((el) => getComputedStyle(el).boxShadow);
console.log("CLAY_HOVER_SHADOW_CHANGES:", before !== after ? "OK" : "FAIL");

// 5. neon breathing animation applied
const neonAnim = await page.locator("#products .mat-btn--neon").first().evaluate((el) => getComputedStyle(el).animationName);
console.log("NEON_ANIMATION:", neonAnim.includes("neon") || neonAnim.includes("mat") ? `OK (${neonAnim})` : `FAIL (${neonAnim})`);

// 6. aurora button animation applied
const auroraAnim = await page.locator("#products .mat-btn--aurora").first().evaluate((el) => getComputedStyle(el).animationName);
console.log("AURORA_ANIMATION:", auroraAnim.includes("aurora") ? `OK (${auroraAnim})` : `FAIL (${auroraAnim})`);

// 7. promo material buttons (hospital textured / clinic glass / pharmacy clay)
const promoTextured = await page.locator("a.mat-btn--textured[href='/hospital']").count();
const promoGlass = await page.locator("a.mat-btn--glass[href='/clinic']").count();
const promoClay = await page.locator("a.mat-btn--clay[href='/pharmacy']").count();
console.log("PROMO_BUTTONS:", `hospital=${promoTextured} clinic=${promoGlass} pharmacy=${promoClay}`, promoTextured > 0 && promoGlass > 0 && promoClay > 0 ? "OK" : "FAIL");

// 8. product link still navigates (material button inside link works)
await page.locator("#products a[href='/labs'] .mat-btn").first().click();
await page.waitForTimeout(1800);
console.log("NAV_TO_LABS:", page.url().includes("/labs") ? "OK" : "FAIL " + page.url());

// 9. mobile overflow check
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
mob.on("pageerror", (e) => errors.push("MOB PAGEERROR: " + String(e).slice(0, 200)));
await mob.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await mob.waitForTimeout(2000);
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
console.log("MOBILE_OVERFLOW:", overflow ? "FAIL" : "OK");

console.log("ERRORS:", errors.length === 0 ? "0 — CLEAN" : errors.join(" | "));
await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
