// ---------- automation/continued: automation continued as another from a time ----------
// As a knob turned while a param plays: from where it is at a time, on to the other.
//   1. What was planned from then cancelled, cut where it is (cutAt()).
//   2. On its way: a ramp coming takes it on to its end by itself; a target the other
//      approaches approached from there, timed to meet an event coming that cuts it on its way,
//      as a comparator cuts an attack; else the value the other holds, glided to.
//   3. The other's events after then.
import { eventTime, type Automation } from './automation.ts';
import { levelAt } from './level-at.ts';

// s: the time constant a held value glides to a new one by, as a plugin smooths a knob
// against zipper noise
export const SMOOTHING = 0.05;

// the wanted automation from a time, from where the playing one has the param then
export function continuedAs(
  playing: readonly Automation[],
  wanted: readonly Automation[],
  at: number,
  smoothing = SMOOTHING,
): Automation[] {
  const coming = eventsAfter(wanted, at);
  const cut = cutAt(playing, at);
  return [['cancel', at], cut, ...timedToMeet(onTheWay(wanted, at, coming, smoothing), cut[1], coming), ...coming];
}
// Where an automation has its param at a time, as its events from then are cancelled:
//   - a ramp running then: cut there, at the level it has reached, so it still runs up to it;
//     Web Audio drops a ramp whose end is cancelled, leaving the level where the event before it did;
//   - else set there.
export function cutAt(automation: readonly Automation[], at: number): Automation {
  const level = levelAt(automation, at);
  const running = eventsAfter(automation, at)[0];
  if (running?.[0] === 'linear' || running?.[0] === 'exp') {
    return [running[0], level, at];
  }
  return ['set', level, at];
}
// its events after a time
function eventsAfter(automation: readonly Automation[], at: number): Automation[] {
  return automation.filter((event) => eventTime(event) > at);
}
// How it goes on from where it is:
//   - a ramp coming takes it on to its end by itself;
//   - a target the wanted automation approaches, approached from there;
//   - else the value it holds, glided to by the smoothing.
function onTheWay(
  wanted: readonly Automation[],
  at: number,
  coming: readonly Automation[],
  smoothing: number,
): Automation[] {
  const next = coming[0];
  if (next && (next[0] === 'linear' || next[0] === 'exp')) {
    return [];
  }
  const approach = approachAt(wanted, at);
  if (approach) {
    return [['target', approach.value, at, approach.tc]];
  }
  return [['target', levelAt(wanted, at), at, smoothing]];
}
// A target approached from a level, where the event coming sets a value on its way, as a
// comparator cuts an attack: its time constant such that it reaches that value then, so nothing
// jumps there. Else as it is.
function timedToMeet(onItsWay: Automation[], level: number, coming: readonly Automation[]): Automation[] {
  const [approach] = onItsWay;
  const [cut] = coming;
  if (approach?.[0] !== 'target' || cut?.[0] !== 'set') {
    return onItsWay;
  }
  const [, target, from] = approach;
  const [, value, at] = cut;
  const before = target - level;
  const after = target - value;
  if (at <= from || after === 0 || Math.sign(before) !== Math.sign(after) || Math.abs(after) >= Math.abs(before)) {
    return onItsWay;
  }
  return [['target', target, from, (at - from) / Math.log(before / after)]];
}
// the target an automation approaches at a time: its last event by then, if that's a target
function approachAt(automation: readonly Automation[], at: number): { value: number; tc: number } | null {
  const last = automation.filter((event) => eventTime(event) <= at).at(-1);
  return last?.[0] === 'target' ? { value: last[1], tc: last[3] } : null;
}
