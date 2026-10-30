# MusicPath — Progress

_Last updated: 2026-10-30 · Milestone: **MVP v0.1 (piano)** complete_

## Status at a glance

| Area | Status |
| --- | --- |
| Foundation (Next 16, React 19, TS strict, Tailwind 4) | ✅ Done |
| Design system + homepage | ✅ Done |
| Audio engine, virtual piano, keyboard/touch/mouse/MIDI input | ✅ Done |
| Learning system: dashboard, academy, Lesson 1, XP, levels, achievements | ✅ Done |
| Profile, i18n (EN/MN), local persistence | ✅ Done |
| Lessons 2–5 content | ⏳ Listed as "coming soon" |
| AI Music Teacher | 🧪 Typed contract only (`src/features/ai-tutor/types.ts`); UI says "not available yet" |
| Backend (Postgres/Drizzle/auth) | ⛔ Not started (out of MVP scope by design) |

## Completed features

- **Routes:** `/`, `/learn`, `/learn/piano`, `/learn/piano/lesson/[id]` (1–5 prerendered; unknown ids → real 404), `/practice`, `/profile`, custom 404.
- **Audio engine** (`src/audio/engine.ts`): Tone.js loaded lazily on the client; `PolySynth(MonoSynth)` with a filtered additive voice → reverb → limiter → master volume. 32-voice polyphony, `lookAhead: 0` for live latency. Notes are reference-counted **per input source**, so mouse + keyboard on the same key never double-trigger or stick. All notes release on window blur / tab hide / pagehide and on component unmount. Taps made before audio is ready are queued and still sound.
- **Piano keyboard** (`src/components/piano/piano-keyboard.tsx`): correct white/black layout with realistic black-key offsets, responsive key count, pointer capture per pointer (multi-touch chords, glissando by dragging), velocity from press depth, light particles on note-on, roving-tabindex keyboard accessibility (arrows + Space/Enter).
- **Computer keyboard:** `A W S E D F T G Y H U J K O L P ;` = C4…E5, `Z`/`X` octave. Uses `KeyboardEvent.code`, so it works on Mongolian Cyrillic layouts too.
- **Web MIDI:** opt-in "Connect MIDI keyboard" button, note on/off with velocity, all-notes-off, releases notes when a device unplugs.
- **Studio:** volume (persisted), octave selector, note-name / key-hint toggles, audio status, live note + chord readout (`detectChord`).
- **Lesson 1 "Find Middle C":** intro with teaching diagram → task → completion. Accepts **only MIDI 60**; distinct feedback for wrong octave vs wrong note; hint after 2 misses; XP saved the instant C4 is played; celebration screen; replay gives no extra XP.
- **Gamification** (`src/lib/gamification/`): pure, unit-tested functions. Level curve `25·L·(L−1)`; idempotent `applyLessonCompletion`; achievements (`first-note`, `hundred-notes`, `first-lesson`, `middle-c`) with toasts; capped history (50).
- **Persistence:** Zustand `persist` → `localStorage` (`musicpath:progress`, `musicpath:settings`), manual hydration after mount (no SSR mismatch), defensive parsing of corrupt data, storage-safe wrapper, cross-tab sync via `storage` event.
- **i18n:** `src/i18n/dictionaries/{en,mn}.ts`; `mn` is type-checked against `en`, so a missing key fails the build. `<html lang>` follows the locale. Fonts include `cyrillic-ext` (Ө, Ү).
- **Accessibility / motion:** skip link, labelled controls, `aria-live` lesson feedback, focus moves to each lesson step's heading, `prefers-reduced-motion` respected (CSS + `MotionConfig reducedMotion="user"`; the canvas draws a still frame).

## Verification (2026-10-30)

| Check | Result |
| --- | --- |
| `npm test` (Vitest, 27 tests: note math, keyboard layout, chords, lesson evaluation, XP idempotency, levels, unlocking, corrupt storage) | ✅ 27/27 |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 problems |
| `npm run build` | ✅ success, no warnings |
| Headless-Chrome E2E against `next start` (31 checks): keyboard/mouse/glissando/multi-touch input, 3-note chords, no stuck notes (repeat, octave change while held), audio engine reaches `running`, Lesson 1 wrong-note / wrong-octave / C4 completion, exactly 10 XP, replay adds 0, persistence after reload, EN↔MN switch + persistence, coming-soon lesson, 404 status, zero console errors | ✅ 31/31 |
| Layout: no horizontal overflow on all 8 routes at 1440×900 and 390×844 | ✅ 16/16 |

**Not verified by a human ear/hand:** actual sound quality, latency on real phones (iOS Safari especially), and a physical MIDI keyboard. Headless Chrome confirmed the AudioContext starts and notes are triggered, but the run was muted.

## Known bugs / limitations

- Language preference loads after hydration, so a Mongolian user briefly sees English on first paint. A cookie-based locale would fix this, but reading cookies makes routes dynamic under Cache Components.
- iOS hardware silent switch mutes Web Audio (platform behaviour); not yet surfaced in the UI.
- No sustain pedal (MIDI CC64) yet.
- Page `<title>` metadata is English-only (prerendered once).
- Progress is per-browser only; clearing site data erases it (stated in the UI).

## Next tasks (suggested order)

1. Build Lessons 2–5: extend `LessonTask` (e.g. `play-sequence`, `name-the-key`), add content to `src/content/lessons/piano.ts`, set `playable: true`.
2. Sustain pedal + a sampled piano option (Tone `Sampler`) with a loading state.
3. Daily challenge + streaks (data structures fit in `ProgressData`; add achievements).
4. Backend phase: Postgres + Drizzle schema mirroring `ProgressData`, auth, server sync with localStorage migration.
5. AI tutor: implement `TutorProvider` server-side (Route Handler), feed it `PerformanceSnapshot` built from engine note events. Keep keys server-only.
6. Real-device QA pass (iOS Safari, Android Chrome, MIDI keyboard).

## Commands

```bash
npm install          # first time
npm run dev          # http://localhost:3000
npm test             # unit tests (Vitest)
npm run typecheck    # next typegen + tsc
npm run lint
npm run build && npm start
```

## Architecture map

```
src/
  app/                    routes (server components; thin wrappers around client views)
  audio/                  engine.ts (Tone), midi.ts (Web MIDI), hooks.ts
  components/
    home/ learn/ lesson/ studio/ profile/ layout/ piano/ ui/ providers/
  content/                instruments.ts, lessons/ (centralized lesson definitions)
  features/ai-tutor/      typed contract for the future AI teacher (no implementation)
  hooks/                  generic hooks
  i18n/                   dictionaries (en = source of truth), format(), useI18n
  lib/                    music/ (notes, chords, keyboard map), gamification/, lessons/
  store/                  zustand stores (progress, settings, toasts), hydration
```

### Notes for this Next.js version
- `cacheComponents` + `partialPrefetching` are on. Do not export `dynamicParams`/`runtime` from routes.
- `params` is a Promise. The lesson route uses `ensureStatic = "navigation"` + `generateStaticParams` so unknown ids return a true 404.
- Pages stay mounted in React `<Activity>` when navigated away, and effects clean up. Any audio or timer logic must survive hide/show (see the lesson's effect-driven completion).
- Read `node_modules/next/dist/docs/` before using new APIs (see `AGENTS.md`).
