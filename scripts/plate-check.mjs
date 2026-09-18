import { chromium } from "playwright";
const EXE = "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const b = await chromium.launch({ executablePath: EXE });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(1000);
const info = await p.evaluate(() => {
  const img = document.querySelector("img[alt='Nexura OS care companion']");
  const card = img?.closest("div[class*='overflow-hidden']");
  const plates = [...document.querySelectorAll("div")].filter(
    (d) => d.textContent?.includes("Dr. Amelia Hart") && d.querySelector("p"),
  );
  return {
    cardRect: card?.getBoundingClientRect().toJSON(),
    plateCount: plates.length,
    plate: plates.at(-1)?.getBoundingClientRect().toJSON(),
    plateClass: plates.at(-1)?.className,
    plateStyles: plates.at(-1)
      ? (({ position, bottom, zIndex, opacity, display }) => ({
          position,
          bottom,
          zIndex,
          opacity,
          display,
        }))(getComputedStyle(plates.at(-1)))
      : null,
    parentChain: plates.at(-1)
      ? (() => {
          let el = plates.at(-1),
            out = [];
          for (let i = 0; i < 4 && el; i++) {
            const s = getComputedStyle(el);
            out.push({
              cls: (el.className || "").toString().slice(0, 60),
              pos: s.position,
              ov: s.overflow,
              h: el.getBoundingClientRect().height,
            });
            el = el.parentElement;
          }
          return out;
        })()
      : null,
  };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
