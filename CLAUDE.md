# kalimba

Playable browser prototype of a 21-tongue kalimba in C major, in HTML and TypeScript. The interface is in German; code, comments and tests are in English. Note names are international: B is the German H, Bb the German B.

The tongue layout comes from `kalimba.jpg`, a hand-drawn card. Rotate the photo 90° clockwise from its EXIF-corrected orientation to read it.

@.githooks/rule-based-commit-logging/claude-rule.md

Log entries also carry the date: ``- `pending` 2026-11-04 LABEL: **Decision or change:** reason.``

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm test` | Vitest: the unit tests, in node and jsdom |
| `npm run test:e2e` | Playwright: the sound rendered offline in Firefox, muted, and measured (`test/e2e/`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | typecheck, then production build into `dist/` |
| `npm run update-libs` | copy stim-garden's libraries into `libs/` again (`tools/update-libs.sh`; `COMMIT=…` for another commit) |

Enable the commit hook once per clone: `git config core.hooksPath .githooks`.

## Libraries from stim-garden

The sound is built with stim-garden's modular-audio libraries, and a song plays on its clock and clip player (`sequencing/`), copied into `libs/` from the commit in `libs/PINNED` by `tools/update-libs.sh`, with the YAML loader they need (`tools/yaml.js`, `types/yaml.d.ts`).

- They are external, like a dependency: never edited here, their tests neither copied nor run; stim-garden tests them. A change is made in stim-garden and copied.
- They import with `.ts` extensions and need ES2023 (`tsconfig.json`); `.yaml` files load through the Vite plugin.

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
| `src/tuning.ts` | `tongueNumber` (`4̣`, `4`, `4′`, `2″`, as tabs write them), `describeTuning` ("Tuning: Standard C with 4′ raised from F to F#"), `engravedTuning` (the same, short, a line per change: `4̣ 4 4′  F → F#`; past three changes, two and `+ n weitere`) |
| `src/stored-tuning.ts` | `parseStoredTuning`: validates the tuning read back from localStorage |
| `src/music/notation.ts` | `parseSong`: song text or pasted kalimba tab (letters or numbers; `'` `′` `*` `°` `″` `”` dot above/below as octave marks; `( )`/`[ ]` group notes played together, a `-` after a note holds it a beat longer, also glued: `2-4`; jianpu durations) → notes in beats; a number plays its tongue as retuned (unless a `key:` line decides), a letter is a pitch; skips and lists what it can't read (lines mostly not notes are skipped whole); `SongTextError` only when no notes are left; each note keeps its `source` range in the text; `tempoOf`, `titleOf`, `meterOf` |
| `src/music/key.ts` | `keySignature`: key name (G, Bb major, Em) → which letters are raised or lowered; `key:` lines in song text |
| `src/music/arrange.ts` | `arrange`: any song onto any tongues: best transposition, octave folding, skipped notes; `transposeOptions`: the shifts worth offering, best first |
| `src/music/interval.ts` | `describeShift`: semitones → "down a fifth (7 semitones)" |
| `src/practice/metronome.ts` | `clicksBetween`: the beats the clock passed, first of each bar accented |
| `src/practice/session.ts` | `PracticeSession`: clock and scoring in beats for listen, play-along and wait modes; `currentNotes` for highlighting the text |
| `src/sound/kalimba.yaml` | the voice cards as a file of instruments: the tine (its modes at 1, 1.0017 (a twin detuned by its tune), 2, 3, 5, 6.5 and 17.3 times the note; the dirt: 7th and 9th harmonics a few Cent sharp and a noise band at the 8th partial, fading fast; levels as measured on a Thomann Sun Kalimba's sound demo, a noise click (from anywhere in its noise, so a chord's clicks add up as separate thumbs; its envelope driven by the per-note `brightness`), a 240 Hz box knock, each group through a VCA its envelope opens, all but the click through a lowpass at 3500 Hz) and the metronome click; patches `kalimba` and `click` |
| `src/sound/kalimba-card.ts` | the file read (`KALIMBA`); `decayTimeFor`: a note's decay time by its pitch, ~4.2 s to −60 dB at C4 (as the demo rings) |
| `src/sound/plucks.ts` | `Plucks`: a pluck as MIDI 2.0 messages (note on, decay time, the click's strength as per-note `brightness` (its velocity ±`CLICK_SPREAD_DB`, 2 dB, a draw per pluck), note off once rung; a ringing tongue's earlier note let go: damped), shaped by Stimmung and Nachklang; `clickMessages` |
| `src/sound/kalimba-sound.ts` | edge: `KalimbaSound`, the whole sound in one context, for the player and the offline render alike: the tine and click `Instrument`s, the plucks, the resonance bank, a send into the room (the click stays dry) |
| `src/sound/room.ts` | `roomPlan`: a small room of 1.5 s, stim-garden's Reverb effect (`libs/modular-audio/plan/effects`) |
| `src/sound/resonance.ts` | `resonatorsFor`: every tongue as a resonator at its pitch as tuned (and moved by Stimmung), its Q from the tongue's ring time; `excitationFor`: how hard a pluck knocks each one, its neighbours on the bridge most, the octave and the fifth above it wherever they are, itself not at all |
| `src/sound/resonance-bank.ts` | edge: `ResonanceBank`, a narrow bandpass per tongue, each knocked by a pluck's impulse as hard as it's coupled: the other tongues ringing along |
| `src/sound/klang.ts` | the Klang panel's macros (Obertöne, Ungerade Obertöne, Rauheit, Helligkeit from 3500 Hz, Anschlag, Körper, Schwebung, Resonanz, Hall, Stimmung, Nachklang): `presetFor` maps them onto the voice card's values (read from `kalimba.yaml`), `pitchOffset` and `ringFactor` onto each pluck, `resonanceGain` onto the resonance bank, `hallGain` onto the send into the room; stored in the browser under `kalimba.klang.3` (`parseStoredKlang`); every level macro at 100 % is the sound as tuned by ear |
| `src/sound/klang-panel.ts`, `.css` | edge: the Klang panel as a drawer built into the kalimba (mounted in its stage, behind the body): shut, only its metal pull shows under the belly; pulled, its front, bowed as the belly, slides out and the sliders behind it (animated, not with reduced motion; shut, its sliders hidden and out of Tab's reach), a German slider for each macro (a double-click puts one back) and a reset |
| `src/sound/player.ts` | edge: `ModularPlayer`, the audio context started on a gesture, master gain into a limiter; a pluck by hand at once, with a slightly random velocity; a song's notes and clicks at their own times (`pluckAt`, `clickAt`, for the song player); `setKlang` glides the kalimba to new macros |
| `src/keymap.ts` | `KeyboardEvent.code` → tongue place, in the standard tuning's pitch order: bottom letter row then home row (QWERTZ `Y`…`-`, `A`…`Ä`); retuning never moves a key |
| `src/kalimba-view.ts` | edge: draws the tongues, maps pointer and keyboard input to `Plucker.pluck`; relabels retuned tongues; a tap on a tongue's end (above and under the brass bridge) is `onRetune`, not a pluck; a brass screw on the body under the short tongues resets the tuning (`onResetTuning`), live only while a tongue is retuned; the tuning inlaid in the wood across from it, short, pale on the grain (the whole sentence as its tooltip and for a screen reader) |
| `src/practice/practice-view.ts` | edge: Spielen as one row (song, mode, transpose; tempo in BPM, Takt (meter, 4/4 default; `meter:` line sets it), Klick, Stopp, Start), so the kalimba fits a laptop screen; under it status and Liedtext bearbeiten (the tuning is on the kalimba: a tongue's end tapped cycles ♮ → ♯ → ♭, the screw on the body resets); a strip of two lines with the song text, read-only, from its first notes, highlighting the part being played; the text edited in an overlay (opening it stops the song) with name, tab tuning (writes a `key:` line) + Import (adds to the song list, this session only; done, the overlay shuts; a reason not to shows in it) and the format's help as an overlay of its own (short sections, an example beside its meaning); skipped text, errors; kalimba with targets; listening and playing along, the song player keeps the time, the click and (listening) the notes, the session follows its beat; waiting, the frames keep time |
| `src/practice/song-clip.ts` | `songClip`: the arrangement as a clip played once, in ticks, each note's tongue as its part; `songPlacement`, `placeOf`, `beatAt`: the song on the clock's grid of 16ths, started on a beat a lead-in ahead, and back |
| `src/practice/song-player.ts` | edge: `SongPlayer`, a song as stim-garden's clip player plays a clip: the clock hands out each 16th a little ahead, the notes due in it plucked at their times on the audio's clock (`ScheduledSound`), so each voice is built before it sounds; the click on the song's beats; `beat()`, where the song is; listening and playing along |
| `src/practice/highway.ts` | edge: canvas lane per tongue, notes falling onto the bridge |
| `src/songs/index.ts` | built-in songs, public domain only |
| `src/style.css`, `src/wood-grain.svg` | the look: colour tokens on `:root` (Waldboden · Rosenrot · Rostkirsche: dark forest green, rose red for what to press, the kalimba in rust cherry with brass), read by the highway too; the wood's grain, an SVG noise stretched along the board, under a few grain lines and a sheen |
| `src/main.ts` | wires practice view, audio, the song player and the animation frame loop; loads and saves the tuning and the Klang in localStorage |

Tests live in `test/`. The view tests run in jsdom with a fake plucker and no highway. The sound is tested end to end in `test/e2e/`: `render.html` renders plucks offline through the same instruments as the player, `sound.spec.ts` measures pitch, ring and timbre against the demo's numbers (ring time, harmonics, the 6.5× ping), click (a chord's clicks as separate thumbs, no two alike, their spread), shimmer, harmonics, knock, damping, each Klang macro's effect, the other tongues ringing along, the room and the metronome; the tine's tests run dry (Hall 0); `song.spec.ts` plays a song live on a real-time context through the song player, the page busy each frame, and hears every note's click on its time (`render.ts`'s `liveSong`, recorded on the audio thread); `layout.spec.ts` checks the page fits a phone, the controls in one row with the kalimba on a 1280 × 800 screen, the song text's editor and the format's help opening over the page and shutting, a click through the bridge retuning a tongue and the screw resetting it, the engraved tuning on the wood and clear of the tongues with all of them retuned; `klang.spec.ts` checks the drawer hidden in the body, slides it open and shut, fits it at phone width and moves a slider. `player.ts`, `highway.ts` and drag-to-strum have no automated tests; they are checked by playing.

## Songs

Built-in songs are public domain. Copyrighted songs, such as C418's Minecraft music, are not transcribed into the repo: players paste their own tab into the song text field.

## Rule overrides
- none yet
