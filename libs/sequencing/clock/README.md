# sequencing/clock

The one clock: everything asks it what time it is, and nothing reads another time source. Music time for anything, a sound, an animation synced to the beat, an event quantized to the grid. One timeline, in seconds of page time, the browser's own steady clock, which pointer events and frames already arrive on. Its beat grid (tempo, swing, meter) gives the ticks.

Depends on: `base/params`, `base/util`.

```ts
import { Clock } from './index.ts';
const clock = new Clock({ settings: { bpm: 72, swing: 0, swingOn: '16ths', quantize: '1/16' } }); // read live: change them, and it follows
clock.start(); // the ticks, from a worker, so they keep going in a hidden tab
clock.onStep((i, t) => { /* the 16th i sounds at t, swung, scheduled a little ahead */ });
clock.useAudio(audioContext); // the grid starts with the audio, standing at its first 16th until then
const { at, on } = clock.snap(clock.now(), { nearest: true, late: 0.05 }); // a tap: when it sounds, and the step it belongs to
```

How it runs:

1. The ticks come about every 25 ms, from a worker. They drive the scheduler and every timeout.
2. On each tick the beat grid hands out the 16ths due within `LOOKAHEAD` (0.12 s) ahead, each with its swung time, to `onStep()`'s listeners. Missed steps are skipped and the grid keeps its place.
3. Web Audio keeps its own time. The offset between the two clocks is measured on every tick and never maps into the audio's past.
4. Places on the grid are kept straight and played with the swing as it is now.
5. A frame time is the caller's. In fake mode, for tests, time moves only when told.

| Export | What it does |
|---|---|
| `new Clock({ settings })`: `now()`, `songNow()`, `fromEvent()`, `faking()`, `start()`, `grid`, `audio` | The clock, reading its `ClockSettings` live. `songNow()` is `now()` in song time. `fromEvent(ms)` puts a pointer event's `timeStamp` on the same timeline (`clock.ts`). |
| `ClockSettings`, `LOOKAHEAD` | The tempo `bpm`, `swing` (0 straight, 1 a triplet swing, 2 twice as late), `swingOn` (`'16ths'` or `'8ths'`), `meter` and `quantize`, the grid `snap()` uses unless told another (`clock.ts`). |
| `Clock`'s listeners: `onTick()`, `onStep()`, `onTempo()` | Every tick; every 16th with its number and its swung time; the beat's length each time it changes, so what follows the tempo, the delays and the synced rates, follows it (`clock.ts`). |
| `Clock`'s edges: `useAudio()`, `snap()`, `quantize()`, `useFake()`, `advance()` | The audio context handed over; where a time lands on a grid, `{ at, on }`, or only `at`; fake mode, where every tick and step of the time passed runs in order (`clock.ts`). |
| `new BeatGrid(settings)`: `stepDuration()`, `swingAt()`, `straightAt()`, `stepAt()`, `timeAt()`, `straightTime()`, `meter()`, `nextStepTime`, `nextStepNumber`, `running` | The beat grid: the 16ths on the clock. It runs once the audio starts it, and until then stands at its first 16th (`beat-grid.ts`). |
| `BeatGrid`'s measures: `stepsPerBeat()`, `stepsPerBar()`, `beatDuration()`, `secondsOf()`, `ticksIn()`, `ticksAt()`, `timeOfTicks()`, `nextLine()` | A beat and a bar by the meter; ticks at the tempo in seconds and back; a time as whole ticks on the grid, swung or straight; the next line of so many 16ths (`beat-grid.ts`). |
| `BeatGrid`'s holds: `hold()`, `holdFrom()`, `release()`, `held`, `heldAt` | A stop: the grid's place, the song position, kept while the clock's time runs on, no 16th handed out. Released, it goes on from there, its next 16th at once (`beat-grid.ts`). |
| `BeatGrid`'s song time: `songTime()`, `playedTime()`, `timeOfSong()`, `locate()`, `song`; `TimeMap`, `HISTORY` | A clock time's song time, where the music is on the arrangement's timeline, the holds taken out; `playedTime()` is the same with no locate counted. And back, `timeOfSong()` is the latest clock time a song time is at. `locate(song, t)` sets the position to a song time: it goes on from there, or stands there if held, and a time before keeps the song time it had. `song` is the same as a `TimeMap`, `{ toTimeline(t), fromTimeline(along) }`. `HISTORY` is half an hour, how far back it's kept (`song-time.ts`). |
| `GridSettings` | What the grid reads live: the tempo, the swing and what it swings, the meter (`beat-grid.ts`). |
| `PPQ`, `STEP`, `COMMON_TIME`, `barTicks()`, `beatTicks()`, `startsBar()`, `Meter`, `Ticks` | Time in ticks: 96 to a quarter, 24 to a 16th, as a MIDI file's; 4/4, the meter with none given; a bar's and a beat's length in ticks; whether a 16th starts a bar (`ticks.ts`). |
| `GRIDS`, `SnapGrid`, `SnapOptions` | The grids a time snaps to: off, 1/4, 1/4t, 1/8, 1/8t, 1/16, 1/16t, triplets always straight. The options are `straight`, `nearest`, `late` and `grid` (`quantizer.ts`). |
| `new AudioClock(now, tick)`: `use()`, `sync()`, `started()`, `running()`, `settled()`, `toContext()`, `fromContext()`, `contextNow()`, `soonest()`, `latency()`; `AudioContextLike` | The edge to Web Audio: a clock time mapped to the audio context's time and back, from when the context is handed over. `AudioContextLike` is what it needs of an audio context, a browser's or a stand-in (`audio-clock.ts`). |
| `new Cues({ timeOf, handOn, lead })`: `hold()`, `cue()`, `tick()` | Items held until a tick brings their time, less a `lead` where one's given, then handed on in their order, those at one time as they came. `cue()` hands one on at once if its time has come; the ticks are the owner's (`cues.ts`). |
| `new GridMap({ clock })`: `placeOf()`, `timeOf()`, `startOver()`, `stepsPerBar()`, `stepsPerBeat()`; `HeardGrid` | Where each 16th fell as the grid played it, heard from `onStep()`, so a time long past lies where it was played after the tempo has changed. It is straight, so a swung note lies where it sounded, and in song time, both the times it's asked and the ones it answers, so a hold takes no room. A locate is a jump in song time, so each located line is kept apart: nothing is stretched over a jump, and a song time it skipped is counted back from the first 16th after it. `startOver(song, t)` locates the grid at a song time and starts the map over: what was heard before is let go, song time 0 lies at the place 0 and the present at the song time, as a loaded recording is. `HeardGrid` is what it reads of the grid (`grid-map.ts`). |

Tests: `test/clock.test.js`, on a clock and settings of its own, with vectors in `shared/test-vectors/clock/`; `test/grid-map.test.js`, where each 16th fell; `test/cues.test.js`, items held and handed on. `test/fake-audio.js` is a stand-in audio context.
