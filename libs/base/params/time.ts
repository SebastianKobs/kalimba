// ---------- params/time: a time with a sync switch, as Ableton's ----------
// Both values kept, the switch choosing:
//   - synced: a note value, following the tempo;
//   - free: in milliseconds for a length, in hertz for a rate.
// A device declares it as three params side by side, each its own control and lane:
//   sync, a switch; note, the note value; its free value, named by its unit (ms, hz).
// Its seconds are the clock's, by the tempo.
import type { ParamSpec, RangedSpec } from './spec.ts';
import { SWITCH } from './standard-specs.ts';

// what a time's free value is in: a length in milliseconds, or a rate in hertz
export type FreeUnit = 'ms' | 'Hz';
// a time as its three params hold it
export interface Time {
  sync: boolean;
  note: string; // a note value as written: '1/8', dotted '1/8.', a triplet '1/8t'
  free: number; // in its unit
  unit: FreeUnit;
}

// a time's three params by their names: sync, note, and its free one by its unit, ms or hz
export type TimeSpecs<Unit extends FreeUnit> = Readonly<
  { sync: RangedSpec; note: ParamSpec } & Record<Lowercase<Unit>, RangedSpec>
>;

// a time's three params by their names among a part's keys: its switch, its note, its free one
export interface TimeParams {
  sync: string;
  note: string;
  free: string;
}

// a time's free value as its param is named: by its unit's name, or an oscillator's frequency
const FREE_NAMES: readonly string[] = Object.freeze(['ms', 'hz', 'frequency']);

// the note values a synced time steps through, shortest first: a 16th triplet to a dotted half
// By length, so a step up is always longer: a triplet comes before the dotted note a step shorter.
export const NOTE_VALUES: readonly string[] = Object.freeze([
  '1/16t',
  '1/16',
  '1/8t',
  '1/16.',
  '1/8',
  '1/4t',
  '1/8.',
  '1/4',
  '1/2t',
  '1/4.',
  '1/2',
  '1/2.',
]);

// A time's three params, as a device declares them, each starting where start has it.
// The free one by octaves: a time doubled is a step as far at any length.
export function timeSpecs<Unit extends FreeUnit>({
  unit,
  range,
  start,
}: {
  unit: Unit;
  range: RangedSpec['range'];
  start: Omit<Time, 'unit'>;
}): TimeSpecs<Unit> {
  const free = unit.toLowerCase(); // ms, hz
  const specs = {
    sync: { ...SWITCH, name: 'sync', default: start.sync ? 1 : 0 },
    note: { name: 'note', choices: NOTE_VALUES, default: start.note },
    [free]: { name: free, unit, range, default: start.free, taper: 'octaves' },
  };
  return Object.freeze(specs) as TimeSpecs<Unit>; // a computed key types as any string: its free one is its unit's
}
// A time's three params among a part's keys, as a device declares them side by side:
// its sync switch, its note and its free one. None where one of the three is missing.
export function timeParamsIn(keys: readonly string[]): TimeParams | undefined {
  const free = keys.find((key) => FREE_NAMES.includes(key));
  if (!keys.includes('sync') || !keys.includes('note') || free === undefined) {
    return undefined;
  }
  return { sync: 'sync', note: 'note', free };
}
