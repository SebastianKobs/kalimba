# sequencing/midi-sequencer

The MIDI sequencer: the input a control surface plays into, which alone plays the instruments; the stream every play goes through; the recorder, what's heard kept as regions and lanes; and the recording player. Its messages are MIDI 2.0's channel voice messages as values, each note a fresh index. Pure: no Web Audio. Why it's built so: `mockup/architecture/sequencer.md`.

Depends on: `base/automation`, `base/util`, `midi/protocol`, `sequencing/clock`, `sequencing/sequencer`, `sequencing/timeline`.

```ts
import { Recorder, Sequencer } from './index.ts';
import { NoteRotation } from '../../midi/protocol/index.ts';
const t = 1;
const now = 2;
const sixteenth = 0.125;
const recorder = new Recorder();
const sequencer = new Sequencer({ tracks: (name) => ({ role: name, receive: (messages) => console.log(name, messages) }) }); // a track: its role, and where its messages go
sequencer.onPlay((play) => recorder.heard(play)); // every play it passes on, into its own stream
sequencer.onNote((to, note) => console.log(to.track, note.noteOn.part)); // the way back: each note as it's passed on
const rotation = new NoteRotation();
const index = rotation.noteOn(); // a fresh index for the note
sequencer.send({ track: 'tap', clip: { kind: 'tap' }, live: true }, [ // to its instrument at once, and into the stream
  { type: 'note on', index, pitch: 62, velocity: 1, t, part: 2 },
  { type: 'per-note controller', index, controller: 'volume', value: 0.4, t: now }, // how it's heard as it starts
  { type: 'note off', index, t: t + sixteenth }, // its length known as it starts: sent with it
]);
recorder.regions(now); // what was heard, as regions
```

How a play goes through:

1. A control surface calls `send(to, messages)`. The track's instrument gets the messages at once, a function call with no latency added, each note on an index of the track's own.
2. The messages go into the stream as the play they make. Whatever holds anything heard is a play, a note's per-note management alone is not.
3. Each note, and each note off sent after its note, is handed back to whoever listens, as Ableton lights a controller's pads.
4. The recorder keeps every play it hears as regions and lanes on the timeline, as Ableton records its session into its arrangement. The recording player plays them back through the input.

| Export | What it does |
|---|---|
| `new Sequencer({ tracks })`: `send()`, `onPlay()`, `onNote()`, `onNoteOff()` | The input. `tracks(name)` looks a track up by its name, as a replay track is made the first time it's played on. A sender's notes reach a track by an index of its own, so two senders' notes of one index don't meet there (`input.ts`). |
| `Input`, `SentTo`, `Track`, `NoteListener`, `NoteOffListener` | What a control surface plays into: `send()`, `onNote()` and `onNoteOff()`. `SentTo` is where messages go: the `track`, the `clip` they're of, whether they're `live`, what the stream carries beside the notes, and the `source`. A `Track` is a `Receiver` with its `role` (`input.ts`). |
| `Sequencer`'s monitoring: `monitor()` | A sender's input monitoring, as a DAW's: `monitor(source, on, t, fade)`. Off from `t`, its held notes are hushed to 0 by per-note volume gliding by `fade`, and its new notes and controllers are dropped. On, each held note returns to its last volume. The hush isn't recorded (`input.ts`). |
| `Play`, `PlayedNote`, `PlayListener` | The stream, each sequencer's own. A play is `{ owner, kind, role, live, notes, … }` with its `region`, a number its source hands out; each note has its pitch, velocity, per-note controllers, glides and `index`. Later `ends`, `changes` and a track's `controls` are plays of their own, by that index (`stream.ts`). |
| `PatternNote`, `NotePattern`, `phrases()` | A pattern's note: pitch, step, phrase, vibrato; a pattern of notes with its rhythm's shape and vibrato; a record's whole phrases, 1 up to all of them (`pattern-note.ts`). |
| `new Recorder({ song })`: `heard()`, `leaveOut()`, `regions()`, `lanes()`, `toData()`, `load()`, `empty()` | What was heard, the last 30 minutes of song time in memory. A play carries clock times, as it's scheduled, and `heard()` turns each into song time through `song`, a `TimeMap` (none: the clock's time is song time), so a hold leaves no gap; everything the recorder hands out or is asked, `regions(now)` and the rest, is song time. A play with no region of its own becomes one; one marked `unrecorded` is left out, and so is one `leaveOut(fn)` says, as the transport does for a surface's notes while the arrangement plays back (`recorder.ts`). `toData(now, nameOfClip?)` hands the recording out, to song time `now`, as plain data, each clip by the name `nameOfClip(region)` gives it, an id where it's not handed, `load(data)` puts it into an empty recorder (`recording-data.ts`), and `empty()` makes it one. |
| `Region` | A region from its first note to the end of its last: its element, clip, kind, role, track by `trackName` and its notes. A held note is open until its note off comes; one still held as the next region begins is carried into it (`recorder.ts`). |
| `shiftedRecording()` | A recording's data moved by an offset, a copy: every time later by it, so a recording made on one timeline lies on another's; lengths, glide time constants and open ends stay (`recording-data.ts`). |
| `RecordingData`, `RegionData` | The recording as plain data, JSON-safe: a `version` from 1, where it `begins` and `ends`, its `regions` and its `lanes`, times as recorded, in song time. A region's element and clip are ids, one per element, its notes keep their own lanes and a held one its open end; an open `until` is `'never'` (`recording-data.ts`). |
| `Lane` | A track's controller kept as automation: its kind, track, `trackName`, controller and points `{ t, value, glide }` in time order. A point that changes nothing is thinned once it's a second past (`track-lanes.ts`). |
| `laneValueAt()`, `lastValueAt()` | A lane's value at a time, as its points play as automation, a glide's where it had got to; its last point's value by a time, a glide's curve not followed (`lanes.ts`). |
| `new RecordingPlayer({ input, skip })`: `play()`, `due()`, `stop()`, `leave()`, `finish()`, `position()`, `endsAt()`, `ended()` | The recording played back, as Ableton plays its arrangement, on the timeline's `Player`: from a song time `from`, heard at clock time `at`. Each note and lane goes to the track it was recorded on by `trackName`, marked `playback` (`recording-player.ts`). |
| `RecordingPlayer`'s ends | `stop()` lets go what sounds and leaves the lanes. `leave()` puts them back and lets go what sounds. `finish()` puts them back and lets what sounds ring out. A lane `skip(track, controller)` names, moved by hand, is passed over (`recording-player.ts`). |

The recording is in song time, so the player has no holds to play past. A note sounding at `from` is chased, started at once with its pitch and per-note controllers as they were then.

Tests: `test/input.test.js`, `test/recorder.test.js`, `test/recording-data.test.js`, `test/playback.test.js`, `test/lane-playback.test.js`, `test/lane-values.test.js` and `test/pattern-note.test.js`.
