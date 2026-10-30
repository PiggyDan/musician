// End-to-end checks for MusicPath, driving headless Chrome over the DevTools Protocol.
// Start the app first (npm run build && npm start -- -p 3100), then:
//   npm run e2e                    # user flows (audio, lessons, XP, i18n, sheet music)
//   npm run e2e -- screens         # desktop + mobile screenshots and overflow checks
// Env: BASE (default http://localhost:3100), CHROME_PATH, E2E_OUT (default .e2e/).
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.env.E2E_OUT ?? ".e2e";
const MODE = process.argv[2] ?? "flows";
mkdirSync(OUT, { recursive: true });

const port = 9300 + Math.floor(Math.random() * 500);
const profile = path.join(OUT, `profile-${port}`);
const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--autoplay-policy=no-user-gesture-required",
  "--mute-audio",
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    if (targets.some((t) => t.type === "page")) break;
  } catch {}
  await sleep(200);
}
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));

let id = 0;
const pending = new Map();
const consoleErrors = [];
ws.addEventListener("message", (msg) => {
  const data = JSON.parse(msg.data);
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(JSON.stringify(data.error)));
    else resolve(data.result);
  } else if (data.method === "Runtime.exceptionThrown") {
    consoleErrors.push(data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text);
  } else if (data.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(data.params.type)) {
    consoleErrors.push(`[console.${data.params.type}] ` + data.params.args.map((a) => a.value ?? a.description).join(" "));
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");

const evaluate = async (expression) => {
  const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? "eval failed");
  return res.result.value;
};
const goto = async (url) => {
  await send("Page.navigate", { url: BASE + url });
  for (let i = 0; i < 100; i++) {
    await sleep(100);
    if ((await evaluate("document.readyState")) === "complete") break;
  }
  await sleep(900);
};
const viewport = (width, height, mobile = false) =>
  send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
