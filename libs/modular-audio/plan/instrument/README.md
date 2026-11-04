# modular-audio/plan/instrument

An instrument's templates and forms, its modules a synth's: a voice card, an architecture, made of modules, each a YAML file, its comments the reasons. A module is named as it is on a synth's panel and never as a block is; the note's sources are the voice card's macros. A patch is a preset on an architecture. An instrument is a pool of voices or a drum rack, and a file of instruments holds them.

Depends on: `base/params`, `base/util`, `modular-audio/plan/format`, `modular-audio/plan/planner`.

```ts
import { SYNTH_FORMS } from './index.ts';
import { MODULE_TEMPLATES } from './content.ts';
import { Planner, type WrittenTemplate } from '../planner/index.ts';

const sine: WrittenTemplate = {
  kind: 'Sine',
  form: 'architecture',
  outputs: [{ name: 'out', channels: 1 }],
  children: [
    { name: 'osc 1', kind: 'VCO', role: 'source' },
    { name: 'out', kind: 'Out', role: 'out' },
  ],
  wires: [
    { from: { node: 'osc 1', output: 'out' }, to: { node: 'out', input: 'in' } },
    { from: { node: 'out', output: 'out' }, to: { output: 'out' } },
  ],
  macros: [{ name: 'frequency', maps: [{ to: ['osc 1', 'frequency'], factor: 1, offset: 0 }] }],
};
const planner = new Planner([...MODULE_TEMPLATES, sine], SYNTH_FORMS);
planner.plan('Sine', { values: { 'osc 1/tune': 24 } }); // a voice card, two octaves up
```

A voice card is wired as a hardware synth's: its sources into its chain's stages, the stages into its one output, its modulators into the params of any module, a module's macro among them, as Ableton's macros take modulation. What multiplies is a gain in series, as a modular's VCAs: an FM's index after a gain the note's frequency sets, an envelope's velocity after the envelope, an LFO's depth as a share of the note's frequency through its scale. A ratio to the note is a tune in semitones, onto a detune in cents, as pitch adds where ratios multiply.

| Module | Its job | Inside | Its macros | Its settings |
|---|---|---|---|---|
| `VCO` | source | an oscillator into its level | frequency, the note's; tune (semitones, onto its detune); level; stop | `osc/wave` |
| `Noise source` | source | a noise through a filter into its level | level; cutoff, resonance; tune (onto the filter's detune, an offset from the keys); offset; stop | `noise/color`, `noise/loop`, `filter/type`, `filter/slope` |
| `LFO` | modulator | an oscillator into its depth into a scale | sync, note, hz, its oscillator's rate; depth, in its target's units; scale, 1, or the note's frequency | `osc/wave`, `osc/phase` |
| `FM` | modulator | an oscillator into a scale, the note's frequency, into its index | frequency; tune, its ratio; scale; index; stop | `osc/wave` |
| `Envelope generator` | modulator | an envelope into a gain its note's velocity sets | gate, the note's; delay, attack, hold, decay, sustain, release; amount, in its target's units; velocity | `envelope/mode` |
| `VCA` | stage | a gain an envelope moves into its level | gain, open at 1, at 0 where an envelope opens it; level | |
| `VCF` | stage | a filter | cutoff, resonance; tune (onto its detune, a sweep in semitones, an offset from the keys) | `filter/type`, `filter/slope` |
| `Tremolo` | stage | a gain an LFO moves | gain | |
| `Ring` | stage | the sound into a gain at 0, an oscillator moving it | frequency; tune; stop | `osc/wave` |
| `Out` | output | its volume, then the note's own (MIDI 2.0's per-note #7) | volume, note volume | |

| Export | What it does |
|---|---|
| `NOTE_SOURCES`, `NoteSource`, `OWN_NOTE_VALUES` | A note's sources into a voice, as a voice card's CV, each a param's spec: frequency, gate, velocity, volume, bend and the per-note controllers by MIDI's names, at their default where a note sends none. `OWN_NOTE_VALUES` are the note's own values, as a test note sets them (`note.ts`). |
| `NOTE_SETTINGS` | The note's settings: the time constant a later pitch glides by, its shortest, and its longest, 0 for none (`note.ts`). |
| `ARCHITECTURE_FORM`, `INSTRUMENT_FORM` | What a voice card is: sources, modulators, stages and its one output, by role, no loops, every way out ending in its output. An instrument's form is its voices, each of the architecture's form, each into its one output (`architecture-form.ts`). |
| `SOURCE_FORM`, `MODULATOR_FORM`, `STAGE_FORM`, `OUTPUT_FORM`, `SYNTH_FORMS` | A module's form by its job, its jacks. `SYNTH_FORMS` are the synth's forms, the architecture's then its modules' (`architecture-form.ts`). |
| `instrumentOf(kind, chains, architectures)`, `Chain` | An instrument's template: one chain with no key makes a pool of voices, each a copy of its voice card. Chains with keys make a drum rack, a pool for each pad, played by its key (`instrument.ts`). |
| `changesFrom()`, `Changes` | A preset changed on the same architecture: each value and setting that differs, by its address, one let go back to the architecture's start (`preset.ts`). |
| `PresetMessage`, `edited()` | What's asked of a bank's patch by its name, as a bus carries it: `preset edited` sets a value or a setting by its address, `preset reset` puts it back where it started. `edited(preset, message)` makes a new preset, the one handed in left alone (`preset.ts`). |
| `instrumentsOf(data, source, modules)`, `Instruments`, `RackPad` | A file of instruments read as a person writes it: the instruments by their names, the patches (each the instrument it plays, as a preset), the racks (each pad a key and a patch). Its shape is checked as it loads, every failure under the file's name (`instruments-file.ts`). |
| `LiveBank` | A bank's patches as they play, a synth's edit buffer: each a live copy of its start, `edit(message)` setting a value or a setting or resetting the patch, each change told (`live-bank.ts`). |
| `MODULE_TEMPLATES` | The ten modules read from their YAML, each checked for its shape as it loads and frozen; imported apart from `content.ts`. |
| `cardPlanner()`, `patchPlan()`, `chainsOf()` | `cardPlanner(instruments, more)` is the planner of voice cards. `patchPlan(name, instruments)` plans a patch's instrument from a file by its name, a pool of voices or a drum rack; `chainsOf()` gives its chains, each with its key (`patch-plans.ts`). |
| `TestNote`, `TestNoteMessage` | A test note, its pitch, velocity, time and own values; pressed on a key's instrument or let go, as a message on a bus (`test-note.ts`). |

The instruments a theme plays are its own file of instruments (`themes/`), read by `instrumentsOf()`; this library has none.

Tests: `test/voice-cards.test.js`, `test/instrument.test.js`, `test/instruments-file.test.js` and `test/patch-plans.test.js`, on the tests' voice card and file of instruments in `test/pluck.js`.
