// ---------- libs/modular-audio/build/web-audio/param-units: a param in a plan's units, moving Web Audio's ----------
// A node built from several of Web Audio's (a limiter, blocks/limiter.ts) has params in the plan's units, a gain in dB, a ceiling
// in dBFS: each change to one moves the Web Audio params behind it, each by how a value in the plan's units becomes its own

// what a plan's automation moves (automate(), index.ts): a Web Audio param, or a param in a plan's units
export interface Automatable {
  value: number;
  setValueAtTime(value: number, at: number): unknown;
  linearRampToValueAtTime(value: number, at: number): unknown;
  exponentialRampToValueAtTime(value: number, at: number): unknown;
  setTargetAtTime(value: number, at: number, timeConstant: number): unknown;
  cancelScheduledValues(at: number): unknown;
}
// a Web Audio param behind it, and how a value in the plan's units becomes its
type Behind = [param: AudioParam, from: (value: number) => number];

// a param in the plan's units: each change made to every param behind it, in its own. A ramp is made in their units, from the converted
// ends: a glide in dB, made in gain, follows the gain's curve, as the mixer's own glides do
export class ParamInUnits implements Automatable {
  readonly #behind: readonly Behind[];
  #value = 0;

  constructor(behind: readonly Behind[]) {
    this.#behind = behind;
  }
  get value(): number {
    return this.#value;
  }
  // set as it's built: each param behind it told where it isn't already, a filter's detune at 0 left
  set value(value: number) {
    this.#value = value;
    for (const [param, from] of this.#behind) {
      if (param.value !== from(value)) {
        param.value = from(value);
      }
    }
  }
  setValueAtTime(value: number, at: number): this {
    for (const [param, from] of this.#behind) {
      param.setValueAtTime(from(value), at);
    }
    return this;
  }
  linearRampToValueAtTime(value: number, at: number): this {
    for (const [param, from] of this.#behind) {
      param.linearRampToValueAtTime(from(value), at);
    }
    return this;
  }
  exponentialRampToValueAtTime(value: number, at: number): this {
    for (const [param, from] of this.#behind) {
      param.exponentialRampToValueAtTime(from(value), at);
    }
    return this;
  }
  setTargetAtTime(value: number, at: number, timeConstant: number): this {
    for (const [param, from] of this.#behind) {
      param.setTargetAtTime(from(value), at, timeConstant);
    }
    return this;
  }
  cancelScheduledValues(at: number): this {
    for (const [param] of this.#behind) {
      param.cancelScheduledValues(at);
    }
    return this;
  }
}
// A param that holds a number and tells its owner each change, at its time:
//   - set as it's built: at no time;
//   - a ramp or a glide: its value where it lands.
export function toldParam(read: () => number, told: (value: number, at?: number) => void): Automatable {
  return {
    get value() {
      return read();
    },
    set value(value: number) {
      told(value);
    },
    setValueAtTime: (value, at) => told(value, at),
    linearRampToValueAtTime: (value, at) => told(value, at),
    exponentialRampToValueAtTime: (value, at) => told(value, at),
    setTargetAtTime: (value, at) => told(value, at),
    cancelScheduledValues: () => undefined,
  };
}
