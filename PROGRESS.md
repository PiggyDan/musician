# MusicPath — Progress

_Last updated: 2026-10-30 · Milestone: **v0.3 — Piano Foundations complete + Free Sheet Music Library**_

## Status at a glance

| Area | Status |
| --- | --- |
| Foundation (Next 16.4, React 19.3, TS strict, Tailwind 4) | ✅ |
| Audio engine, virtual piano, mouse / multi-touch / keyboard / MIDI input | ✅ |
| Reusable lesson engine (data-driven steps) | ✅ |
| Piano Foundations: Lessons 1–5 playable, course completion | ✅ |
| Gamification: XP once per lesson, levels, 7 achievements | ✅ |
| Free Sheet Music Library (`/sheet-music`, `/sheet-music/[id]`) | ✅ 13 scores |
| EN / MN, no Mongolian first-paint flash | ✅ |
| iPhone silent switch: playback audio session + hint | ✅ |
| AI Music Teacher | 🧪 Typed contract only (`src/features/ai-tutor/types.ts`); UI says "not available yet" |
| Backend (Postgres / Drizzle / auth) | ⛔ Not started (deliberately out of scope) |

## What exists

### Lesson engine (`src/content/lessons/`, `src/components/lesson/`, `src/lib/lessons/`)
A lesson is a `LessonDefinition` with an ordered list of typed `LessonStep`s. One generic `LessonRunner` renders every lesson; each step kind has one component:

| Step kind | Component | Evaluation (pure, tested) |
| --- | --- | --- |
| `explain` (+ diagrams: key-pattern, letters, five-finger, rhythm) | `ExplainStep` | — |
| `play-note` — exact pitch | `PlayNoteStep` | `evaluatePlayedNote` (correct / wrong-octave / wrong-note) |
| `find-notes` — letters in any octave | `FindNotesStep` | `matchesLetter` |
| `name-notes` — key glows, learner names it | `NameNotesStep` | letter comparison |
| `play-sequence` — melody in order, optional guide | `SequenceStep` | `advanceSequence` (mistakes never reset progress) |
| `play-timed` — `rhythm` (pitch ignored) or `song` (pitch + time) | `TimedStep` + `TimelineGuide` | `scoreTimedPerformance`, `hasPassed`, `dominantProblem` |

- Completion is saved (XP once, via `applyLessonCompletion`) the moment the final step is passed; the celebration follows. All delayed transitions are effect-driven (`useAfter`) so they survive React `<Activity>` hide/show.
- Timing: metronome ticks are scheduled on the **audio clock** (`src/audio/metronome.ts`, look-ahead scheduler); expected note times include output latency. Beginner tolerances: ±80 ms perfect, ±200 ms on time, ±350 ms "a little early/late".
- To add a lesson: add steps to `src/content/lessons/piano.ts`, add copy under `steps` in **both** `en.ts` and `mn.ts` (type-checked), run `npm test`.

### Piano Foundations (85 XP total)
1. **Find Middle C** (10 XP) — explain → play C4.
2. **Meet the White Keys** (15 XP) — explain → find C D E F G A B (any octave, landmark tips) → name 6 glowing keys.
3. **Your First Melody** (15 XP) — five-finger position → "Sunrise Steps" (original) guided → from memory; listen + peek.
4. **Understanding Rhythm** (20 XP) — beats / tempo / quarter vs half → 8 steady beats → "short short long" ×2 at 80 BPM; tap pad for phones; slower-tempo option.
5. **Play Your First Song** (25 XP) — "First Light" (original, 16 beats, 72 BPM) with an animated note guide, live feedback, targeted tips; completes the course (gold celebration + "Foundations Complete" achievement).

### Free Sheet Music Library (`src/content/sheet-music/catalog.ts`, `src/lib/sheet-music/`, `src/components/sheet-music/`)
- **13 scores** across all six instruments: Ode to Joy (piano, cello), Twinkle (piano, ukulele), Minuet in G (piano, violin), Frère Jacques (guitar), Hot Cross Buns & Amazing Grace (harmonica), Au clair de la lune (violin), Mary Had a Little Lamb (piano), Sunrise Steps & First Light (MusicPath originals).
- **Licensing model** — every entry records title (EN/MN), composer, instrument, difficulty, genre, date, source note, composition status, license, attribution and formats:
  - Public-domain compositions (composers died 1733–1872, or traditional melodies) **newly engraved by MusicPath** from the melody → **CC0 1.0**. Nothing is copied from another publisher's edition; arrangements are simplified single-line melodies (stated in each source note).
  - MusicPath originals → **CC BY 4.0** (credit "MusicPath"). _Owner may change this._
- Melodies are stored in a compact text notation (`notation.ts`) at sounding pitch; `musicxml.ts` generates MusicXML 4.0 (guitar written an octave up with an octave clef). Tests validate measure lengths, instrument ranges, licensing fields, and that PDFs exist.
- **Library page**: accent-insensitive search (titles + composers, both languages), instrument chips, difficulty / genre / composer filters (only values that exist), honest empty state, melody-contour artwork drawn from each score's real notes.
- **Score viewer**: OpenSheetMusicDisplay 2.2.1 (BSD-3, lazy-loaded) on a paper panel; play / pause / stop through the shared Tone.js engine with a moving cursor and lit piano keys; tempo 50–150 %; audio-clock metronome (bar-aligned, handles pickups); **practice mode** (wait mode: the score waits for the right note on the piano; mistakes explained, never reset); MusicXML download (static route `/sheet-music/[id]/musicxml`), PDF download (`/sheet-music/pdf/<id>.pdf`), print (print CSS hides the app; licence footer printed).
- PDFs are generated by printing each score page in headless Chrome: `npm run pdfs` (needs the app running).

