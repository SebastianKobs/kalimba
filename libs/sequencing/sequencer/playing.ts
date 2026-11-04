// ---------- libs/sequencing/sequencer/playing: a pattern played: its events due on the grid, upcoming round its loop, whole, live at a speed, ----------
// under way, placed
import { lengthOf } from './pattern.ts';
import type { Pattern, PatternEvent } from './pattern.ts';
import { beatTicks, COMMON_TIME, STEP, type BeatGrid, type Meter } from '../clock/index.ts';
import { modulo } from '../../base/util/index.ts';

// the grid a pattern is placed on, the clock's: where a clock time lies on it, in 16ths, and the clock time a place on it falls at
export type Grid = Pick<BeatGrid, 'stepAt' | 'timeAt'>;
// a looping pattern's next count events from a place (ticks from the grid's start), round the loop, each where it falls from the grid's start
export function upcoming<Event extends PatternEvent>(
  pat: Pattern<Event>,
  at: number,
  count: number,
  meter: Meter = COMMON_TIME,
): Event[] {
  if (!pat.events.length) {
    return [];
  }
  const loopLength = lengthOf(pat, meter);
  const from = pat.from!; // a record's pattern: where it was played
  const next: Event[] = [];
  for (const { event, place } of lapped(pat, from, loopLength, 1, Math.floor((at - from) / loopLength))) {
    if (place >= at) {
      next.push({ ...event, start: place });
    }
    if (next.length === count) {
      break;
    }
  }
  return next;
}
// the notes a play of a record unmutes, the pattern running on silently where it was
// played: from the next one at a place on, a random number of them, 1 up to all, round
// the loop. One draw
export function unmute<Event extends PatternEvent>(
  pat: Pattern<Event>,
  at: number,
  rand: () => number,
  meter: Meter = COMMON_TIME,
): Event[] {
  return upcoming(pat, at, 1 + Math.floor(rand() * pat.events.length), meter);
}
// a pattern played whole, as a launched clip: from its first event to its last, once, its first in the beat at a place (ticks from the
// grid's start), each event in its place in the beat as kept, so its swing and offbeats stay; its place in the bar moves by whole beats
export function whole<Event extends PatternEvent>(
  pat: Pattern<Event>,
  at: number,
  meter: Meter = COMMON_TIME,
): Event[] {
  const [firstEvent] = pat.events;
  if (!firstEvent) {
    return [];
  }
  const beat = beatTicks(meter);
  const first = firstEvent.start;
  const shift = at + modulo(first, beat) - first;
  return pat.events.map((event) => ({ ...event, start: event.start + shift }));
}
// what a repeating pattern plays in the grid's 16th i: its events whose place comes round within it, every length from the grid's
// start, in the pattern's order, each with its offset, how many ticks into the 16th it starts
export function due<Event extends PatternEvent>(pat: Pattern<Event>, i: number, meter: Meter = COMMON_TIME): Event[] {
  const loopLength = lengthOf(pat, meter);
  const t0 = i * STEP;
  return pat.events.flatMap((event) => {
    const offset = modulo(event.start - t0, loopLength);
    return offset < STEP ? [{ ...event, offset }] : [];
  });
}
// a rhythm played live, as a gesture plays one: looping from where it started (start,
// in ticks from the grid's start), at a time scale (2: double time, 0.5: half), its
// events whose places fall from a place up to another, each where it falls, as long as
// it lasts then
export function liveEvents<Event extends PatternEvent>(
  pat: Pattern<Event>,
  start: number,
  scale: number,
  from: number,
  to: number,
  meter: Meter = COMMON_TIME,
): Event[] {
  if (!pat.events.length) {
    return [];
  }
  const loopLength = lengthOf(pat, meter) / scale;
  const found: Event[] = [];
  const firstLap = Math.max(0, Math.floor((from - start) / loopLength));
  for (const { event, place, lapStart } of lapped(pat, start, loopLength, scale, firstLap)) {
    if (lapStart >= to) {
      break;
    }
    if (place >= from && place < to) {
      found.push({ ...event, start: place, ...(event.duration ? { duration: event.duration / scale } : {}) });
    }
  }
  return found;
}
// A pattern's events round its loop, lap after lap from a first, for ever: each with its place, its lap's start plus its own start at
// the speed asked, and its lap's start, so its caller stops where it will. The caller's pattern has events.
function* lapped<Event extends PatternEvent>(
  pat: Pattern<Event>,
  start: number,
  loopLength: number,
  scale: number,
  firstLap: number,
): Generator<{ event: Event; place: number; lapStart: number }> {
  for (let lap = firstLap; ; lap++) {
    const lapStart = start + lap * loopLength;
    for (const event of pat.events) {
      yield { event, place: lapStart + event.start / scale, lapStart };
    }
  }
}
// the event of a rhythm played live under way at a place, as what's left of it from there, if that's a 16th or more: so one coming in
// partway, as a soloist comes in mid-note, takes it up at once. One starting on the place isn't under way yet: it comes as the next
export function underWayAt<Event extends PatternEvent>(
  pat: Pattern<Event>,
  start: number,
  scale: number,
  at: number,
  meter: Meter = COMMON_TIME,
): Event | undefined {
  const underWay = liveEvents(pat, start, scale, at - lengthOf(pat, meter) / scale, at, meter)
    .filter((event) => event.start + (event.duration || 0) - at >= STEP)
    .pop();
  return underWay && { ...underWay, start: at, duration: underWay.start + underWay.duration! - at };
}
// where a rhythm playing from start at a scale would have had to start at another, to be where it has got to at a place: it runs on with
// no jump
export function rescaled(start: number, scale: number, next: number, at: number): number {
  return at - ((at - start) * scale) / next;
}
// where a pattern's places fall: on the grid, with its swing as it is now. base: the place, in ticks, its first event was kept at;
// start: the beat it starts on, a clock time. On the beat (from: 'beat'), or in the same place in the beat as its phrase began
// ('phrase'), so the swing falls on the same events. Returns a place in ticks → clock time
export function place(
  base: number,
  start: number,
  grid: Grid,
  from = 'beat',
  meter: Meter = COMMON_TIME,
): (at: number) => number {
  const placed = placeOn(base, start, grid, from, meter);
  return (at: number) => grid.timeAt(placed(at));
}
// and where they lie on the grid, in 16ths, as place() times them: for a phrase sent as its events come due, each timed then
export function placeOn(
  base: number,
  start: number,
  grid: Pick<Grid, 'stepAt'>,
  from = 'beat',
  meter: Meter = COMMON_TIME,
): (at: number) => number {
  const beat = beatTicks(meter);
  const s0 = Math.round(grid.stepAt(start)) + (from === 'phrase' ? modulo(base, beat) / STEP : 0);
  return (at: number) => s0 + (at - base) / STEP;
}
