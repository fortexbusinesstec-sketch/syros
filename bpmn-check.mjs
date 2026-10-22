import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:5180/bpmn-preview.html", { waitUntil: "networkidle" });
await page.waitForSelector(".djs-palette", { timeout: 20000 });
await page.waitForTimeout(400);

const canvas = await page.$(".djs-container > svg");
const box = await canvas.boundingBox();

await page.click('.djs-palette [data-action="create.participant-expanded"]');
await page.waitForTimeout(150);
await page.mouse.click(box.x + 500, box.y + 220);
await page.waitForTimeout(600);

const xmlOf = async () => (await page.textContent("#xml")) ?? "";
const bounds = async () => {
  const xml = await xmlOf();
  return [...xml.matchAll(/<bpmndi:BPMNShape([^>]*)>\s*<dc:Bounds([^>]*)\/>/g)].map((m) => {
    const shape = m[1];
    const b = m[2];
    const g = (s, re) => s.match(re)?.[1];
    return {
      element: g(shape, /bpmnElement="([^"]*)"/),
      x: +(g(b, /x="([^"]*)"/) ?? 0),
      y: +(g(b, /y="([^"]*)"/) ?? 0),
      width: +(g(b, /width="([^"]*)"/) ?? 0),
      height: +(g(b, /height="([^"]*)"/) ?? 0),
    };
  });
};
console.log("BOUNDS", await bounds());

const pool = (await bounds()).find((s) => s.element.startsWith("Participant_"));
const lanes = (await bounds()).filter((s) => s.element.startsWith("Lane_"));

// 1) Crear un carril desde la paleta y soltarlo sobre un carril existente
await page.click('.djs-palette [data-action="create.lane"]');
await page.waitForTimeout(200);
const target = lanes[0];
await page.mouse.click(box.x + target.x + 100, box.y + target.y + target.height / 2);
await page.waitForTimeout(700);

const xml = await xmlOf();
console.log("LANESETS", (xml.match(/<bpmn:laneSet/g) || []).length);
const laneSets = [...xml.matchAll(/<bpmn:laneSet[^>]*>([\s\S]*?)<\/bpmn:laneSet>/g)].map((m) =>
  [...m[1].matchAll(/<bpmn:lane id="([^"]*)"[^>]*name="([^"]*)"/g)].map((l) => ({ id: l[1], name: l[2] })),
);
console.log("LANES EN CADA LANESET", JSON.stringify(laneSets));
console.log("LANES ANIDADOS (lane dentro de lane)", /<bpmn:lane[^>]*>\s*<bpmn:laneSet/.test(xml));
console.log("BOUNDS finales", await bounds());

await page.screenshot({ path: "C:/Users/Fabrizio/AppData/Local/Temp/opencode/bpmn-lane-drop.png" });
console.log("ERRORS", errors);
await browser.close();
