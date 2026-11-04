# sequencing/sequencer

Patterns played on the grid, after Ableton's session view, for events of any kind. A pattern is a clip: its time signature, its length in bars, whether it loops, and its events. Pure: no Web Audio. It's given the clock's grid as functions, so a pattern placed again is always the same. Why it's built so: `mockup/architecture/sequencer.md`. Clips loop on tracks, and tracks come in pools.

Depends on: `base/util`, `sequencing/clock`.

The MIDI sequencer, with notes and their messages, the input, the stream, the recorder and the recording player, is on top of it (`libs/sequencing/midi-sequencer/`).

```ts
import { ClipLauncher, TrackPool, patternOf, upcoming } from './index.ts';
const next = upcoming(patternOf(record, cycle), at, 3); // a record's next three events from a place, round the loop
const pool = new TrackPool();
const track = pool.place(owner, from, until); // a play on a pool's track, its index
const lights = new ClipLauncher({ grid, play: (track, cue, at) => light(track, cue.color, at) });
lights.launch({ track: 'lamp', pattern: cues }); // a clip of cues looping on its track
lights.step(i, t); // each 16th: every clip's events due there handed on
```

A pattern is `{ meter, bars, loop, events }`:

- Its `meter` is the master's when it's left out.
- Each event is `{ start, duration, … }` in ticks, 96 to a quarter, on the straight grid. Whatever else an event carries is passed on, never read.
- A rest isn't stored: it's the gap between events.
- What's played is kept as a record, which is a pattern too.

How a clip is launched and played:

1. `launch()` puts a clip on its track, one clip a track, each launch numbered. A clip launched again in a track's place keeps its number.
2. A clip loops on the beat grid, or plays once (`once`) from the next beat, its first event to its last, each in its place in the beat as kept.
3. Each 16th, `step()` hands on every clip's events due there, at the clock times they fall at: on the swing, or straight under it, an event's own `straight` before its clip's.
4. A clip played once is told as it starts, its span from its first event's time to its last's end, and as its last is handed on. Not when it's launched over or stopped.

| Export | What it does |
|---|---|
| `Pattern`, `PatternEvent` | A pattern as a clip, and an event of it: where it starts and how long it lasts, in ticks (`pattern.ts`). |
| `lengthOf()` | A pattern's length in ticks, in its own time signature or the master's (`pattern.ts`). |
| `patternOf()` | A record as the pattern it is: from the bar its first event fell in, whole cycles long, looping where it was played (`pattern.ts`). |
| `patternsIn()`, `cycleOf()` | Every pattern in a bank, anything with events, in it or in its sets; a cycle, its longest pattern in whole bars, so what's recorded is as long or longer in whole cycles (`pattern.ts`). |
| `upcoming()`, `unmute()` | A looping pattern's next events from a place, round the loop; a play's run of 1 up to all of them, one draw (`playing.ts`). |
| `whole()` | A pattern played whole, as a launched clip: once, its first event in the beat at `at`, each in its place in the beat as kept, so its swing and offbeats stay (`playing.ts`). |
| `due()` | What a repeating pattern plays in the grid's 16th `i` (`playing.ts`). |
| `liveEvents()`, `rescaled()`, `underWayAt()` | A rhythm played live from where it started, at half, normal or double time: its events between two places; where it would have started at another speed, so it runs on with no jump; the event under way at a place, for a soloist coming in mid-note (`playing.ts`). |
| `place()`, `placeOn()`, `Grid` | A place's clock time, from the beat it starts on (`'beat'`) or at its phrase's own place in the beat (`'phrase'`), so the swing falls on the same events. `placeOn()` gives the place on the grid in 16ths instead. `Grid` is `{ stepAt, timeAt }`, the clock's grid a pattern is placed on (`playing.ts`). |
| `new ClipLauncher({ grid, play, started, ended })`: `launch()`, `stop()`, `step()` | Clips launched on tracks, one a track, a track any value its owner keys clips by. `play(track, event, at, launch)` is handed each event due (`launcher.ts`). |
| `ClipGrid`, `LaunchedClip`, `PlayEvent`, `ClipsTold`, `Span` | The clock's grid a clip plays on; a clip as launched, its track, its pattern, `straight` and `once`; what's handed on for an event; `started` and `ended` for a clip played once; its `from` and `until` (`launcher.ts`). |
| `new TrackPool()`: `place()`, `end()`; `poolsFor()` | A pool of tracks, overlapping plays allotted to them as a polysynth allots its voices. `place(owner, from, until, { join })` returns a track's index: the owner's last if it's free, else the lowest free one, else a new one. `end(index, until)` ends a placement held open. `poolsFor(keys)` is a pool for each key (`track-pool.ts`). |
| `new Holding()`: `add()`, `end()`, `until` | How long the plays on one track hold it: for good while any is held open, else until the latest end. A play may `join` its owner's track while the owner still holds it, as notes from one place share a voice (`holding.ts`). |
| `new Phrases({ region, send, grid })`: `play()`, `step()`, `playing()`, `forget()`, `clear()`; `DueEvent` | Phrases of events sent as each 16th comes, so a hold pauses them. A `DueEvent` is `{ start, event() }`: where it lies on the grid in ticks, and the event worked out as it comes due (`phrases.ts`). |

Tests: `test/sequencer.test.js`, `test/track-pool.test.js`, `test/holding.test.js`, `test/phrases.test.js` and `test/launcher.test.js`, the launcher's on a light's cues, not notes, looping and played once. `test/swung-grid.js` is a grid with swing for them.
