// labs-verify.mjs — render /labs, check console errors, capture screenshots
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "/tmp/labs-verify";
import { mkdirSync } from "fs";
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 200));
});
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto(`${BASE}/labs`, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/labs-hero.png` });

// scroll to catalog and test search
await page.evaluate(() =>
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "instant" }),
);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/labs-catalog.png` });

// search "thyroid"
const search = page.locator('input[aria-label="Search lab tests"]');
await search.fill("thyroid");
await page.waitForTimeout(800);
const rows = await page.locator('ul[aria-label="Test results"] li').count();
console.log("SEARCH_ROWS(thyroid):", rows);

// add first result to cart
await page.locator('ul[aria-label="Test results"] li button').first().click();
await page.waitForTimeout(600);
const cartBar = await page.locator("text=/test(s)? in cart/").count();
console.log("CART_BAR_VISIBLE:", cartBar > 0);
await page.screenshot({ path: `${OUT}/labs-cart.png` });
await search.fill("");

// booking demo
await page.evaluate(() =>
  document.querySelector("#book-collection")?.scrollIntoView({ behavior: "instant" }),
);
await page.waitForTimeout(800);
const times = page.locator('div[role="group"][aria-label="Choose time window"] button');
await times.nth(1).click();
await page.waitForTimeout(400);
await page.locator("text=Confirm collection").click();
await page.waitForTimeout(1200);
const confirmed = await page.locator("text=Collection locked.").count();
console.log("BOOKING_CONFIRMED:", confirmed > 0);
await page.screenshot({ path: `${OUT}/labs-booking.png` });

// report preview
await page.evaluate(() => {
  window.scrollTo(0, document.body.scrollHeight * 0.72);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/labs-report.png` });

// mobile check
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
const mobErrors = [];
mob.on("pageerror", (e) => mobErrors.push(String(e).slice(0, 200)));
await mob.goto(`${BASE}/labs`, { waitUntil: "networkidle", timeout: 45000 });
await mob.waitForTimeout(2000);
const overflow = await mob.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
);
console.log("MOBILE_OVERFLOW:", overflow, "MOBILE_ERRORS:", mobErrors.length);
await mob.screenshot({ path: `${OUT}/labs-mobile.png` });

console.log("DESKTOP_CONSOLE_ERRORS:", errors.length);
if (errors.length) console.log("FIRST_ERRORS:", errors.slice(0, 3));
await browser.close();
