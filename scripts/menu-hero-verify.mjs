/* MENU + HERO SHOWPIECE verification — premium menu & hero portrait
   Checks: trigger, drawer opens LEFT edge, 20 rows, hero loop layers,
   material chips, console errors, mobile overflow. */
import { chromium } from "playwright";

const EXE = "/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
const BASE = "http://localhost:3000";
let fails = 0;
const ok = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
  if (!cond) fails++;
};

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

/* 1 · trigger */
const trigger = page.locator(".menu-trigger");
ok("menu trigger (gold-glass disc) present", (await trigger.count()) === 1);
const lines = await page.locator(".menu-trigger .menu-line").count();
ok("3-line custom mark (not lucide Menu)", lines === 3, `lines=${lines}`);
const dot = await page.locator(".menu-trigger__dot").count();
ok("live pulse dot on trigger", dot === 1);

/* 2 · drawer opens from RIGHT edge (same side as the trigger) */
await trigger.click();
await page.waitForTimeout(900);
const drawer = page.locator(".menu-drawer");
ok("drawer present", (await drawer.count()) === 1);
const box = await drawer.boundingBox();
const vw = page.viewportSize().width;
ok(
  "drawer anchored to RIGHT edge (same side as button)",
  box && Math.abs(box.x + box.width - vw) < 8,
  `x=${box?.x} vw=${vw}`,
);
ok("drawer width ≈ 26rem", box && Math.abs(box.width - 416) < 4, `w=${box?.width}`);
await page.screenshot({ path: "logs/menu-open-right.png" });

/* 3 · rows: 14 products + 6 actions, per-row accents */
const rows = await page.locator(".menu-row").count();
ok("20 menu rows (14 products + 6 actions)", rows === 20, `rows=${rows}`);
const chips = await page.locator(".menu-row span.grid").count();
ok("glowing icon chips", chips >= 20, `chips=${chips}`);
const badges = await page.locator(".menu-row span.rounded-full", { hasText: "." }).count();
console.log(`INFO  badges=${badges}`);
const violetRow = await page.locator(".menu-row.ring-1.ring-violet-500\\/25").count();
ok("Predictive violet spotlight row", violetRow === 1);
const footerChips = await page.locator("text=ABDM").count();
ok("footer compliance chips (ABDM/DPDP/NABH)", footerChips >= 1);

/* close via Escape (allow spring exit animation to finish) */
await page.keyboard.press("Escape");
await page.waitForTimeout(1500);
ok("Escape closes drawer", (await page.locator(".menu-drawer").count()) === 0);

/* 4 · hero showpiece layers */
const halo = page.locator(".hero-halo");
ok("rotating spectrum halo present", (await halo.count()) === 1);
const haloAnim = await halo.evaluate((el) => getComputedStyle(el).animationName);
ok("halo spinning (hero-halo-spin)", haloAnim.includes("hero-halo-spin"), haloAnim);
const orbits = await page.locator(".hero-orbit").count();
ok("2 orbit rings", orbits === 2, `orbits=${orbits}`);
const orbitAnim = await page
  .locator(".hero-orbit")
  .first()
  .evaluate((el) => getComputedStyle(el).animationName);
ok("orbit A spinning", orbitAnim.includes("hero-orbit-spin"), orbitAnim);
const orbitBAnim = await page
  .locator(".hero-orbit--b")
  .evaluate((el) => getComputedStyle(el).animationName);
ok("orbit B counter-spinning", orbitBAnim.includes("hero-orbit-rev"), orbitBAnim);
ok("2 satellites (gold + teal)", (await page.locator(".hero-sat").count()) === 2);
const sheen = page.locator(".hero-photo, .hero-sheen").last();
const sheenAnim = await page
  .locator(".hero-sheen")
  .evaluate((el) => getComputedStyle(el).animationName);
ok("sheen sweep looping", sheenAnim.includes("hero-sheen-loop"), sheenAnim);
ok("5 twinkling sparks", (await page.locator(".hero-spark").count()) === 5);
ok("3 material chips (neon/glass/clay)", (await page.locator(".mat-chip").count()) === 3);
ok("neon amber AI chip", (await page.locator(".mat-chip--neon").count()) === 1);
ok("crimson glass vitals chip", (await page.locator(".mat-chip--glass").count()) === 1);
ok("rose clay care chip", (await page.locator(".mat-chip--clay").count()) === 1);
ok("DPDP seal + rotating ring", (await page.locator(".hero-seal-ring").count()) === 1);
const sealAnim = await page
  .locator(".hero-seal-ring")
  .evaluate((el) => getComputedStyle(el).animationName);
ok("seal ring rotating", sealAnim.includes("hero-seal-rot"), sealAnim);
ok(
  "gold inset hairline on portrait",
  (await page.locator("img[alt='Nexura OS care companion']").count()) === 1,
);
await page.screenshot({ path: "logs/hero-showpiece.png" });

/* 5 · console errors */
ok("zero console/page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

/* 6 · mobile 390 — drawer + overflow */
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
const merr = [];
mob.on("console", (m) => m.type() === "error" && merr.push(m.text()));
mob.on("pageerror", (e) => merr.push(String(e)));
await mob.goto(BASE + "/", { waitUntil: "networkidle" });
await mob.waitForTimeout(800);
const overflow = await mob.evaluate(() => {
  const d = document.documentElement;
  return { sw: d.scrollWidth, iw: window.innerWidth };
});
ok(
  "mobile 390: no horizontal overflow",
  overflow.sw <= overflow.iw + 1,
  `scrollW=${overflow.sw} innerW=${overflow.iw}`,
);
await mob.locator(".menu-trigger").click();
await mob.waitForTimeout(800);
const mbox = await mob.locator(".menu-drawer").boundingBox();
ok(
  "mobile drawer full-width from right",
  mbox && mbox.x <= 2 && mbox.width >= 388,
  `x=${mbox?.x} w=${mbox?.width}`,
);
await mob.screenshot({ path: "logs/menu-open-mobile.png" });
ok("mobile zero console errors", merr.length === 0, merr.slice(0, 3).join(" | "));
await mob.close();

await browser.close();
console.log(fails === 0 ? "\nALL CHECKS PASSED ✅" : `\n${fails} CHECKS FAILED ❌`);
process.exit(fails === 0 ? 0 : 1);