### Polish
- Mongolian first-paint flash fixed: an inline pre-paint script reads the saved locale, sets `<html lang>`, hides the page until the Mongolian render commits (2 s failsafe). Verified in the browser.
- iPhone: `navigator.audioSession.type = "playback"` (iOS 17+ plays despite the silent switch) plus a dismissible silent-switch hint on iOS.
- Lesson feedback now swaps instantly (the old fade-out wait delayed "Perfect"/"Late" by ~180 ms).
- Lesson transitions slide between steps; bigger keys (C4–C5) for melody/song steps on phones.

## Verification (2026-10-30)

| Check | Result |
| --- | --- |
| `npm test` — 93 tests (note math, chords, lesson evaluation, sequences, timing scorer, XP once per lesson, unlocking, notation parser, MusicXML, catalog licensing/ranges/measures, search & filters, PDF presence) | ✅ 93/93 |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ 0 problems |
| `npm run build` | ✅ 42 static pages, no warnings |
| `npm run e2e` (headless Chrome vs `next start`): all input methods, chords, no stuck notes, Lessons 1–5 end to end (rhythm and song tapped in time against the live metronome: 8/8, 6/6, 12/12 on time), deliberate failure path, exactly 85 XP, course achievement, persistence, EN↔MN, no English flash, locked lesson, 404s, library filters/search, OSMD renders 30 noteheads, cursor + lit keys during playback, pause releases notes, practice mode, MusicXML + PDF downloads, zero console errors | ✅ 63/63 |
| `npm run e2e -- screens`: no horizontal overflow on 11 routes at 1440×900 and 390×844 | ✅ 22/22 |

**Not verified by a human:** real sound quality and latency on phones, iOS silent-switch behaviour on a physical iPhone, a physical MIDI keyboard, and the PDFs' look in a PDF reader (generated and size-checked; not visually inspected — no PDF renderer available in this environment; the print layout was checked via print-media screenshots).

## Known limitations

- Timed exercises measure input against the audio clock + reported output latency; Bluetooth headphones can add uncompensated latency (a calibration step would fix it).
- Sheet music is monophonic (single melody line); no two-hand piano scores yet. Playback uses the piano voice for every instrument (stated in the UI).
- Library filters are not reflected in the URL (not shareable).
- Page `<title>` metadata is English only.
- No MIDI sustain pedal.
- Progress lives in one browser (localStorage).

## Next milestone — v0.4 "Practice loop"

1. Latency calibration (tap-along) stored in settings and applied in `scoreTimedPerformance`.
2. Daily practice goal + streaks (fits in `ProgressData`), with achievements.
3. Piano Foundations Unit 2 (left hand, bass clef, chords) using the existing step kinds; add a `play-chord` step kind.
4. Sheet music: two-staff piano scores (extend notation with voices), shareable filter URLs, "practice this in a lesson" links.
5. Later: backend (Postgres + Drizzle + auth) with localStorage migration; server-side AI tutor implementing `TutorProvider`.

## Commands

```bash
npm install
npm run dev                         # http://localhost:3000
npm test                            # Vitest
npm run typecheck                   # next typegen + tsc
npm run lint
npm run build && npm start
npm run pdfs                        # regenerate score PDFs (app must be running; BASE=http://localhost:3000)
npm start -- -p 3100 & npm run e2e  # browser flows; `npm run e2e -- screens` for layouts
```

## Architecture map

```
src/
  app/                  routes: / learn learn/piano learn/piano/lesson/[id] practice profile
                        sheet-music  sheet-music/[id]  sheet-music/[id]/musicxml (route handler)
  audio/                engine.ts (Tone), metronome.ts (audio-clock ticks), midi.ts, hooks.ts
  components/
    lesson/             lesson-runner, lesson-complete, timeline-guide, steps/* (one per step kind)
    sheet-music/        library, score-card, score-viewer, score-sheet (OSMD), use-score-playback
    home/ learn/ studio/ profile/ layout/ piano/ ui/ providers/
  content/              instruments, lessons/ (piano.ts, types, timing), sheet-music/catalog.ts
  features/ai-tutor/    typed contract only
  i18n/                 en.ts (source of truth) + mn.ts, StepCopy type
  lib/                  music/, gamification/, lessons/ (evaluate, timing), sheet-music/ (notation, musicxml, library)
  store/                progress, settings, toasts, hydration
scripts/                generate-score-pdfs.mjs, e2e.mjs
public/sheet-music/pdf/ generated PDFs (committed)
```

### Notes for this Next.js version
- `cacheComponents` + `partialPrefetching` are on; no `dynamicParams`/`runtime` exports. Dynamic pages use `ensureStatic = "navigation"` + `generateStaticParams` so unknown ids return a real 404.
- Hidden routes stay mounted in React `<Activity>`; timers/audio must be effect-driven and cleaned up.
- `next start` indexes `public/` at boot — restart it after `npm run pdfs`.
- Read `node_modules/next/dist/docs/` before using new APIs (see `AGENTS.md`).
