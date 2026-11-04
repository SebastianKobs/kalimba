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
| `src/pitch.ts` | note name (with # or b) → MIDI number → frequency (12-TET, A4 = 440 Hz) |
| `src/layout.ts` | `createTongues`, `KALIMBA_21` (the card), `KALIMBA_17`: tongues with cipher digit, octave dots and length (L ∝ 1/√f); `retune`: each tongue ±1 half step, same place and digit |
| `src/tuning.ts` | `tongueNumber` (`4̣`, `4`, `4′`, `2″`, as tabs write them), `describeTuning` ("Tuning: Standard C with 4′ raised from F to F#") |
| `src/stored-tuning.ts` | `parseStoredTuning`: validates the tuning read back from localStorage |
| `src/music/notation.ts` | `parseSong`: song text or pasted kalimba tab (letters or numbers; `'` `′` `*` `°` `″` `”` dot above/below as octave marks; `( )`/`[ ]` group notes played together, a `-` after a note holds it a beat longer, also glued: `2-4`; jianpu durations) → notes in beats; a number plays its tongue as retuned (unless a `key:` line decides), a letter is a pitch; skips and lists what it can't read (lines mostly not notes are skipped whole); `SongTextError` only when no notes are left; `tempoOf`, `titleOf` |
| `src/music/key.ts` | `keySignature`: key name (G, Bb major, Em) → which letters are raised or lowered; `key:` lines in song text |
| `src/music/arrange.ts` | `arrange`: any song onto any tongues: best transposition, octave folding, skipped notes; `transposeOptions`: the shifts worth offering, best first |
| `src/music/interval.ts` | `describeShift`: semitones → "down a fifth (7 semitones)" |
| `src/practice/session.ts` | `PracticeSession`: clock and scoring in beats for listen, play-along and wait modes |
| `src/synth.ts` | `renderTine`: frequency → mono samples (decaying sine modes, 2nd mode at 6.267×) |
| `src/keymap.ts` | `KeyboardEvent.code` → tongue place, in the standard tuning's pitch order: `Z`…`/` then `A`…`'`; retuning never moves a key |
| `src/kalimba-view.ts` | edge: draws the tongues, maps pointer and keyboard input to `Plucker.pluck`; relabels retuned tongues; retune mode turns taps into `onRetune` |
| `src/audio.ts` | edge: `WebAudioPlucker`, one voice per tongue, damps on re-pluck, limiter on the master |
| `src/practice/practice-view.ts` | edge: song, mode, tempo (BPM) and transpose controls; Retune toggle (tap cycles ♮ → ♯ → ♭), Reset tuning, tuning summary; song box with name, tab tuning (writes a `key:` line) + Import (adds to the song list, this session only); status, skipped text, errors; kalimba with targets |
| `src/practice/highway.ts` | edge: canvas lane per tongue, notes falling onto the bridge |
| `src/songs/index.ts` | built-in songs, public domain only |
| `src/main.ts` | wires practice view, audio and the animation frame loop; loads and saves the tuning in localStorage |

Tests live in `test/`. The view tests run in jsdom with a fake plucker and no highway. `audio.ts`, `highway.ts` and drag-to-strum have no automated tests; they are checked by playing.

## Songs

Built-in songs are public domain. Copyrighted songs, such as C418's Minecraft music, are not transcribed into the repo: players paste their own tab into the song text field.

## Rule overrides
- none yet
