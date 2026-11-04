# base/params

A param as a plugin describes its own, apart from any view: its name, unit, range, choices and default, and where its value lies on a control, a lane or a MIDI controller (its taper).

Depends on: `base/util`.

```ts
import { positionOf, valueAt, type ParamSpec } from './index.ts';
const level: ParamSpec = { name: 'level', range: [-60, 6, 0.1], dB: true, taper: 'fader' };
positionOf(level, 1); // 2/3: unity two thirds up, by the fader law
valueAt(level, 1); // 2: a gain of 2, +6 dB at the top
```

| Export | What it does |
|---|---|
| `ParamSpec`, `ParamSpecs`, `RangedSpec`, `Taper` | A param's spec; a module's or a part's specs by key, a nested part's under its own; a spec with its range; how a position maps to a value: `fader`, `octaves` or `line` (`spec.ts`). A spec with `glides: false` is set at its time, as a delay line's time. |
| `specAt()`, `isParamSpec()` | A value's spec by its path; whether specs are a param's, not a part's (`spec.ts`). |
| `choiceAt()`, `choiceIndex()`, `atItsTime()` | A choice by its index, as a controller carries it, and back; whether a change is set at its time, not glided: a switch, a choice, a param that never glides (`spec.ts`). |
| `positionOf()`, `valueAt()` | A value's position on a knob, a lane or a CC, 0 to 1, by the param's taper, and back. A param with choices gets a step each (`taper.ts`). |
| `faderGain()`, `faderPosition()` | The fader law: a position to its gain by dB, unity two thirds up with a top of 2, the bottom silence; and back (`taper.ts`). |
| `gainOf()`, `dBOf()`, `SILENCE` | A gain in dB and back; the floor of silence, -80 dB (`decibels.ts`). |
| `FADER_GAIN`, `PAN`, `SWITCH` | The specs the libraries share, each spread into a copy under its own name (`standard-specs.ts`). |
| `isSwitch()` | Whether a param is a switch, off 0 or on 1, whatever its name (`standard-specs.ts`). |
| `STRIP_PARAMS`, `SEND_PARAM` | A channel strip's own params: volume by the fader law, pan, mute and solo; a send's amount, 0 until turned up (`strip.ts`). |
| `Time`, `FreeUnit`, `TimeSpecs`, `NOTE_VALUES` | A time with a sync switch, as Ableton's: synced, a note value following the tempo; free, in ms or Hz. Both are kept, the switch choosing. `NOTE_VALUES` are shortest first, a 16th triplet to a dotted half (`time.ts`). |
| `timeSpecs()`, `timeParamsIn()`, `TimeParams` | A time's three params, `sync`, `note` and its free one, declared side by side, the free one by octaves; the three found among a part's keys (`time.ts`). |
| `timeSeconds()`, `noteValueBeats()`, `freeAt()` | A time in seconds by a beat's length; a note value in beats; the free value where a synced note is at a beat, so switching sync off changes nothing heard (`note-values.ts`). |

Tests: `test/specs.test.js`, `test/taper.test.js`, `test/time.test.js`, `test/note-values.test.js`.
