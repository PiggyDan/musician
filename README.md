# MusicPath

An interactive music academy in the browser. The first release is focused on piano: a real synthesized keyboard you can play with mouse, touch, computer keyboard or MIDI, plus a guided path with XP and levels. Available in English and Mongolian.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | Route type generation + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` / `npm start` | Production build / server |

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Motion · Tone.js / Web Audio / Web MIDI · Zustand (localStorage persistence) · Lucide.

See [PROGRESS.md](PROGRESS.md) for current status, verification results, known issues and next steps.
