# kalimba

Playable browser prototype of a 21-tongue kalimba in C major, in HTML and TypeScript.

The tongue layout comes from `kalimba.jpg`, a hand-drawn card. Rotate the photo 90° clockwise from its EXIF-corrected orientation to read it.

@.githooks/rule-based-commit-logging/claude-rule.md

Log entries also carry the date: ``- `pending` 2026-11-04 LABEL: **Decision or change:** reason.``

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm test` | Vitest, all tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | typecheck, then production build into `dist/` |

Enable the commit hook once per clone: `git config core.hooksPath .githooks`.

## Layout of the card

Each column on the card shows a letter, octave dots and a cipher (jianpu) digit, 1 = C … 7 = B. Dots above the digit mean octaves above 4, and dots below mean octaves below. Left to right:

`D6 B5 G5 E5 C5 A4 F4 D4 B3 G3 [F3] A3 C4 E4 G4 B4 D5 F5 A5 C6 E6`

The lowest and longest tongue, F3, is in the centre, and pitches alternate outward, starting on the left.

## Structure

Core logic is pure and tested in Node. Edges are thin.

| File | Role |
|---|---|
| `src/pitch.ts` | note name → MIDI number → frequency (12-TET, A4 = 440 Hz) |
| `src/layout.ts` | `KALIMBA_21`: the card's tongues with cipher digit, octave dots and length (L ∝ 1/√f) |
| `src/synth.ts` | `renderTine`: frequency → mono samples (decaying sine modes, 2nd mode at 6.267×) |
| `src/keymap.ts` | `KeyboardEvent.code` → tongue, in pitch order: `Z`…`/` then `A`…`'` |
| `src/kalimba-view.ts` | edge: draws the tongues, maps pointer and keyboard input to `Plucker.pluck` |
| `src/audio.ts` | edge: `WebAudioPlucker`, one voice per tongue, damps on re-pluck, limiter on the master |
| `src/main.ts` | wires view and audio; renders all tines on the first user gesture |

Tests live in `test/`. The view test runs in jsdom with a fake plucker. `audio.ts` and drag-to-strum have no automated tests; they are checked by playing.

## Rule overrides
- none yet
