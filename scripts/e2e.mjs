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
  evaluate(`(() => { window.__playNowAt = null; const visible = () => [...document.querySelectorAll('[role=status]')].some((el) => el.offsetParent !== null && el.textContent.includes('Play now!')); const o = new MutationObserver(() => { if (window.__playNowAt === null && visible()) { window.__playNowAt = performance.now(); o.disconnect(); } }); o.observe(document.body, { subtree: true, childList: true, characterData: true }); })()`);
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
// Computer-key code for a MIDI note when the "A" key plays `base`.
const CODE_FOR_SEMITONE = ["KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT", "KeyG", "KeyY", "KeyH", "KeyU", "KeyJ", "KeyK", "KeyO", "KeyL", "KeyP", "Semicolon"];
const codeFor = (midi, base) => {
  const code = CODE_FOR_SEMITONE[midi - base];
  if (!code) throw new Error(`MIDI ${midi} not reachable from base ${base}`);
  return code;
};
const playMidi = async (midi, base) => {
  await tap(codeFor(midi, base));
  await sleep(150);
};
// Holds several keys at once (a chord), then releases them.
const chordKeys = async (midis, base, holdMs = 120) => {
  for (const m of midis) await key(codeFor(m, base), "keyDown");
  await sleep(holdMs);
  for (const m of midis) await key(codeFor(m, base), "keyUp");
};
// Touches several on-screen keys at once (both hands / wide chords).
const touchKeys = async (midis, holdMs = 80) => {
  await evaluate(`document.querySelector('[data-midi="${midis[0]}"]').scrollIntoView({ block: "nearest" })`);
  const points = [];
  for (const [i, m] of midis.entries()) {
    const c = await center(`[data-midi="${m}"]`);
    points.push({ x: c.x, y: c.y, id: 100 + i });
  }
  // Clear any touch sequence Chrome still considers active, then start fresh.
  await send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] }).catch(() => {});
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points });
  // Headless Chrome occasionally drops an emulated touch late in a long session; retry once.
  if ((await activeKeys()).length === 0) {
    await send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] }).catch(() => {});
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points.map((p) => ({ ...p, id: p.id + 50 })) });
  }
  await sleep(holdMs);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
};
// Plays [midis[], beat] events by touch, relative to the page's beat 0.
const touchTimed = async (events, beatMs) => {
  const ok = await waitForText("Play now!", 10000);
  const t1 = Date.now();
  const pageNow = await evaluate("performance.now()");
  const t2 = Date.now();
  const playAt = await evaluate("window.__playNowAt");
  const zero = (t1 + t2) / 2 + (playAt - pageNow);
  for (const [midis, beat] of events) {
    const wait = zero + beat * beatMs - Date.now() - 6;
    if (wait > 0) await sleep(wait);
    await touchKeys(midis, 40);
  }
  return ok;
};
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

