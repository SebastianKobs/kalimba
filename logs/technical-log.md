# Technical log

One entry per labelled commit, starting with its short hash: date, label, decision or change, and why.

- `1d1b3e1` 2026-11-04 TECHNICAL: **Stack: Vite, TypeScript (strict), Vitest with jsdom for the view test; core logic (`pitch`, `layout`, `synth`, `keymap`) is pure and tested in Node, Web Audio and the DOM sit in thin edges (`audio.ts`, `kalimba-view.ts`, `main.ts`):** the synth renders samples offline, so its pitch and decay are tested without an audio device; `audio.ts` and drag-to-strum are checked by playing.
- `pending` 2026-11-04 TECHNICAL: **General translator and practice core, pure and tested: `parseSong` (text → notes in beats), `arrange` (any song onto any tongues), `PracticeSession` (clock and scoring in beats), `createTongues` with `KALIMBA_21` and `KALIMBA_17`; edges: `mountPractice` (driven by `tick(seconds)` from requestAnimationFrame, capped at 0.1 s per frame), `canvasHighway`, and a `KalimbaHandle` from `mountKalimba` (pluck, targets, miss):** the translator isn't tied to one song or layout; the view tests run in jsdom with an injected no-op highway, so canvas and audio stay out of them.
