// material-screenshot.mjs — visual check of the products grid materials
import { chromium } from "playwright";

const exe = "/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2000);

// scroll to products section
await page.locator("#products").scrollIntoViewIfNeeded();
await page.waitForTimeout(1800);
await page.screenshot({ path: "/home/z/my-project/logs/material-products-grid.png" });

// featured card close-up
const featured = page.locator(".mat-card--clay").first();
await featured.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.screenshot({ path: "/home/z/my-project/logs/material-featured-clay.png" });

// featured card hover state
await featured.hover();
await page.waitForTimeout(700);
await page.screenshot({ path: "/home/z/my-project/logs/material-featured-hover.png" });

console.log("SCREENSHOTS SAVED");
await browser.close();
