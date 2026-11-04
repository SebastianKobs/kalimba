# modular-audio/build/instrument

MIDI's notes played into an instrument: its voices juggled on what's built. It's a `Receiver` handed the instrument's plan, what's built of it and the time now. It makes no sound: what's built makes the sound, the plan says what each note sets. Each note is a voice, a copy of its pool's voice card.

Depends on: `base/automation`, `base/params`, `base/util`, `midi/protocol`, `modular-audio/build/contract`, `modular-audio/plan/blocks`, `modular-audio/plan/format`, `modular-audio/plan/instrument`, `modular-audio/plan/planner`, `music/music-theory`, `sequencing/clock`.

```ts
import { noteMessages } from '../../../midi/protocol/index.ts';
import type { Built } from '../contract/index.ts';
import type { Plan } from '../../plan/format/index.ts';
import { Voices } from './index.ts';

declare const built: Built;
declare const plan: Plan;
declare const context: BaseAudioContext;
const voices = new Voices(built, plan, () => context.currentTime, () => ({ 'voice/decay': 0.6 })); // the voice card's own values
voices.receive(noteMessages({ pitch: 69, velocity: 0.8, t: 2, duration: 0.5 }, 0)); // a voice added at 2 s, its gate opened, closed at 2.5 s
voices.edit({ 'voice/cutoff': 900 }); // glided on every voice of its card that sounds
voices.rebuild(plan); // a change of structure while notes sound
```

How it plays a note, in order:

1. A note on adds a copy of its pool's voice card at its time (`Built.add()`), a drum rack's pad's by its key, none where no pool plays it.
2. Its note's sources are set by the pool's addresses as it's added, before it sounds: its frequency, its velocity and the per-note controllers sent with it, its gate opened last.
3. Its glides are glided by the voice card's `glide`, a jump with none. A note is held until its note off, closed at the card's `longest` only where the card has one.
4. A note off closes its gate at its time, no sooner than the card's `shortest`, and stops its sources by when it's silent, where that's known then (`Built.stopBy()`).
5. A voice is let go once it has rung out, as the next messages come, or at once where its sender detaches its note.

A voice has rung out, worked out from its voice card's plan as a synth stops a note's sources (`silence.ts`):

1. A gain resting at nothing, opened only by envelopes, closes once they have all faded, what's built saying when each has (`Built.faded()`); an LFO opens one too, and never closes it.
2. A block is silent from where a gain it feeds closes, or as late as the latest of where its sound goes, followed across composites and through macros. The voice's own output never is.
3. A source nothing closes is silent as its note's last envelope fades: a gate's release, or a trigger's run, which goes on past the note off.
4. A stage with a tail, a delay or a reverb, sounds on past its input (its block's `tail`, `libs/modular-audio/plan/blocks/`).
5. The voice has rung out once every source is: an oscillator, a noise, an envelope.

| Export | What it does |
|---|---|
| `new Voices(built, plan, now, own?, polyphony?)`: `receive()`, `input()`, `edit()`, `rebuild()`, `sounding` | MIDI's notes played into an instrument's plan on what's built. `input(into)` gives an input of its own, its notes kept apart, each voice into what `into()` gives; at most 16 voices sound unless handed another, the oldest taken over (`voices.ts`). |
| `new Instrument(making)`: `receive()`, `input()`, `plays()`, `tempo()`, `edited()`, `sounding`, `patch` | One instrument playing one patch from a file of instruments, built by the builder handed in, its messages moved onto what's built's time. An edit of its patch is glided where its settings are the same, else built again (`instrument.ts`). |
| `InstrumentMaking` | What an instrument is made with: the file of `instruments`, its `patch`, the `builder`, `into`, `now` and `at`, optional `cardValues` and `polyphony` (`instrument.ts`). |
| `new SoundModule({ instruments, bank })`: `part()`, `controlOf()`, `sounding()`, `tempo()` | A multitimbral sound module. `part(patch, making)` makes the part for a patch the first time it's asked for and keeps it, so every track playing the patch plays into it; an edit in the bank reaches every part that plays it (`sound-module.ts`). |
| `PartMaking` | What a part is made with: an instrument's making without its file and its patch (`sound-module.ts`). |
| `new InstrumentAutomation({ bank, clock, controlOf })`: `control()` | The instrument's automation, fitted to its bank as the desk's is to the desk. `control(patch, controller)` holds a patch's value or setting on the clock's cues until its time, then sets it as the bank's edit (`instrument-automation.ts`). |
| `new InstrumentSurface({ bank, clock, input, track, controlOf })`: `edit()`, `onControl()` | The instrument's control surface. `edit(message)` plays a knob moved by hand into the sequencer as a controller on the patch's own track, gliding unless it's a choice, a switch or a time; a reset goes to the bank at once, not recorded (`instrument-surface.ts`). |
| `new TestNotes({ instrumentFor, phrase })`: `play()`, `hear()` | A device view's test note: an input of its own on its role's instrument for each key, played straight into it, never through a sequencer, so never recorded. `play(key, note)` holds a note at most 30 s until its `HeldTestNote` is released (`test-notes.ts`). |
| `HeldTestNote`, `PhrasedTestNote` | A test note as it sounds, let go as its button is; a test note as it's phrased, with its length (`test-notes.ts`). |

Tests: `test/voices.test.js`, `test/instrument.test.js`, `test/sound-module.test.js`, `test/test-notes.test.js`, `test/instrument-automation.test.js` and `test/instrument-surface.test.js`, on a stand-in for what's built in `test/built.js`.
