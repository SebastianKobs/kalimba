// ---------- params/note-values: a note value as written, '1/4', dotted '1/8.', a triplet '1/8t', in beats ----------
// And a time with a sync switch in seconds, by the tempo.
import type { RangedSpec } from './spec.ts';
import type { Time } from './time.ts';

const NOTE_VALUE = /^(\d+)\/(\d+)(\.|t)?$/;
// a note value's length against its plain one: dotted, a triplet's
const FACTOR: Readonly<Record<string, number>> = { '': 1, '.': 1.5, t: 2 / 3 };

// its length in beats, quarters: '1/4' one; none where it isn't a note value
export function noteValueBeats(written: string): number | undefined {
  const [, count, division, kind = ''] = written.match(NOTE_VALUE) ?? [];
  if (count === undefined || division === undefined) {
    return undefined;
  }
  return ((4 * +count) / +division) * FACTOR[kind]!; // the pattern allows only FACTOR's kinds
}
// A time's seconds, its switch choosing:
//   - synced: its note value at the beat, a beat's length in seconds;
//   - free: its milliseconds; a rate's, one turn at its hertz.
export function timeSeconds({ sync, note, free, unit }: Time, beat: number): number {
  if (sync) {
    return noteValueBeats(note)! * beat; // a synced time's note is one of its note values
  }
  if (unit === 'Hz') {
    return 1 / free;
  }
  return free / 1000;
}
// A synced time's free value at a beat: where its note is then, in its free unit, ms or Hz,
// to its step, so switching sync off there changes nothing heard.
export function freeAt(note: string, beat: number, { unit, range }: Pick<RangedSpec, 'unit' | 'range'>): number {
  const seconds = noteValueBeats(note)! * beat; // a synced time's note is one of its note values
  const free = unit === 'Hz' ? 1 / seconds : seconds * 1000;
  const [, , step] = range;
  return Math.round(free / step) * step;
}