const screenshot = async (name, fullPage = false) => {
  const params = { format: "png" };
  if (fullPage) {
    const { cssContentSize } = await send("Page.getLayoutMetrics");
    params.clip = { x: 0, y: 0, width: cssContentSize.width, height: Math.min(cssContentSize.height, 9000), scale: 1 };
    params.captureBeyondViewport = true;
  }
  const { data } = await send("Page.captureScreenshot", params);
  writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
};
const key = async (code, type) => {
  const k = code.replace("Key", "").toLowerCase();
  await send("Input.dispatchKeyEvent", {
    type,
    code,
    key: k,
    text: type === "keyDown" ? k : undefined,
    windowsVirtualKeyCode: k.toUpperCase().charCodeAt(0),
  });
};
const center = (selector) =>
  evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.8 }; })()`);
const activeKeys = () =>
  evaluate(`[...document.querySelectorAll('[data-midi][data-active="true"]')].map(e => Number(e.dataset.midi))`);
const text = () => evaluate("document.body.innerText");
const clickText = async (label) => {
  const pos = await evaluate(`(() => { const el = [...document.querySelectorAll('button, a')].find(e => e.innerText.trim().includes(${JSON.stringify(label)})); if (!el) return null; el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; })()`);
  if (!pos) throw new Error(`No button "${label}"`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
};

const clickExact = async (label) => {
  const pos = await evaluate(`(() => { const el = [...document.querySelectorAll('button')].find(e => e.innerText.trim() === ${JSON.stringify(label)} && !e.disabled); if (!el) return null; el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; })()`);
  if (!pos) throw new Error(`No exact button "${label}"`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
};
const tap = async (code, holdMs = 60) => {
  await key(code, "keyDown");
  await sleep(holdMs);
  await key(code, "keyUp");
};
const waitForText = async (needle, timeout = 8000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if ((await text()).includes(needle)) return true;
    await sleep(15);
  }
  return false;
};
// Records (in page time) the moment "Play now!" first renders = beat 0.
const armPlayNow = () =>
  evaluate(`(() => { window.__playNowAt = null; const o = new MutationObserver(() => { if (window.__playNowAt === null && document.body.textContent.includes('Play now!')) { window.__playNowAt = performance.now(); o.disconnect(); } }); o.observe(document.body, { subtree: true, childList: true, characterData: true }); })()`);
// Plays [code, beat] events in time relative to the page's beat 0.
const playTimed = async (events, beatMs) => {
  const ok = await waitForText("Play now!", 10000);
  const t1 = Date.now();
  const pageNow = await evaluate("performance.now()");
  const t2 = Date.now();
  const playAt = await evaluate("window.__playNowAt");
  const zero = (t1 + t2) / 2 + (playAt - pageNow);
  for (const [code, beat] of events) {
    const wait = zero + beat * beatMs - Date.now() - 4;
    if (wait > 0) await sleep(wait);
    const before = Date.now();
    await tap(code, 40);
    console.log("TAP", beat, Math.round(before - zero - beat * beatMs), "dispatch", Date.now() - before);
  }
  return ok;
};
const waitForScore = async (timeout = 15000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ready = await evaluate(`document.querySelector('[data-score-ready="true"] svg') !== null`);
    if (ready) return true;
    await sleep(100);
  }
  return false;
};
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

try {
  if (MODE === "screens") {
    const routes = [["home", "/"], ["learn", "/learn"], ["academy", "/learn/piano"], ["lesson1", "/learn/piano/lesson/1"], ["lesson3", "/learn/piano/lesson/3"], ["practice", "/practice"], ["profile", "/profile"], ["404", "/nope"], ["library", "/sheet-music"], ["score-minuet", "/sheet-music/minuet-in-g-piano"], ["score-guitar", "/sheet-music/frere-jacques-guitar"]];
    for (const [vw, vh, mobile, tag] of [[1440, 900, false, "desktop"], [390, 844, true, "mobile"]]) {
      await viewport(vw, vh, mobile);
      for (const [name, url] of routes) {
        await goto(url);
        await evaluate("(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } })()");
        await sleep(900);
        await evaluate("window.scrollTo(0, 0)");
        await sleep(300);
        if (name.startsWith("score")) await waitForScore();
        await screenshot(`${tag}-${name}`, name === "home" || name === "learn" || name === "profile" || name === "library" || name.startsWith("score"));
        const overflow = await evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth");
        check(`${tag} ${url} has no horizontal overflow`, overflow <= 0, `overflow=${overflow}px`);
      }
    }
  } else {
    await viewport(1440, 900);

    // ── Studio: keyboard, chords, mouse, touch ──
    await goto("/practice");
    await key("KeyA", "keyDown");
    await sleep(400);
    check("keyboard A plays C4", JSON.stringify(await activeKeys()) === "[60]", JSON.stringify(await activeKeys()));
    await sleep(600);
    const status = await text();
    check("audio engine reaches ready", status.includes("Audio ready"), status.match(/Audio[^\n]*/)?.[0]);
    await key("KeyD", "keyDown");
    await key("KeyG", "keyDown");
    await sleep(250);
    check("three simultaneous notes held", JSON.stringify(await activeKeys()) === "[60,64,67]", JSON.stringify(await activeKeys()));
    const readout = await text();
    check("chord readout shows C major", /\nC\n/.test(readout) || readout.includes("C\nC4"), "");
    await screenshot("flow-studio-chord");
    for (const c of ["KeyA", "KeyD", "KeyG"]) await key(c, "keyUp");
    await sleep(200);
    check("all notes released after key-up (no stuck notes)", (await activeKeys()).length === 0, JSON.stringify(await activeKeys()));

    await key("KeyA", "keyDown");
    await key("KeyA", "keyDown"); // auto-repeat duplicate
    await key("KeyA", "keyUp");
    await sleep(150);
    check("duplicate key-down does not leave a stuck note", (await activeKeys()).length === 0);

    await key("KeyX", "keyDown");
    await key("KeyX", "keyUp");
    await sleep(200);
    await key("KeyA", "keyDown");
    await sleep(150);
    check("octave up: A plays C5", JSON.stringify(await activeKeys()) === "[72]", JSON.stringify(await activeKeys()));
    await key("KeyZ", "keyDown"); // octave change while held
    await key("KeyZ", "keyUp");
    await key("KeyA", "keyUp");
    await sleep(150);
    check("octave change while holding still releases the right note", (await activeKeys()).length === 0, JSON.stringify(await activeKeys()));

    const c4 = await center('[data-midi="60"]');
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: c4.x, y: c4.y, button: "left", clickCount: 1 });
    await sleep(150);
    check("mouse press plays C4", JSON.stringify(await activeKeys()) === "[60]", JSON.stringify(await activeKeys()));
    const d4 = await center('[data-midi="62"]');
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: d4.x, y: d4.y, button: "left", buttons: 1 });
    await sleep(150);
    check("mouse glissando moves to D4", JSON.stringify(await activeKeys()) === "[62]", JSON.stringify(await activeKeys()));
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: d4.x, y: d4.y, button: "left", clickCount: 1 });
    await sleep(150);
    check("mouse release stops note", (await activeKeys()).length === 0);

    const e4 = await center('[data-midi="64"]');
    const g4 = await center('[data-midi="67"]');
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c4.x, y: c4.y, id: 1 }, { x: e4.x, y: e4.y, id: 2 }, { x: g4.x, y: g4.y, id: 3 }] });
    await sleep(200);
    check("multi-touch plays a 3-note chord", JSON.stringify(await activeKeys()) === "[60,64,67]", JSON.stringify(await activeKeys()));
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(200);
    check("touch end releases all notes", (await activeKeys()).length === 0, JSON.stringify(await activeKeys()));

    // ── Lesson 1 ──
    await goto("/learn/piano/lesson/1");
    await clickText("I'm ready");
    await sleep(800);
    await key("KeyS", "keyDown");
    await key("KeyS", "keyUp");
    await sleep(400);
    let body = await text();
    check("wrong note (D4) gives a hint", body.includes("That was D4"), "");
    // C5 via the on-screen key → wrong octave
    const c5 = await center('[data-midi="72"]');
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: c5.x, y: c5.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c5.x, y: c5.y, button: "left", clickCount: 1 });
    await sleep(400);
    body = await text();
    check("C5 is recognised as the wrong octave", body.includes("C5 is a C"), "");
    check("lesson not completed by wrong notes", !body.includes("Lesson complete"));
    await screenshot("flow-lesson-feedback");
    const c4l = await center('[data-midi="60"]');
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: c4l.x, y: c4l.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c4l.x, y: c4l.y, button: "left", clickCount: 1 });
    await sleep(1800);
    body = await text();
    check("C4 completes the lesson", body.includes("Lesson complete"));
    check("completion awards +10 XP", body.includes("+10 XP earned"));
    await screenshot("flow-lesson-complete");
    const stored = JSON.parse(await evaluate("localStorage.getItem('musicpath:progress')"));
    check("progress saved to localStorage with xp=10", stored?.state?.xp === 10, `xp=${stored?.state?.xp}`);

    await clickText("Play again");
    await sleep(600);
    await key("KeyA", "keyDown");
    await key("KeyA", "keyUp");
    await sleep(1800);
    body = await text();
    check("replay shows 'already earned' instead of more XP", body.includes("already earned"));
    const stored2 = JSON.parse(await evaluate("localStorage.getItem('musicpath:progress')"));
    check("replay does not add XP (still 10)", stored2?.state?.xp === 10, `xp=${stored2?.state?.xp}`);

    // ── Persistence across reload ──
    await goto("/learn/piano");
    await send("Page.reload");
    await sleep(2000);
    body = await text();
    check("after reload, lesson 1 shows Completed", body.includes("Completed"));
    await goto("/profile");
    body = await text();
    check("profile shows 10 XP after reload", /Total XP\s*\n?\s*10/.test(body) || body.includes("10\nTotal XP") , "");
    check("profile history lists the lesson", body.includes("Completed “Find Middle C”"));
    await screenshot("flow-profile");

    // ── Language ──
    await clickText("МН");
    await sleep(500);
    body = await text();
    check("switching to Mongolian translates the UI", body.includes("Суралцах") && body.includes("Таны профайл"));
    check("<html lang> follows the locale", (await evaluate("document.documentElement.lang")) === "mn-MN");
    await send("Page.reload");
    await sleep(2000);
    body = await text();
    check("Mongolian persists after reload", body.includes("Таны профайл"));
    await goto("/learn/piano/lesson/1");
    await screenshot("flow-lesson-mn");
    await goto("/");
    await screenshot("flow-home-mn");
    await clickText("EN");
    await sleep(300);
    check("switching back to English", (await text()).includes("Learn music"));

    // ── Lesson 2: find + name notes ──
    await goto("/learn/piano/lesson/2");
    await clickText("Let's find them");
    await sleep(700);
    await tap("KeyD"); // asked for C, played E
    await sleep(300);
    check("L2: wrong letter gives a landmark tip", (await text()).includes("That was E4. C is just left"));
    for (const code of ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ"]) {
      await tap(code);
      await sleep(950);
    }
    await sleep(1600);
    check("L2: all seven letters found -> naming step", (await text()).includes("Name the glowing key"));
    await screenshot("flow-l2-name");
    await clickExact("C"); // first glowing key is E4
    await sleep(300);
    check("L2: wrong name is rejected", (await text()).includes("Not C."));
    for (const letter of ["E", "A", "F", "B", "G", "D"]) {
      await clickExact(letter);
      await sleep(1000);
    }
    await sleep(1200);
    check("L2: completes with +15 XP", (await text()).includes("+15 XP earned"));

    // ── Lesson 3: melody, guided then memory ──
    await goto("/learn/piano/lesson/3");
    await clickText("Start the melody");
    await sleep(700);
    const sunrise = ["KeyA", "KeyD", "KeyS", "KeyF", "KeyD", "KeyG", "KeyF", "KeyD", "KeyS", "KeyA"];
    for (const code of sunrise.slice(0, 4)) { await tap(code); await sleep(120); }
    await tap("KeyJ"); // wrong
    await sleep(250);
    check("L3: wrong note keeps progress (guided)", (await text()).includes("Play the glowing key: E"));
    await screenshot("flow-l3-guided");
    for (const code of sunrise.slice(4)) { await tap(code); await sleep(120); }
    await sleep(1400);
    check("L3: guided step leads to memory step", (await text()).includes("Now from memory"));
    for (const code of sunrise) { await tap(code); await sleep(120); }
    await sleep(1600);
    check("L3: completes with +15 XP", (await text()).includes("+15 XP earned"));

    // ── Lesson 4: rhythm against the live metronome ──
    await goto("/learn/piano/lesson/4");
    await clickText("I'm ready");
    await sleep(700);
    await armPlayNow();
    await clickExact("Start");
    const steady = await playTimed([0, 1, 2, 3, 4, 5, 6, 7].map((b) => ["KeyA", b]), 750);
    await sleep(1200);
    console.log("DOTS", JSON.stringify(await evaluate(`[...document.querySelectorAll('li[title]')].map(e => e.title)`)));
    let body4 = await text();
    check("L4: steady beats scored as passed", steady && body4.includes("Great timing"), body4.match(/\d+ of \d+ notes on time/)?.[0]);
    await screenshot("flow-l4-result");
    await clickText("Continue");
    await sleep(1500);
    await armPlayNow();
    await clickExact("Start");
    await playTimed([0, 1, 2, 4, 5, 6].map((b) => ["KeyA", b]), 750);
    await sleep(2600);
    body4 = await text();
    check("L4: quarters & halves passed", body4.includes("Great timing"), body4.match(/\d+ of \d+ notes on time/)?.[0]);
    await clickText("Continue");
    await sleep(1600);
    check("L4: completes with +20 XP", (await text()).includes("+20 XP earned"));

    // ── Lesson 5: song ──
    await goto("/learn/piano/lesson/5");
    await clickText("Let's play");
    await sleep(700);
    await clickExact("Start"); // deliberately fail once: play nothing
    await waitForText("Play now!", 10000);
    await sleep(14500);
    check("L5: silence fails with a tip", (await text()).includes("Almost!"));
    await screenshot("flow-l5-fail");
    await armPlayNow();
    await clickText("Try again");
    const song = [["KeyA",0],["KeyD",1],["KeyG",2],["KeyF",4],["KeyD",5],["KeyS",6],["KeyD",8],["KeyF",9],["KeyG",10],["KeyD",11],["KeyS",12],["KeyA",14]];
    await sleep(50);
    const playedSong = await playTimed(song, 60000 / 72);
    await sleep(2500);
    const body5 = await text();
    check("L5: song played in time passes", playedSong && body5.includes("Great timing"), body5.match(/\d+ of \d+ notes on time/)?.[0]);
    await screenshot("flow-l5-result");
    await clickText("Continue");
    await sleep(1800);
    check("L5: course completion celebration", (await text()).includes("Piano Foundations complete!"));
    await screenshot("flow-l5-course");
    const st = JSON.parse(await evaluate("localStorage.getItem('musicpath:progress')"));
    check("total XP is 85 after all five lessons", st?.state?.xp === 85, `xp=${st?.state?.xp}`);
    check("course achievement unlocked", Boolean(st?.state?.achievements?.["foundations-complete"]));

    // ── Sheet music library ──
    await goto("/sheet-music");
    let lib = await text();
    check("library lists 13 scores", lib.includes("13 scores"), lib.match(/\d+ scores?/)?.[0]);
    await clickExact("Harmonica");
    await sleep(300);
    lib = await text();
    check("instrument filter narrows results", lib.includes("2 scores") && lib.includes("Amazing Grace") && !lib.includes("Ode to Joy"));
    await clickText("Clear filters");
    await sleep(200);
    const search = await center('input[type="search"]');
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: search.x, y: search.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: search.x, y: search.y, button: "left", clickCount: 1 });
    await send("Input.insertText", { text: "frere" });
    await sleep(300);
    lib = await text();
    check("accent-insensitive search finds Frère Jacques", lib.includes("1 score") && lib.includes("Frère Jacques"));
    await send("Input.insertText", { text: "zzz" });
    await sleep(300);
    check("empty search shows an honest empty state", (await text()).includes("No scores match"));

    // ── Score viewer ──
    await goto("/sheet-music/ode-to-joy-piano");
    const rendered = await waitForScore();
    check("OSMD renders the score as SVG", rendered);
    const noteheads = await evaluate(`document.querySelectorAll('[data-score-ready="true"] svg .vf-notehead').length`);
    check("rendered score has 30 noteheads", noteheads === 30, `noteheads=${noteheads}`);
    check("viewer shows source and CC0 license", (await text()).includes("Symphony No. 9") && (await text()).includes("CC0 1.0 Universal"));
    const xmlRes = await fetch(BASE + "/sheet-music/ode-to-joy-piano/musicxml");
    const xmlBody = await xmlRes.text();
    check("MusicXML download works", xmlRes.status === 200 && xmlBody.includes("<score-partwise") && (xmlRes.headers.get("content-disposition") ?? "").includes("attachment"), `status=${xmlRes.status}`);
    const pdfRes = await fetch(BASE + "/sheet-music/pdf/ode-to-joy-piano.pdf");
    check("PDF download exists", pdfRes.status === 200 && (pdfRes.headers.get("content-type") ?? "").includes("pdf"), `status=${pdfRes.status}`);
    const missing = await fetch(BASE + "/sheet-music/not-a-score");
    check("unknown score returns 404", missing.status === 404, `status=${missing.status}`);

    await clickExact("Play");
    let litDuringPlay = false;
    for (let i = 0; i < 60 && !litDuringPlay; i++) {
      litDuringPlay = (await activeKeys()).length > 0;
      await sleep(25);
    }
    await sleep(800);
    const cursorShown = await evaluate(`(() => { const c = document.querySelector('[data-score-ready="true"] img[id^="cursorImg"]'); return !!c && getComputedStyle(c).display !== 'none'; })()`);
    check("playback moves the score cursor", cursorShown);
    check("playback lights the piano keys", litDuringPlay);
    await screenshot("flow-score-playing");
    await clickExact("Pause");
    await sleep(200);
    check("pause releases notes", (await activeKeys()).length === 0);

    await clickText("Practice");
    await sleep(400);
    check("practice mode starts at note 1", (await text()).includes("Note 1 of 30"));
    await tap("KeyD"); // E4 is first
    await sleep(200);
    await tap("KeyA"); // wrong: C4
    await sleep(250);
    const practiceText = await text();
    check("practice: right note advances, wrong note explains", practiceText.includes("That was C4 — the next note is E4"));
    await screenshot("flow-score-practice");
    await send("Emulation.setEmulatedMedia", { media: "print" });
    await sleep(300);
    await screenshot("flow-score-print", true);
    await send("Emulation.setEmulatedMedia", { media: "" });


    await evaluate(`(() => { const k='musicpath:settings'; const s=JSON.parse(localStorage.getItem(k)); s.state.locale='mn'; localStorage.setItem(k, JSON.stringify(s)); })()`);
    await send("Page.navigate", { url: BASE + "/learn" });
    let sawEnglishVisible = false;
    for (let i = 0; i < 60; i++) {
      const state = await evaluate(`(() => { const h = document.querySelector('header'); if (!h) return null; return { visible: getComputedStyle(h).visibility !== 'hidden', text: document.body.innerText.slice(0, 400) }; })()`).catch(() => null);
      if (state && state.visible && state.text.includes("Learn") && !state.text.includes("Суралцах")) sawEnglishVisible = true;
      await sleep(25);
    }
    check("no visible English flash for Mongolian users", !sawEnglishVisible);
    check("Mongolian renders after load", (await text()).includes("Суралцах"));
    await evaluate(`(() => { const k='musicpath:settings'; const s=JSON.parse(localStorage.getItem(k)); s.state.locale='en'; localStorage.setItem(k, JSON.stringify(s)); })()`);

    // ── Locked lesson (fresh profile) and 404 ──
    await evaluate("localStorage.removeItem('musicpath:progress')");
    await goto("/learn/piano/lesson/2");
    check("lesson 2 is locked for a new learner", (await text()).includes("This lesson is locked"));
    const res = await fetch(BASE + "/learn/piano/lesson/99");
    check("unknown lesson id returns 404", res.status === 404, `status=${res.status}`);

    check("no runtime errors in console", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));
  }
} catch (error) {
  check("script completed", false, String(error));
} finally {
  writeFileSync(path.join(OUT, `results-${MODE}.json`), JSON.stringify({ results, consoleErrors }, null, 2));
  ws.close();
  chrome.kill();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
