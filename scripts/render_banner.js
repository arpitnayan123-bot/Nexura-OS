// Render the Nexura OS premium hero banner + social preview with Playwright.
// Outputs:
//   docs/screenshots/hero-banner.png    (1600x900 @2x)
//   docs/screenshots/social-preview.png (1280x640 @2x — GitHub social card)
const path = require("path");
const { chromium } = require(path.join("/home/z/my-project", "node_modules", "playwright"));

const HTML = "file:///home/z/my-project/scripts/hero-banner.html";
const OUT = "/home/z/my-project/docs/screenshots";

(async () => {
  const browser = await chromium.launch({
    executablePath: "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
  });

  async function render(variant, vw, vh, outFile) {
    const page = await browser.newPage({
      viewport: { width: vw, height: vh },
      deviceScaleFactor: 2,
    });
    await page.goto(variant === "social" ? `${HTML}?variant=social` : HTML, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${outFile}`, fullPage: false });
    console.log(`rendered ${outFile} (${vw}x${vh} @2x)`);
    await page.close();
  }

  await render("hero", 1600, 900, "hero-banner.png");
  await render("social", 1280, 640, "social-preview.png");

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
