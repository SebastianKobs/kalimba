// ---------- build/web-audio/blocks/time-with-sync: a time with a sync switch, moving one param ----------
// Three params side by side, moving one Web Audio param to what they make together:
//   - synced: its note at the beat, turned into seconds by the clock's note values;
//   - free: its ms, or its Hz.
// The param a delay line's time, in seconds, or an oscillator's frequency, in Hz.
// A change to one lands as its event does, now, at a time, ramping or gliding, the param moved
// alike. While synced, a new tempo followed, gliding.
import { timeSeconds } from '../../../../base/params/index.ts';
import { NOTE_VALUES } from '../../../../base/params/index.ts';
import type { When } from '../../../../base/automation/index.ts';
import type { Automatable } from '../param-units.ts';

// a time as its three params hold it: its switch, its note by its index, its free value, and the beat
interface TimeHeld {
  sync: number;
  note: number;
  free: number;
  beat: number;
}

// s: a new tempo glided into, as the FX chains' delay lines do
const TEMPO_GLIDE = 0.3;

export class TimeWithSync {
  readonly #moved: AudioParam;
  readonly #held: TimeHeld;
  readonly #unit: 'ms' | 'Hz';

  constructor(moved: AudioParam, held: TimeHeld, unit: 'ms' | 'Hz') {
    this.#moved = moved;
    this.#held = held;
    this.#unit = unit;
    moved.value = this.#value();
  }
  // one of its three params, as a param is automated
  param(name: 'sync' | 'note' | 'free'): Automatable {
    const moved = this.#moved;
    const held = this.#held;
    const at = (value: number): number => {
      held[name] = value;
      return this.#value();
    };
    return {
      get value() {
        return held[name];
      },
      set value(value: number) {
        moved.value = at(value);
      },
      setValueAtTime: (value, time) => moved.setValueAtTime(at(value), time),
      linearRampToValueAtTime: (value, time) => moved.linearRampToValueAtTime(at(value), time),
      exponentialRampToValueAtTime: (value, time) => moved.exponentialRampToValueAtTime(at(value), time),
      setTargetAtTime: (value, time, constant) => moved.setTargetAtTime(at(value), time, constant),
      cancelScheduledValues: (time) => moved.cancelScheduledValues(time),
    };
  }
  // a new beat: while synced, glided there, by its own glide unless told otherwise; free, left
  tempo(beat: number, { at, glide = at === undefined ? TEMPO_GLIDE : undefined }: When, now: number): void {
    this.#held.beat = beat;
    if (this.#held.sync !== 1) {
      return;
    }
    if (glide !== undefined) {
      this.#moved.setTargetAtTime(this.#value(), now, glide);
      return;
    }
    this.#moved.setValueAtTime(this.#value(), at ?? now);
  }

  // its value, as its params hold it: a time in seconds, or a rate in Hz, free its own
  #value(): number {
    const { sync, note, free, beat } = this.#held;
    if (this.#unit === 'Hz' && sync !== 1) {
      return free;
    }
    const seconds = timeSeconds(
      { sync: sync === 1, note: NOTE_VALUES[note] ?? NOTE_VALUES[0]!, free, unit: this.#unit },
      beat,
    );
    return this.#unit === 'Hz' ? 1 / seconds : seconds;
  }
}
// a time's three params as a block's node holds them, its note by its index
export function timeHeld(sync: unknown, note: unknown, free: unknown, beat: number): TimeHeld {
  return { sync: Number(sync), note: NOTE_VALUES.indexOf(String(note)), free: Number(free), beat };
}
