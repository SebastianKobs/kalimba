// ---------- automation/timed-value: a value at a time, when a value lands, and changes as automation ----------
import type { Automation } from './automation.ts';

// a value at a time: jumping there, or gliding there from its time by a time constant (glide), as an automation point's curve
export interface TimedValue {
  value: number;
  t: number;
  glide?: number | undefined;
}
// when a value lands, by a caller that knows no clock:
//   - neither: now, the caller's now;
//   - at: from a time of the caller's, at once;
//   - glide: gliding there, from now or from at, by this time constant.
export interface When {
  at?: number | undefined;
  glide?: number | undefined;
}

// a value at a time, a glide kept only where there is one
export function timedValue(value: number, t: number, glide?: number): TimedValue {
  if (glide === undefined) {
    return { value, t };
  }
  return { value, t, glide };
}
// a value handed on when asked, as a value at a time, now the caller's:
// at its time, or now; gliding there from then where it says
export function timedAt(value: number, { at, glide }: When, now: number): TimedValue {
  return timedValue(value, at ?? now, glide);
}
// Changes in time order as automation:
//   1. The first set at its time: nothing before it to glide from.
//   2. Each after it a jump or a glide.
export function automationOf(changes: readonly TimedValue[]): Automation[] {
  return changes.map((change, index) => {
    if (index === 0) {
      return ['set', change.value, change.t];
    }
    return eventOf(change);
  });
}
// a change as an automation event: a jump set at its time; a glide a target by its time constant
// A glide of 0 is a jump: Web Audio's setTargetAtTime would get there at once.
export function eventOf({ value, t, glide }: TimedValue): Automation {
  if (!glide) {
    return ['set', value, t];
  }
  return ['target', value, t, glide];
}
