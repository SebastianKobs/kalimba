// ---------- clock/ticks: time as a pattern counts it, 96 ticks to a quarter, and a meter's bars and beats in it ----------

// a time signature: so many beats of a unit, [4, 4]
export type Meter = [beats: number, unit: number];
// time as a pattern counts it: 96 ticks to the quarter, as a MIDI file's
export type Ticks = number;

export const PPQ = 96; // ticks to a quarter note: a 16th is 24, a 16th triplet 16, an 8th triplet 32, all whole
export const STEP = PPQ / 4; // ticks to a 16th, the grid's step
export const COMMON_TIME: Meter = Object.freeze([4, 4]) as Meter; // the time signature with none given; frozen, as settings hold it

// a bar's length in ticks, in a time signature [beats, unit]
export function barTicks([beats, unit]: Meter = COMMON_TIME): Ticks {
  return (beats * PPQ * 4) / unit;
}
// a beat's length in ticks: the meter's unit
export function beatTicks([, unit]: Meter = COMMON_TIME): Ticks {
  return (PPQ * 4) / unit;
}
// whether the 16th i starts a bar: where a change waits for, as a clip launched on a bar
export function startsBar(i: number, meter: Meter = COMMON_TIME): boolean {
  return (i * STEP) % barTicks(meter) === 0;
}
