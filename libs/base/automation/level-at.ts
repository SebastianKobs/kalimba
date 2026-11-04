// ---------- automation/level-at: a param's level at a time, as Web Audio plays its automation ----------
// How each event moves it:
//   - a set: at once;
//   - a ramp, linear or exponential: from where the event before left it to its value at its time;
//     an exponential one from or to nothing holds, then jumps at its end, as Web Audio's does;
//   - a target: approached from its start by its time constant.
// What a view shows and draws, and where a release or an edit starts from.
// Another engine's automation would have to match it.
import type { Automation } from './automation.ts';
import { approach } from '../util/index.ts';

// where the level is after an event: its time and level there, and the target it approaches from then, if any
interface State {
  at: number;
  value: number;
  approach: { value: number; tc: number } | null;
}

// its level at a time from the start
export function levelAt(automation: readonly Automation[], t: number): number {
  return new Levels(automation).at(t);
}

// When a param's level falls within a floor for good, as Web Audio plays its automation:
//   - its last event's time, where that leaves it within it; its value as it's made, from the start;
//   - a target's, once it comes within it, approaching a level within it;
//   - never where it ends above it.
// Automation as Web Audio holds it (scheduled()): no cancel left in it.
export function fadedFrom(automation: readonly Automation[], floor: number): number {
  const last = automation.at(-1);
  if (!last || last[0] === 'cancel') {
    return -Infinity;
  }
  if (Math.abs(last[1]) > floor) {
    return Infinity;
  }
  if (last[0] === 'value') {
    return -Infinity;
  }
  if (last[0] !== 'target') {
    return last[2];
  }
  const [, value, at, timeConstant] = last;
  const distance = Math.abs(levelAt(automation.slice(0, -1), at) - value);
  const room = floor - Math.abs(value);
  return distance <= room ? at : at + timeConstant * Math.log(distance / room);
}
// A param's levels at rising times, its automation walked once: a line drawn, sampled along it.
// Times asked for never go back; the same time may be asked again.
export class Levels {
  readonly #automation: readonly Automation[];
  #next = 0; // the first event not yet done
  #state: State = { at: 0, value: 0, approach: null };

  constructor(automation: readonly Automation[]) {
    this.#automation = automation;
  }

  // its level at a time: every event by then done
  at(t: number): number {
    this.#walkTo(t, { including: true });
    return this.#levelAt(t);
  }
  // its level coming up to a time: a jump there not yet made, its foot where a line is drawn
  before(t: number): number {
    this.#walkTo(t, { including: false });
    return this.#levelAt(t);
  }

  // every event done by a time, one done at it only if asked; a value always, as the node is made
  #walkTo(t: number, { including }: { including: boolean }): void {
    while (this.#next < this.#automation.length) {
      const event = this.#automation[this.#next]!;
      const next = after(this.#state, event);
      const done = next.at < t || (next.at === t && (including || event[0] === 'value'));
      if (!done) {
        return;
      }
      this.#state = next;
      this.#next++;
    }
  }
  // its level at a time, the events done so far: on the way of the next, or as the last left it
  #levelAt(t: number): number {
    const coming = this.#automation[this.#next];
    if (!coming) {
      return held(this.#state, t);
    }
    return during(this.#state, coming, t);
  }
}

// where the level is once an event is done: a value as it starts, set, a ramp's end, or a target's start, approaching it from there
function after(state: State, event: Automation): State {
  if (event[0] === 'value') {
    return { at: state.at, value: event[1], approach: null };
  }
  if (event[0] === 'cancel') {
    return state; // what's planned after it is gone, so nothing planned follows it
  }
  if (event[0] === 'target') {
    return { at: event[2], value: held(state, event[2]), approach: { value: event[1], tc: event[3] } };
  }
  return { at: event[2], value: event[1], approach: null };
}
// its level before an event is done: on a ramp's way from where it was; else as it was left
function during(state: State, event: Automation, t: number): number {
  if (event[0] === 'linear' || event[0] === 'exp') {
    return ramp(event[0], state, { to: event[1], end: event[2] }, t);
  }
  return held(state, t);
}
// as it was left: held there, or approaching its target
function held({ at, value, approach: target }: State, t: number): number {
  if (!target) {
    return value;
  }
  return approach(value, target.value, t - at, target.tc);
}
// a ramp's level: a straight line, or an exponential one, which holds where it starts from or goes to nothing
function ramp(
  kind: 'linear' | 'exp',
  { at, value }: State,
  { to, end }: { to: number; end: number },
  t: number,
): number {
  const share = (t - at) / (end - at);
  if (kind === 'linear') {
    return value + (to - value) * share;
  }
  if (value * to <= 0) {
    return value;
  }
  return value * Math.pow(to / value, share);
}
