import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
await page.goto("http://localhost:5180/kpi-preview.html", { waitUntil: "networkidle" });
await page.waitForSelector(".chip", { timeout: 15000 });
const chips = await page.$$eval(".chip", (els) =>
  els.map((el) => {
    const cs = getComputedStyle(el);
    const h = el.getBoundingClientRect().height;
    return {
      text: el.textContent,
      height: h,
      lines: Math.round(h / parseFloat(cs.lineHeight)),
      whiteSpace: cs.whiteSpace,
      cellWidth: el.closest("td")?.getBoundingClientRect().width,
    };
  }),
);
console.log("VIEWPORT 700 CON NOWRAP", chips);
await page.screenshot({ path: "C:/Users/Fabrizio/AppData/Local/Temp/opencode/kpi-chips-700.png", fullPage: true });
await browser.close();
