// Generates public/sheet-music/pdf/<id>.pdf for every score in the catalog by
// printing each score page with headless Chrome (print styles hide the app UI).
//
// Usage: start the app (npm run build && npm start), then:
//   npm run pdfs                    # uses http://localhost:3000
//   BASE=http://localhost:3100 CHROME_PATH="..." npm run pdfs
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE ?? "http://localhost:3000";
const CHROME =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "google-chrome");
const OUT = path.join(root, "public", "sheet-music", "pdf");

// Score ids are the lines that contain only `id: "..."` inside SCORES.
const catalog = readFileSync(path.join(root, "src/content/sheet-music/catalog.ts"), "utf8");
const scoresBlock = catalog.slice(catalog.indexOf("export const SCORES"));
const ids = [...scoresBlock.matchAll(/^\s+id: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);
if (ids.length === 0) throw new Error("No score ids found in catalog.ts");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(path.join(tmpdir(), "musicpath-pdf-"));
const port = 9600 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"]);

let page;
for (let i = 0; i < 50 && !page; i++) {
  try {
    page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
  } catch {}
  if (!page) await sleep(200);
}
if (!page) throw new Error(`Could not start Chrome at ${CHROME}`);

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let nextId = 0;
const pending = new Map();
ws.addEventListener("message", (msg) => {
  const data = JSON.parse(msg.data);
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(JSON.stringify(data.error)));
    else resolve(data.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

// A4 with 14 mm margins leaves ~182 mm (≈ 688 CSS px) of width: lay the score out at that width.
await send("Emulation.setDeviceMetricsOverride", { width: 688, height: 1000, deviceScaleFactor: 1, mobile: false });
mkdirSync(OUT, { recursive: true });

let failures = 0;
try {
  for (const id of ids) {
    await send("Page.navigate", { url: `${BASE}/sheet-music/${id}` });
    let ready = false;
    for (let i = 0; i < 150 && !ready; i++) {
      await sleep(100);
      ready = await evaluate(`document.querySelector('[data-score-ready="true"] svg') !== null`).catch(() => false);
    }
    if (!ready) {
      console.error(`✗ ${id}: score did not render`);
      failures += 1;
      continue;
    }
    await sleep(300);
    const { data } = await send("Page.printToPDF", {
      printBackground: false,
      preferCSSPageSize: true,
      paperWidth: 8.27,
      paperHeight: 11.69,
    });
    writeFileSync(path.join(OUT, `${id}.pdf`), Buffer.from(data, "base64"));
    console.log(`✓ ${id}.pdf`);
  }
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
}
if (failures) process.exit(1);
