# sequencing/timeline

What happened, laid out in time, and played back, for events of any kind: the generic part of an arrangement, as Premiere's or Ableton's. It knows of an event only when it starts and how long it lasts. It plays in timeline time, as Web Animations names it: the time along the timeline with its holds taken out, so a hold is played past at once.

Depends on: `base/util`, `sequencing/clock`.

The clock's song time is the timeline time of music, handed in as a `TimeMap`. Regions, lanes, a note's index, Web Audio's glide curve and putting lanes back after playback are the MIDI sequencer's, its own views of the timeline's events and their playback (`libs/sequencing/midi-sequencer/recorder.ts`, `libs/sequencing/midi-sequencer/track-lanes.ts`, `libs/sequencing/midi-sequencer/note-lanes.ts`, `libs/sequencing/midi-sequencer/lanes.ts` and `libs/sequencing/midi-sequencer/recording-player.ts`).

```ts
import { Player, Timeline } from './index.ts';
const timeline = new Timeline({ keep: 30 * 60, same: (before, after) => before.value === after.value, onLetGo: (gone) => forget(gone) });
const press = { t: 1, finger: 0 };
timeline.add([press]); // an event with no length: open
timeline.endAt(press, 2); // its release: a length, never less than none
timeline.hold('pressure', { t: 1.5, value: 0.4 }); // an event that holds until the next of its key
timeline.settle(now); // what's past the window let go, what holds what's held already thinned
const sounding = timeline.inEffectAt(now); // what's in effect: under way, open, each key's latest by then
const player = new Player({ performer: { start, point, end, hold } }); // each moment told to its performer
player.play({ events: timeline.events(), held: [timeline.held('pressure')] }, { from: 10, at: now, end: now + 30 }); // from the timeline's 10 s, heard from now
clock.onTick((t) => player.due(t + lookahead)); // each moment told as it comes due
```

An event's extent is one of three: its own length; open until its end is told; or, for an event that holds, until the next of its key, as a value set holds until the next one is (a lane's point, a keyframe).

The timeline keeps events for a window, the last 30 minutes unless told: an event that ended before it is let go, and one still in effect is kept, of each key's the one in effect where the window starts.

How the player tells the performer:

1. Each moment is told as it comes due on a tick, heard as far after where playback starts as it lies along the timeline.
2. At one time, an event's start comes before its points and its end after. An event over by then, or starting at or past the end, is left out.
3. An event under way where it starts is chased: started at once from there, its points before passed over.
4. An event that holds is told in each key's time order, the one in effect where it starts picked up from there, never ended.
5. Stopped, what's under way is ended then. Played to the end, each rings out as far after it was heard from as it lies along the timeline, an open one ended then.

| Export | What it does |
|---|---|
| `new Timeline({ keep, same, onLetGo })`, `TimedEvent`, `TimelineOptions` | The timeline, kept for a window: `keep`, `same(before, after)` whether an event that holds holds what the one before it did, and `onLetGo(events)` told what was let go. A `TimedEvent` is a time and an optional length, none while open or holding (`timeline.ts`). |
| `Timeline`'s events: `add()`, `endAt()`, `events()` | Events with their own length, or open, in the order they came, what's past the window let go as they come. An open event's end is its length from its start, never less than none (`timeline.ts`). |
| `Timeline`'s holding events: `hold()`, `keys()`, `held()` | An event that holds until the next of its key, among its key's in time order; the keys in the order they began; a key's events (`timeline.ts`). |
| `Timeline`'s reading: `settle()`, `inEffectAt()`, `startingIn()`, and `clear()` | What ended before the window let go, and holding events that change nothing thinned once a second past (`LATEST`); what's in effect at a time, each key's latest by then; what starts in a range; `clear()` forgets every event, telling nobody (`timeline.ts`). |
| `LATEST`, `thinned()`, `endOf()` | The latest an event comes after its time, 1 s; events that change nothing left out once settled, by the caller's equality; where an event ends, never for an open one (`timeline.ts`). |
| `new Player({ performer, pointsOf, timeline, endOf })`: `play()`, `due()`, `stop()`, `finish()`, `position()`, `endsAt()`, `ended()` | The timeline played back from its time `from`, heard at clock time `at`, until its `end` as it started. `due(until)` tells every moment due before a clock time; `position(now)` is where it plays, past a hold at once, never past the end (`player.ts`). |
| `Performer`, `Played`, `PlayerOptions`, `EndOf` | Whom the player tells: `start(event, t, at)`, `point()`, `end()` and `hold(event, t, from?)`; what's played, events and each key's holding events; what it's told; where an event ends along the timeline (`player.ts`). |
| `PlayedFrom`, `ALONG_THE_CLOCK` | Where playback starts: `{ from, at, end }`, the timeline's time it plays from, the clock time heard at, the timeline's end as it started. `ALONG_THE_CLOCK` is the `TimeMap` of a clock with no holds: timeline time the clock's, the default (`timeline-time.ts`). |
| `PlaybackMessage` | What's asked of whatever plays a timeline back, as a transport's buttons ask it, on a bus: `play`, `stop`, and `cue`, the playhead set back to a time `t`, or none (`messages.ts`). |

Tests: `test/timeline.test.js` and `test/player.test.js`, on events of their own, a hand's presses and a pointer's pressure, not notes.
