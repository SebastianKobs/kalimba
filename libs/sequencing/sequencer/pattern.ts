// ---------- libs/sequencing/sequencer/pattern: a pattern of events, as a clip, and its ticks: its length, a record as a pattern, a bank's patterns and their cycle ----------
import { barTicks, COMMON_TIME, type Meter, type Ticks } from '../clock/index.ts';

// an event of a pattern: where it starts and how long it lasts, in ticks, and how far off its 16th it falls, as due() hands it on; and
// whatever else its caller gives it, which the sequencer passes on and never reads
export interface PatternEvent {
  start: Ticks;
  duration?: Ticks | undefined;
  offset?: Ticks | undefined;
  straight?: boolean | undefined; // played straight under the swing, or on it, in place of its clip
  [value: string]: unknown;
}
// a pattern, as a clip: its time signature, its length in bars, whether it loops, where a record was played from, its events, its name
export interface Pattern<Event extends PatternEvent = PatternEvent> {
  meter?: Meter;
  bars?: number;
  loop?: boolean;
  from?: number;
  events: Event[];
  name?: string;
}

// a pattern's length, its bars in its own time signature or the master's
export function lengthOf(pat: Pick<Pattern, 'bars' | 'meter'>, meter: Meter = COMMON_TIME): Ticks {
  return (pat.bars ?? 1) * barTicks(pat.meter ?? meter);
}
// every pattern in a bank: anything with events, in it or in its sets
export function patternsIn(bank: unknown, found: Pattern[] = []): Pattern[] {
  const part = bank as { events?: unknown } | null | undefined;
  if (part?.events) {
    found.push(part as Pattern);
  } else if (part && typeof part === 'object') {
    for (const inner of Object.values(part)) {
      patternsIn(inner, found);
    }
  }
  return found;
}
// a set of patterns' cycle, in ticks: its longest pattern, in whole bars of the master's, at least one. What's recorded is as long, or longer in
// whole cycles, so a pattern played along with the longest stays with it
export function cycleOf(patterns: Pattern[], meter: Meter = COMMON_TIME): number {
  const bar = barTicks(meter);
  return Math.max(1, ...patterns.map((pattern) => Math.ceil(lengthOf(pattern, meter) / bar))) * bar;
}
// a record as the pattern it is: from the one of the bar its first event fell in, as many whole cycles long as it needs, each event where it
// fell in it, in time order. A record keeps places from the grid's start; its pattern loops from where it was played (from), every its length
export function patternOf<Event extends PatternEvent>(
  record: Event[],
  cycle: number,
  meter: Meter = COMMON_TIME,
): Pattern<Event> {
  const bar = barTicks(meter);
  const from = Math.floor(Math.min(...record.map((ev) => ev.start)) / bar) * bar;
  const events = record
    .map((ev) => ({ ...ev, start: ev.start - from }))
    .sort((first, second) => first.start - second.start);
  const end = Math.max(...events.map((event) => event.start + (event.duration || 1))); // a long one as long as it lasts
  return { meter, bars: (Math.ceil(end / cycle) * cycle) / bar, loop: true, from, events };
}
