# midi/protocol

MIDI 2.0's channel voice messages as values: the protocol alone, as a synth and a sequencer share it. The notes among them, each a fresh index, and what they're played into. So an instrument speaks MIDI without a sequencer. Pure: no Web Audio. Why the messages are MIDI 2.0's: `mockup/architecture/sequencer.md`.

Depends on: `base/automation`, `base/util`.

```ts
import { NoteRotation, notesIn, type Message, type Receiver } from './index.ts';
const rotation = new NoteRotation();
const index = rotation.noteOn(); // a fresh index for the note
const t = 0;
const sixteenth = 0.125;
const synth: Receiver = { receive: (messages) => console.log(notesIn(messages)) }; // an instrument, or a track
const messages: Message[] = [
  { type: 'note on', index, pitch: 62, velocity: 1, t },
  { type: 'per-note controller', index, controller: 'volume', value: 0.4, t }, // how it's heard as it starts
  { type: 'note off', index, t: t + sixteenth }, // its length known as it starts: sent with it
];
synth.receive(messages);
```

How a note is sent:

1. A source asks its `NoteRotation` for a fresh index, so two notes of one pitch keep apart.
2. Its note on goes out with its per-note controllers as it starts, and its note off too where its length is known.
3. A receiver takes the messages at once, each at its own clock time.

| Export | What it does |
|---|---|
| `Message` | Every message, a union by `type`; times are in seconds, a velocity 0 to 1 (`messages.ts`). |
| `NoteOn`, `NoteOff` | A note on: `{ index, pitch, velocity, t, part }`. A note off: `{ index, t }`, sent with its note on where its length is known (`messages.ts`). |
| `PerNoteController`, `PerNoteControllerName`, `PerNoteValues` | How a note is heard, by name and in its own units: `volume` (#7) a gain, `pan` (#10) -1 to 1, `brightness` (#74) a cutoff in Hz, `effects 1 depth` (#91) a reverb send's gain, `vibrato depth` (#77) in cents, `vibrato rate` (#76) in Hz, `breath` (#2) 0 to 1, `decay time` (#75) in seconds, `pitch` (#3 Pitch 7.25) a MIDI note number, so a held note glides. `rise` in seconds and `bend` in semitones are assignable ones (`messages.ts`). |
| `PerNoteManagement` | `{ index, detach: true, t }`: a note's per-note controllers detached once it has rung out (`messages.ts`). |
| `Controller` | `{ controller, value, t, glide }`: a track's parameter by its name, in its units, as its instrument maps it (`messages.ts`). |
| `NoteToSend`, `SentNote` | A note to send: pitch, velocity, time, part, length, its per-note values and glides. A note as its messages give it (`messages.ts`). |
| `noteMessages()`, `notesIn()` | A note's messages built once, and the notes read back from messages: its note on, its per-note controllers as it starts, its glides as #3 Pitch, its note off where the length is known (`messages.ts`). |
| `retimed()` | Messages on another clock, each one's time moved by its own, as an instrument on an audio context takes a sequencer's (`messages.ts`). |
| `new NoteRotation()`: `noteOn()`, `noteOff()` | A source's notes, each a fresh index, as MIDI 2.0's note rotation hands them out: in turn round the 128 note numbers, one still on passed over (`rotation.ts`). |
| `Receiver` | What messages are played into, with `receive(messages)`: an instrument, or a track, the sequencer's. Java Sound's name for it (`receiver.ts`). |

A change in a controller, a per-note one's too, carries how it moves there, as an automation point's curve: jumping at its time, or gliding from it by a time constant (`glide`). It is `base/automation`'s `TimedValue`.

Tests: `test/protocol.test.js`.
