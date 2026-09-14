import { chromium } from "playwright";
const exe = "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2500);
const wide = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  document.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      const cls = (el.className && typeof el.className === "string") ? el.className.slice(0, 90) : "";
      out.push(`${el.tagName}.${cls} L=${Math.round(r.left)} R=${Math.round(r.right)}`);
    }
  });
  return out.slice(0, 12);
});
console.log(wide.join("\n") || "no overflow elements");
await browser.close();
