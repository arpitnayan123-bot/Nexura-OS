// sos-hold-test.mjs — direct Playwright hold test using installed chromium
import { chromium } from "playwright";

const exe = "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto("http://localhost:3000/emergency", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2000);

const btn = page.locator('button[aria-label^="Press"]');
await btn.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);

// press and hold 1.8s
const box = await btn.boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.waitForTimeout(1800);
await page.mouse.up();
await page.waitForTimeout(800);

const armed = await page.locator("text=Demo armed").count();
const routed = await page.locator("text=help is being routed").count();
console.log("SOS_ARMED:", armed > 0, "| ROUTING:", routed > 0);

await page.screenshot({ path: "/home/z/my-project/tool-results/labs/sos-armed.png" });
console.log("PAGE_ERRORS:", errors.length, errors.slice(0, 2));
await browser.close();
