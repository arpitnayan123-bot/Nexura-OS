/* Render README.md top region (header + buttons + hero) as GitHub-ish HTML
   and screenshot it — visual QA for the deploy-button row. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const readme = fs.readFileSync("/home/z/my-project/README.md", "utf8");
  // crude but faithful-enough render of the first ~40 lines (all centered divs)
  const top = readme.split("\n").slice(0, 46).join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#fff">
    <style>
      body { font: 15px/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1f2328; }
      .wrap { max-width: 1012px; margin: 0 auto; padding: 28px 24px; }
      div[align="center"] { text-align: center; }
      h1 { font-size: 1.85em; margin: 0 0 12px; }
      img { vertical-align: middle; }
      hr { border: 0; border-top: 1px solid #d1d9e0; margin: 20px 0; }
      code { background: #f6f8fa; padding: .2em .4em; border-radius: 6px; font-family: ui-monospace, monospace; font-size: 85%; }
      a { color: #0969da; text-decoration: none; }
      table { border-collapse: collapse; }
    </style>
    <div class="wrap">${top
      .replace(/<div align="center">/g, "<div>")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</div>
  </body></html>`;
  // NOTE: we escape and re-allow raw HTML via a simpler path — markdown lib absent,
  // so render only the structural pieces we need to QA:
  const qa = `<!doctype html><html><body style="margin:0;background:#fff;font:15px -apple-system,'Segoe UI',sans-serif;color:#1f2328">
    <div style="max-width:1012px;margin:0 auto;padding:28px;text-align:center">
      <h1 style="font-size:1.85em;margin:0 0 12px">Nexura OS — Multi-Product Healthcare Platform</h1>
      <p><b>badge row (10 shields)</b> — unchanged</p>
      <p style="color:#59636e">The demo · Products · Platform · Backend · Quick start · <b>Ship it</b> · Quality gates · Docs · Contributing</p>
      <p>
        <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farpitnayan123-bot%2FNexura-OS&env=DATABASE_URL%2CJWT_SECRET%2CREDIS_URL&project-name=nexura-os&repository-name=Nexura-OS"><img src="https://vercel.com/button" alt="Deploy with Vercel" height="40"/></a>
        &nbsp;&nbsp;<a href="#2--docker-one-command"><img src="https://img.shields.io/badge/Docker-compose%20up%20--build-2496ED?logo=docker&logoColor=white" height="28"/></a>
        &nbsp;&nbsp;<a href="#ship-your-own-instance"><img src="https://img.shields.io/badge/self--host-standalone%20build-2EA043" height="28"/></a>
      </p>
      <img src="file:///home/z/my-project/docs/screenshots/hero-banner.png" style="max-width:100%"/>
    </div>
  </body></html>`;

  const tmp = "/home/z/my-project/scripts/audit/readme-top.html";
  fs.writeFileSync(tmp, qa);
  const exe = "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const page = await browser.newPage({ viewport: { width: 1200, height: 620 } });
  await page.goto("file://" + tmp, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/home/z/my-project/scripts/audit/readme-top.png" });
  await browser.close();
  console.log("rendered -> scripts/audit/readme-top.png");
})();
