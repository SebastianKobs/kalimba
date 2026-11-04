// ---------- clock: the one clock. Everything asks it what time it is, and nothing reads another time source ----------
// One timeline, in seconds of page time: the browser's own steady clock, which pointer events and frames already arrive on. It runs before
// the audio starts and while the audio is suspended. On it are:
// - the ticks: about every 25 ms, from a worker, so they keep going in a hidden tab. They drive the scheduler and every timeout
// - the beat grid: 16ths with their swing, scheduled a little ahead and sent to onStep's listeners
// - the edge to Web Audio, which keeps its own time. toContext(t) turns a clock time into the audio context's time, for the engine
//   (libs/modular-audio/build/web-audio-engine/'s ClockedContext, given it as toContext). The offset between the two is measured on every tick, followed slowly as the two clocks
//   drift apart, and found again when the audio resumes after a suspend
// Its settings are an object it reads live (new Clock({ settings })): bpm, the tempo; swing, 0 straight to 2; swingOn, '16ths' or '8ths'; quantize,
// the grid snap() uses unless told another (GRIDS). A frame time is the caller's: faking() says whether time is the fake one.
// It needs no browser: in fake mode (the unit tests) time moves only when told, and the ticks and steps of the time passed run in order

// Its parts: the clock, its timeline, ticks and scheduler (clock.ts, Clock); the beat grid (beat-grid.ts, BeatGrid), its swing (swing.ts),
// its song time (song-time.ts, SongTime); the edge to Web Audio (audio-clock.ts, AudioClock); the grids a time snaps to (quantizer.ts); time in ticks, a meter's bars and beats
// (ticks.ts); items held until a tick brings their time (cues.ts); where each 16th fell as it was heard (grid-map.ts)
export { Clock, LOOKAHEAD, type ClockSettings } from './clock.ts';
export { BeatGrid, type GridSettings } from './beat-grid.ts';
export { HISTORY, type TimeMap } from './song-time.ts';
export { PPQ, STEP, COMMON_TIME, barTicks, beatTicks, startsBar, type Meter, type Ticks } from './ticks.ts';
export { Cues } from './cues.ts';
export { GridMap, type HeardGrid } from './grid-map.ts';
export { AudioClock, type AudioContextLike } from './audio-clock.ts';
export { GRIDS, type SnapGrid, type SnapOptions } from './quantizer.ts';
