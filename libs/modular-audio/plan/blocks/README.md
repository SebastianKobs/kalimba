# modular-audio/plan/blocks

The building blocks: nodes with no inside, declared. Every builder meets the same contract: each block is built, or a placeholder is put in, its audio passed straight through, a source silent. Kept small and fixed, beside `plan/format`. It holds how an envelope moves.

Depends on: `base/automation`, `base/params`, `base/util`, `modular-audio/plan/format`.

```ts
import { BLOCKS, biquadQs, envelopeCurve } from './index.ts';

BLOCKS.oscillator.params.map((param) => param.name); // ['sync', 'note', 'frequency', 'detune', 'stop']
BLOCKS.oscillator.settings.map((setting) => setting.name); // ['wave', 'phase']
biquadQs({ type: 'lowpass', resonance: 0.707, slope: '24' }); // [0.541, 1.306]: two biquads in series
// the envelope's automation for a gate opened at 2 s and closed at 3 s
envelopeCurve({ delay: 0, attack: 0.01, hold: 0, decay: 0.2, sustain: 0.5 }, 1, { opened: 2, closed: 3, release: 0.1 });
```

Each block declares its kind, its inputs and outputs, and its params and settings as `base/params` declares a param, in short standard terms. A param is edited or automated as it plays; a setting is chosen as it's built, a change a rebuild. An input's or an output's channels are given where the block fixes them, elsewhere they're as they come.

| Kind | Params | Settings | In, out |
|---|---|---|---|
| `oscillator` | sync, note, frequency: its rate a time with a sync switch, free its frequency in Hz down to an LFO's; detune (cents, four octaves either way); stop (s from the note's start, 0 none) | wave: sine, triangle, square, sawtooth; phase: reset with each note, or free | none; out, mono |
| `gain` | gain, a share, shown in dB by the fader law | | in; out |
| `filter` | frequency (Hz, by octaves, wide open to start), resonance (Q, a plain ratio, 0.707 flat), detune (cents, a sweep or an offset from the keys) | type: lowpass, highpass, bandpass; slope: 12 or 24 dB an octave | in; out |
| `pan` | pan | law: stereo, pan pot | in; out, stereo |
| `delay` | sync, note, ms: a time with a sync switch; a signal wired into its ms moves its line in seconds, as Web Audio's does | longest (s) | in; out |
| `reverb` | | length (s) | in; out, stereo |
| `noise` | offset (s, the furthest into its buffer it starts, drawn as its voice starts), stop | color: noise, breath; loop: off, on | none; out, mono |
| `limiter` | gain (dB), ceiling (dBFS), release (s) | | in; out |
| `envelope` | gate, a switch; delay, attack, hold, decay (s, 0 to start); sustain (a share of the amount, 1 to start); release (s, 0.1 to start); amount (1 to start) | mode: the gate's, or a trigger's running on past the note-off, as Ableton's | none; out, mono |
| `select` | | input: a, b, the one passed on, the other going nowhere, as a console's PRE button picks where a send is taken | a, b; out |

How an envelope moves, as automation, as an ARP's: every stage is an RC curve (a resistor and a capacitor charging) done at its time, on numbers its caller resolved.

1. From its gate opening, after its delay, it rises from 0 to its amount over its attack, charging toward 1.3 times its peak and cut there at its time, as a comparator cuts it.
2. It is held over its hold, then falls to its sustain over its decay, approaching it to within the floor of silence at its time, so one drawn again from where it is never jumps.
3. From its gate closing, it falls from where its stages have it to 0 over its release the same way, and says when it has faded.
4. A stage with no time is set at once; with no delay and no attack it starts at its top.

| Export | What it does |
|---|---|
| `Block`, `Jack` | A block: its kind, its inputs and outputs (each a jack, its name and its channels where the block fixes them), its params' and settings' specs, and whether it sounds on after its input stops, a delay's echoes or a reverb's tail (`tail`) (`block.ts`). |
| `BLOCKS`, `BlockKind` | Every block by its kind, frozen all the way down: the list each builder checks itself against (`blocks.ts`). |
| `STOP` | A source's stop, in seconds from the note's start, 0 for none (`block.ts`). |
| `DELAY_TIME` | A delay's time, its three params: synced to an 8th to start, free up to 4 s, its free time never glided, as its pitch would bend (`delay.ts`). |
| `ENVELOPE_SPECS` | An envelope's knobs by name: its amount in its target's units, its stages' times, its sustain (`envelope.ts`). |
| `LIMITER_SPECS` | A limiter's gain, ceiling and release (`limiter.ts`). |
| `NOISE_SECONDS` | Each noise color's buffer length for a builder that plays it from a looping buffer: noise 2 s, breath 0.2 s (`noise.ts`). |
| `WAVE`, `DETUNE` | An oscillator's wave and its detune (`oscillator.ts`). |
| `FILTER_SLOPE`, `RESONANCE`, `biquadQs()`, `FilterStages` | A filter's slope and its resonance, Q as a plain ratio, 0.707 flat. `biquadQs({ type, resonance, slope })` gives the Qs of the biquads in series that build it: one at 12 dB an octave, two at 24, a 4th-order Butterworth's for a lowpass or a highpass (`filter.ts`). |
| `REVERB_LENGTH` | How long a reverb's tail is (`reverb.ts`). |
| `envelopeStages()`, `envelopeRelease()`, `envelopeCurve()`, `EnvelopeTimes` | An envelope's stages from its gate opening, its release from its gate closing and when it has faded, and its whole curve from a gate opening at a time, released where the gate has closed (`envelope-curve.ts`). |
| `CHARGED`, `DONE` | The time constants an attack takes to charge and a decay or a release takes to be done, for a test of any builder's curve (`envelope-curve.ts`). |

Tests: `test/blocks.test.js` and `test/envelope-curve.test.js`.
