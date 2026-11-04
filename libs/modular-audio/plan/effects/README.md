# modular-audio/plan/effects

The effects as templates: Utility, Filter, Limiter, Delay, Tape delay and Reverb, each a YAML file, its comments the reasons. The Tape delay is built on the Delay (`extends: Delay`), only its wobble written. Handed to the planner with their form; an owner's or a desk's presets are values and settings on them, by address.

Depends on: `base/util`, `modular-audio/plan/blocks`, `modular-audio/plan/format`, `modular-audio/plan/planner`.

Its face, `index.ts`, is the form alone; the six templates are its content, `content.ts`, imported apart, so a desk's forms load no YAML.

```ts
import { EFFECT_FORM } from './index.ts';
import { EFFECT_TEMPLATES } from './content.ts';
import { Planner } from '../planner/index.ts';
const planner = new Planner(EFFECT_TEMPLATES, [EFFECT_FORM]);
planner.plan('Delay', { name: 'delay', values: { note: '1/4', feedback: 0.6, tone: 1600 } });
planner.plan('Utility', { name: 'utility', settings: { 'pan/law': 'pan pot' } });
```

Each effect's params are macros by the names a desk keys them (`utility/level`, `delay/note`), so the recorded lanes keep their names. A macro writes no spec where its target has one: it takes its first target's under its own name.

An insert is an effect on a channel, a return or the master: the same device on any strip, as an Ableton audio effect is, exactly one kind of each. A device view draws every insert alike from its params, each in its own units, so an insert on any strip is the same module with its own values.

An insert's macros carry their hints, written in its template, and an effect is named by its label where it isn't its kind: the Filter as `LP filter`, the Tape delay as `Tape delay`, its own over the Delay's none.

| Effect | Inside | Its macros | Its settings |
|---|---|---|---|
| `Utility` | a gain into a pan | level, the gain's, the fader's in dB; pan | `pan/law`: stereo, or a pan pot |
| `Filter` | a filter | cutoff, the filter's frequency; q, its resonance, flat (0.707) to start | `filter/type`, `filter/slope` |
| `Limiter` | a limiter | gain 0 dB, ceiling -0.3 dBFS, release 0.3 s, Ableton's | |
| `Delay` | a delay line into a lowpass, the lowpass back into the line through a gain | sync, note, ms, the line's; feedback and tone, their specs its own, feedback 0.45, tone 2400 Hz to start | `line/longest` |
| `TapeDelay` | the Delay's, and its wobble: a slow oscillator, its depth a gain, into the line's time by its ms, moving it in seconds | the Delay's; rate 0.5 Hz, depth 0.004 s, 4 ms either way | the Delay's |
| `Reverb` | a room | | `length`, its own, the room's (`room/length`) |

| Export | What it does |
|---|---|
| `EFFECT_TEMPLATES` | The six, read from their YAML as `content.ts` loads, each checked for its shape as it loads (`templateOf()`) and frozen (`content.ts`). |
| `EFFECT_FORM` | What every effect is: one input and one output, its children free of roles (`form.ts`). |

Tests: `test/effects.test.js`: the six planned, their macros by the names a desk keys them, each at its default, the Utility's level the fader's in dB, each effect's label and its macros' hints, and the settings.
