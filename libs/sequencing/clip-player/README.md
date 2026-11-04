# sequencing/clip-player

The clip player, as Ableton's session view holds and plays clips: tracks of clip slots, each slot holding a clip, a pattern of notes. A clip launched from its slot plays on its track, one a track, looping on the grid or once from the next beat. Its notes are sent into the input a control surface plays into, so they reach their instrument and the stream as a played note does. No DOM: its port and its view model are the views' (`libs/modular-audio/view/tracks/`).

Depends on: `base/util`, `midi/protocol`, `sequencing/clock`, `sequencing/midi-sequencer`, `sequencing/sequencer`.

```ts
import { ClipPlayer } from './index.ts';
const clips = new ClipPlayer({ input: sequencer, grid: clock.grid });
clips.put(bassSlot, { to: { track: 'bass', clip: bassSlot, live: false }, pattern: BASS, transpose: -12, straight: true });
clips.launch(bassSlot); // looping on its track from the next 16th
clock.onStep((i, t) => clips.step(i, t)); // every playing clip's notes due in the 16th i sent on
```

How a clip plays:

1. `launch(slot)` plays the slot's clip on its track in place of what the track played. Its notes carry a fresh region, one while it loops, as the recorder tells one launch from another.
2. Each 16th, `step()` sends on every playing clip's notes due there, in the order the clips were launched. The looping and when each note comes due are the sequencer's `ClipLauncher`.
3. Each note goes with its note on and its note off together, its length known as it starts, a fresh index each, the player one source (note rotation).
4. A clip's notes are pitches, transposed by its semitones as it's launched. A step of a scale is the Scale device's.

| Export | What it does |
|---|---|
| `new ClipPlayer({ input, grid })`: `step()` | The clips playing, one a track, their notes sent into `input`, the sequencer's `Input` (`player.ts`). |
| `Clip`, `ClipNote` | A clip: `to`, an address on the input; its `pattern` of notes; `transpose`, `straight` (under the grid's swing or on it) and `once`. `velocity()` is read as each note comes due, full if it has none, none leaving the note out. A `ClipNote` has a `pitch`, its `part`, its per-note `values` as it starts and a held note's `glides` (`player.ts`). |
| `Clip`'s lending: `lend()` | For a clip played once, the track its owner lends it as it starts, for its span, handed its own address (`player.ts`). |
| `ClipPlayer`'s slots: `put()`, `remove()`, `slotsOn()`, `clipIn()` | A clip put in its slot, in place of the one it held, a slot known by whatever its owner gives; a slot emptied, its clip stopped where it plays; a track's slots in the order they were first put; a slot's clip, none where it's empty (`player.ts`). |
| `ClipPlayer`'s launching: `launch()`, `stop()` | An empty slot launches nothing. Launched `from` a 16th not stepped yet, as Ableton's launch quantization has it, the clip waits for it while what its track plays plays on. A later launch on the track takes its place; a stop or an emptied slot lets it go (`player.ts`). |
| `ClipPlayer`'s reading: `playing()` | Whether a slot's clip plays as of the last 16th: one played once until its last note ends, or as long as its track is lent; a looping one until it's stopped; a queued one not yet (`player.ts`). |
| `ClipMessage` | What's asked of a clip in its slot, on a bus: `clip launched`, its slot's clip played on its track; `clip deleted`, its slot's clip gone, its owner's to say what goes with it (`messages.ts`). |

Tests: `test/player.test.js`, a launched clip's notes as they come due, round its loop, on the swing or straight, at its velocity; the slots; a clip played once on a lent track; a launch queued for a 16th to come.
