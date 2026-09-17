// capture-product-shots.mjs — refresh README product screenshots from the
// live production server on :3000 (currently: clinic + pharmacy inventory,
// stale since the a11y contrast sweep).
//
// Usage: node scripts/capture-product-shots.mjs [shot1 shot2 ...]
// Shots: clinic | pharmacy-inventory | (extensible below)
import { chromium } from "playwright";

const exe = "/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
const BASE = "http://localhost:3000";
const OUT = "/home/z/my-project/docs/screenshots";

const only = new Set(process.argv.slice(2));

const SHOTS = [
  {
    id: "clinic",
    path: `${OUT}/clinic.png`,
    url: "/clinic",
    async act(page) {
      // clinic app lazy-loads, defaults to the Today queue
      await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(2500);
    },
  },
  {
    id: "pharmacy-inventory",
    path: `${OUT}/pharmacy-inventory.png`,
    url: "/pharmacy",
    async act(page) {
      await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(2000);
      // default module is billing — switch to Inventory (README alt text)
      const inv = page.getByText("Inventory", { exact: true }).first();
      await inv.click({ timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(2500);
    },
  },
];

const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});

for (const shot of SHOTS) {
  if (only.size && !only.has(shot.id)) continue;
  await page.goto(BASE + shot.url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await shot.act(page);
  await page.screenshot({ path: shot.path });
  console.log("captured", shot.id, "->", shot.path);
}

await browser.close();
console.log("DONE");
