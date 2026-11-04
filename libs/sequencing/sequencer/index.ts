// ---------- libs/sequencing/sequencer: events of any kind, sequenced on a beat grid ----------
// Modelled on Ableton's session view. Runs on the clock alone.
// The MIDI sequencer (notes and their messages) sits on top of it: libs/sequencing/midi-sequencer/.
// Patterns: like a clip, { meter, bars, loop, events }.
//   - meter: the time signature; the master's when left out.
//   - bars: the pattern's length. loop: repeats, or plays once when triggered.
//   - events: { start, duration, … } in ticks (PPQ to a quarter), on the straight grid.
//     Anything else an event carries is passed on, never read.
// Playing: once (place()) or repeating (due()), whole, or live at a speed.
// Clips: launched on tracks, one clip a track; each event handed on as its 16th comes
// (ClipLauncher).
// Track pools: overlapping plays shared out over tracks, as a polysynth shares its voices
// (TrackPool); how long the plays on a track hold it (Holding).
// Phrases: events sent as each 16th comes, so a hold pauses them (Phrases).
export { cycleOf, lengthOf, patternOf, patternsIn } from './pattern.ts';
export type { Pattern, PatternEvent } from './pattern.ts';
export { unmute, upcoming, whole, due, liveEvents, underWayAt, rescaled, place, placeOn } from './playing.ts';
export type { Grid } from './playing.ts';
export { ClipLauncher } from './launcher.ts';
export type { ClipGrid, ClipsTold, LaunchedClip, PlayEvent, Span } from './launcher.ts';
export { TrackPool, poolsFor } from './track-pool.ts';
export { Holding } from './holding.ts';
export { Phrases } from './phrases.ts';
export type { DueEvent } from './phrases.ts';
