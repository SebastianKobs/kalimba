# Technical log

One entry per labelled commit, starting with its short hash: date, label, decision or change, and why.

- `1d1b3e1` 2026-11-04 TECHNICAL: **Stack: Vite, TypeScript (strict), Vitest with jsdom for the view test; core logic (`pitch`, `layout`, `synth`, `keymap`) is pure and tested in Node, Web Audio and the DOM sit in thin edges (`audio.ts`, `kalimba-view.ts`, `main.ts`):** the synth renders samples offline, so its pitch and decay are tested without an audio device; `audio.ts` and drag-to-strum are checked by playing.