try {
  if (MODE === "screens") {
    const routes = [["home", "/"], ["learn", "/learn"], ["academy", "/learn/piano"], ["lesson1", "/learn/piano/lesson/1"], ["lesson3", "/learn/piano/lesson/3"], ["practice", "/practice"], ["profile", "/profile"], ["404", "/nope"], ["library", "/sheet-music"], ["score-minuet", "/sheet-music/minuet-in-g-piano"], ["score-guitar", "/sheet-music/frere-jacques-guitar"], ["score-grand", "/sheet-music/ode-to-joy-both-hands"], ["songs", "/songs"], ["song-pd", "/songs/musicpath--ode-to-joy"], ["song-meta", "/songs/curated--way-maker"], ["lesson8", "/learn/piano/lesson/8"]];
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

    // ── Unit 2 · Lesson 6: reading the treble staff (computer keys from C4) ──
    await goto("/learn/piano/lesson/6");
    check("L6 is unlocked after Unit 1", (await text()).includes("Reading the Treble Staff"));
    await clickText("Start reading");
    await sleep(900);
    check("L6: a note is engraved on a staff", await evaluate(`document.querySelectorAll('[data-staff-ready="true"] svg').length > 0`));
    await playMidi(64, 60); // wrong (target C4)
    await sleep(200);
    await playMidi(65, 60); // wrong again → position hint
    await sleep(250);
    let l6 = await text();
    check("L6: misses reveal where the note sits", l6.includes("on a ledger line below the staff"));
    await screenshot("flow-l6-read");
    for (const m of [60, 64, 67, 62, 65, 67, 64, 60]) { await playMidi(m, 60); await sleep(850); }
    await sleep(1300);
    for (const m of [69, 71, 72, 67, 65, 69, 62, 71]) { await playMidi(m, 60); await sleep(850); }
    await sleep(1500);
    check("L6: completes with +15 XP", (await text()).includes("+15 XP earned"));

    // ── Lesson 7: bass clef + left hand ──
    await goto("/learn/piano/lesson/7");
    await clickText("Start reading");
    await sleep(900);
    for (const m of [48, 55, 52, 50, 53, 48, 55, 52]) { await playMidi(m, 48); await sleep(850); }
    await sleep(1300);
    check("L7: bass reading leads to left-hand position", (await text()).includes("Left-hand C position"));
    await clickText("Try it");
    await sleep(900);
    const l7 = await text();
    check("L7: finger numbers shown (5 4 3 2 1)", /5\s*4\s*3\s*2\s*1/.test(l7.replace(/[CDEFG\n]/g, " ")) || l7.includes("1 = thumb"));
    for (const m of [48, 50, 52, 53, 55, 53, 52, 50, 48]) await playMidi(m, 48);
    await sleep(1400);
    for (const m of [48, 52, 55, 52, 50, 48]) await playMidi(m, 48);
    await sleep(1600);
    check("L7: completes with +15 XP", (await text()).includes("+15 XP earned"));

    // ── Lesson 8: chords ──
    await goto("/learn/piano/lesson/8");
    await clickText("Build a chord");
    await sleep(900);
    await key("KeyA", "keyDown"); // C only
    await sleep(200);
    check("L8: partial chord asks for the third", (await text()).includes("add the third: E"));
    await key("KeyA", "keyUp");
    await chordKeys([60, 64, 65], 60); // wrong note F
    await sleep(200);
    check("L8: wrong chord tone explained", (await text()).includes("F4 isn't in the C chord"));
    await screenshot("flow-l8-chord");
    for (const chord of [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]]) { await chordKeys(chord, 60, 200); await sleep(1200); }
    await sleep(1000);
    check("L8: right-hand chords lead to left-hand chords", (await text()).includes("Left-hand chords"));
    for (const chord of [[48, 52, 55], [41, 45, 48], [43, 47, 50], [48, 52, 55]]) { await chordKeys(chord, 41, 200); await sleep(1200); }
    await sleep(1600);
    check("L8: completes with +20 XP", (await text()).includes("+20 XP earned"));

    // ── Lesson 9: hands together (multi-touch) ──
    await goto("/learn/piano/lesson/9");
    await clickText("Start slowly");
    await sleep(900);
    const together = [[48, 60], [64], [67], [55, 65], [64], [62], [48, 64], [65], [67], [64], [55, 62], [48, 60]];
    await touchKeys([64]); // wrong first
    await sleep(250);
    check("L9: wrong note names both-hand target", (await text()).includes("Play the glowing key: C3 + C4"));
    for (const midis of together) { await touchKeys(midis); await sleep(180); }
    await sleep(1400);
    check("L9: wait-mode leads to timed both-hands song", (await text()).includes("First Light, both hands"));
    await armPlayNow();
    await clickExact("Start");
    const firstLightBoth = [[[48, 60], 0], [[64], 1], [[67], 2], [[55, 65], 4], [[64], 5], [[62], 6], [[48, 64], 8], [[65], 9], [[67], 10], [[64], 11], [[55, 62], 12], [[48, 60], 14]];
    await touchTimed(firstLightBoth, 60000 / 66);
    await sleep(2600);
    let l9 = await text();
    check("L9: both hands in time passes", l9.includes("Great timing"), l9.match(/\d+ of \d+ notes on time/)?.[0]);
    await screenshot("flow-l9-song");
    await clickText("Continue");
    await sleep(1800);
    check("L9: completes with +25 XP", (await text()).includes("+25 XP earned"));

    // ── Lesson 10: I–IV–V ──
    await goto("/learn/piano/lesson/10");
    await clickText("Learn the shapes");
    await sleep(900);
    for (const chord of [[48, 52, 55], [48, 53, 57], [47, 50, 55], [48, 52, 55]]) { await chordKeys(chord, 45, 200); await sleep(1200); }
    await sleep(1000);
    check("L10: shapes lead to progression in time", (await text()).includes("I – IV – V – I in time"));
    await armPlayNow();
    await clickExact("Start");
    const progression = [[[48, 52, 55], 0], [[48, 53, 57], 4], [[47, 50, 55], 8], [[48, 52, 55], 12]];
    {
      const ok = await waitForText("Play now!", 10000);
      const t1 = Date.now();
      const pageNow = await evaluate("performance.now()");
      const t2 = Date.now();
      const zero = (t1 + t2) / 2 + ((await evaluate("window.__playNowAt")) - pageNow);
      for (const [midis, beat] of progression) {
        const wait = zero + beat * (60000 / 72) - Date.now() - 6;
        if (wait > 0) await sleep(wait);
        await chordKeys(midis, 45, 60);
      }
      check("L10: progression started", ok);
    }
    await sleep(4200);
    let l10 = await text();
    check("L10: chord progression in time passes", l10.includes("Great timing"), l10.match(/\d+ of \d+ notes on time/)?.[0]);
    await clickText("Continue");
    await sleep(1500);
    check("L10: Ode to Joy with chords step", (await text()).includes("Ode to Joy, with chords"));
    await armPlayNow();
    await clickExact("Start");
    const ode = [[[48, 52, 55, 64], 0], [[64], 1], [[65], 2], [[67], 3], [[47, 50, 55, 67], 4], [[65], 5], [[64], 6], [[62], 7], [[48, 52, 55, 60], 8], [[60], 9], [[62], 10], [[64], 11], [[47, 50, 55, 64], 12], [[62], 13.5], [[62], 14]];
    {
      // Left-hand chords on the computer keys (A = B2 here), right-hand notes with the mouse:
      // both input paths are deterministic in headless Chrome, unlike emulated touch late in a run.
      await waitForText("Play now!", 10000);
      const t1 = Date.now();
      const pageNow = await evaluate("performance.now()");
      const t2 = Date.now();
      const zero = (t1 + t2) / 2 + ((await evaluate("window.__playNowAt")) - pageNow);
      const rhPos = {};
      for (const m of [60, 62, 64, 65, 67]) rhPos[m] = await center(`[data-midi="${m}"]`);
      for (const [midis, beat] of ode) {
        const wait = zero + beat * (60000 / 66) - Date.now() - 6;
        if (wait > 0) await sleep(wait);
        const left = midis.filter((m) => m < 60);
        const right = midis.filter((m) => m >= 60);
        for (const m of left) await key(codeFor(m, 47), "keyDown");
        for (const m of right) await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rhPos[m].x, y: rhPos[m].y, button: "left", clickCount: 1 });
        await sleep(40);
        for (const m of right) await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rhPos[m].x, y: rhPos[m].y, button: "left", clickCount: 1 });
        for (const m of left) await key(codeFor(m, 47), "keyUp");
      }
    }
    await sleep(3200);
    l10 = await text();
    check("L10: Ode to Joy hands together passes", l10.includes("Great timing"), l10.match(/\d+ of \d+ notes on time/)?.[0]);
    await clickText("Continue");
    await sleep(1800);
    check("L10: Unit 2 completion celebration", (await text()).includes("Reading & Both Hands complete!"));
    await screenshot("flow-l10-unit");
    const st2 = JSON.parse(await evaluate("localStorage.getItem('musicpath:progress')"));
    check("total XP is 185 after all ten lessons", st2?.state?.xp === 185, `xp=${st2?.state?.xp}`);
    check("Unit 2 achievement unlocked", Boolean(st2?.state?.achievements?.["both-hands"]));
    check("practice minutes were recorded today", Object.values(st2?.state?.practiceMinutes ?? {}).some((v) => v > 0));

    // ── Dashboard goal + academy units ──
    await goto("/learn");
    const dash = await text();
    check("dashboard shows the daily goal and streak", dash.includes("Daily goal") && /\d+-day streak|No streak yet|Goal reached/.test(dash));
    await goto("/learn/piano");
    const acad = await text();
    check("academy groups lessons into two units", acad.includes("Unit 1 · Piano Foundations") && acad.includes("Unit 2 · Reading & Both Hands"));

    // ── Latency calibration ──
    await goto("/profile");
    await clickText("Calibrate");
    await waitForText("Tap here on every click", 5000);
    await sleep(150 + 2 * 666 + 60);
    for (let i = 0; i < 8; i += 1) {
      await tap("KeyA", 30);
      await sleep(666 - 30 - 8);
    }
    await sleep(1200);
    const cal = await text();
    check("calibration measures and saves a delay", cal.includes("Your device delay"), cal.match(/Your device delay: -?\d+ ms/)?.[0]);
    const settings = JSON.parse(await evaluate("localStorage.getItem('musicpath:settings')"));
    check("calibration persisted", settings?.state?.latencyCalibrated === true, `latency=${settings?.state?.latencyMs}`);

    // ── Sheet music library ──
    await goto("/sheet-music");
    let lib = await text();
    check("library lists 16 scores", lib.includes("16 scores"), lib.match(/\d+ scores?/)?.[0]);
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

    // Every score: OSMD's cursor visits exactly as many positions as our step model.
    await goto("/sheet-music");
    const ids = await evaluate(`[...document.querySelectorAll('a[href^="/sheet-music/"]')].map(a => a.getAttribute('href').split('/').pop())`);
    let syncFailures = [];
    for (const id of ids) {
      await goto(`/sheet-music/${id}`);
      await waitForScore();
      const counts = await evaluate(`({ osmd: Number(document.querySelector('[data-cursor-steps]')?.dataset.cursorSteps), ours: Number(document.querySelector('[data-expected-steps]')?.dataset.expectedSteps) })`);
      if (counts.osmd !== counts.ours) syncFailures.push(`${id}: osmd=${counts.osmd} ours=${counts.ours}`);
    }
    check(`cursor model matches OSMD for all ${ids.length} scores`, ids.length >= 16 && syncFailures.length === 0, syncFailures.join(" | ") || `${ids.length} scores`);

    await goto("/sheet-music?instrument=piano&q=hands");
    await sleep(500);
    const shared = await text();
    check("filters load from a shared URL", shared.includes("3 scores") && shared.includes("Ode to Joy (hands together)"));
    await clickExact("Harmonica");
    await sleep(300);
    check("filter changes update the URL", (await evaluate("location.search")).includes("instrument=harmonica"));

    await goto("/sheet-music/first-light-both-hands");
    await waitForScore();
    await clickText("Practice");
    await sleep(400);
    await clickExact("Left hand");
    await sleep(300);
    check("left-hand practice starts with C3", (await text()).includes("Note 1 of 5"));
    for (const m of [48, 55, 48, 55, 48]) { await touchKeys([m]); await sleep(150); }
    await sleep(300);
    check("left-hand practice completes", (await text()).includes("You played the whole piece!"));
    await clickExact("Both hands");
    await sleep(300);
    await touchKeys([60]);
    await sleep(200);
    check("both-hands practice waits for C3 + C4 together", (await text()).includes("Note 1 of 12"));
    await touchKeys([48, 60]);
    await sleep(200);
    check("both-hands practice advances on the pair", (await text()).includes("Note 2 of 12"));
    check("viewer links to the related lesson", (await text()).includes("Learn the skills in Lesson 9"));
    await screenshot("flow-score-grand");

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


    // ── Songs ──
    await goto("/songs");
    let songsText = await text();
    check("songs page lists the catalog", /\d+ songs/.test(songsText) && songsText.includes("Discovery only") && songsText.includes("Play & practise"));
    await clickExact("K-pop");
    await sleep(300);
    songsText = await text();
    check("genre filter shows K-pop songs", songsText.includes("Dynamite") && !songsText.includes("Ode to Joy"));
    await goto("/songs/curated--wolf-totem");
    songsText = await text();
    check("metadata-only song: no recording, sheet music unavailable, no downloads",
      songsText.includes("Sheet music unavailable") && songsText.includes("No downloads"));
    check("metadata-only song links out to official search", (await evaluate(`[...document.querySelectorAll('a[target=_blank]')].map(a => a.href).join(' ')`)).includes("youtube.com/results"));
    await goto("/songs/curated--shape-of-you");
    check("audio-only: Spotify's player for a verified track", (await evaluate(`document.querySelector('main iframe')?.src ?? ''`)).startsWith("https://open.spotify.com/embed/track/7qiZfU4dY1lWllzX7mPBI3"));
    await goto("/songs/curated--wolf-totem");
    check("verified official video plays via YouTube's embed player", (await evaluate(`document.querySelector('main iframe')?.src ?? ''`)).startsWith("https://www.youtube-nocookie.com/embed/jM8dCGIm6yc"));
    await goto("/songs/curated--way-maker");
    songsText = await text();
    check("unverified song: no player at all, only official search links", (await evaluate(`document.querySelectorAll('main iframe, main audio').length`)) === 0 && songsText.includes("No authorized recording available"));
    await goto("/songs/musicpath--amazing-grace");
    await clickExact("Play");
    let heard = false;
    for (let i = 0; i < 60 && !heard; i++) { heard = ((await evaluate(`[...document.querySelectorAll('.bg-spectrum.h-full')].find(e => e.offsetParent)?.style.width`)) ?? "0%") !== "0%"; await sleep(50); }
    check("public-domain song plays the MusicPath performance", heard);
    await clickExact("Pause");
    check("public-domain song lists its arrangement and downloads", (await text()).includes("Open score") && (await text()).includes("MusicXML"));
    await screenshot("flow-song-detail");
    const missingSong = await fetch(BASE + "/songs/nope--nope");
    check("unknown song returns 404", missingSong.status === 404, `status=${missingSong.status}`);

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
