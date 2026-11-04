// ---------- libs/base/params/taper: where a param's value lies on a control, a lane or a CC, and back ----------
// A param's taper is its own, declared with it (spec.ts's ParamSpec), as VST3 and AU declare theirs, so a knob, a lane and a
// controller's CC turn a position into a value one way. A position runs 0 at the bottom to 1 at the top.
//   fader: a gain, a share, by the fader law, as a console's and Ableton's: unity two thirds up, +6 dB at the top;
//   octaves: a value on its range, each doubling as far up as the last, as a frequency;
//   line: a value on its range in a straight line, the default; a switch, its step its whole range, lands on its ends.
// A param with choices: a step each, by its index among them, as a controller carries it.
import type { ParamSpec } from './spec.ts';
import { clamp, clamp01 } from '../util/index.ts';

// the fader law's power: gain = top × position^LAW, so a top of 2 puts unity two thirds of the way up
const LAW = Math.log(2) / Math.log(1.5);

// The fader law: a fader's position, 0 to 1, to its gain by dB, not in a straight line. With a top of 2 (+6 dB), unity two thirds of the
// way up, a third of the way about -10 dB, the bottom silence; with a top of 1, unity at the top, the same curve below it.
export function faderGain(position: number, top = 2): number {
  return top * position ** LAW;
}
export function faderPosition(gain: number, top = 2): number {
  return Math.min(1, (gain / top) ** (1 / LAW));
}
// Where a value lies on its param's control, by its taper, held to its range.
export function positionOf(spec: ParamSpec, value: number): number {
  if (spec.taper === 'fader') {
    return faderPosition(Math.max(0, value));
  }
  const [low, high] = rangeOf(spec);
  const within = clamp(value, low, high);
  if (spec.taper === 'octaves') {
    return Math.log(within / low) / Math.log(high / low);
  }
  return (within - low) / (high - low);
}
// The value a position on its param's control stands for, by its taper; a switch's on one of its ends.
export function valueAt(spec: ParamSpec, position: number): number {
  const along = clamp01(position);
  if (spec.taper === 'fader') {
    return faderGain(along);
  }
  const [low, high, step] = rangeOf(spec);
  if (spec.taper === 'octaves') {
    return low * (high / low) ** along;
  }
  const value = low + along * (high - low);
  if (spec.choices) {
    return Math.round(value); // a choice's index: the nearest
  }
  if (step >= high - low) {
    return Math.round(along) === 0 ? low : high; // a switch
  }
  return value;
}
// a param's range on its control: its own; a choice's, its indices, a step each
function rangeOf(spec: ParamSpec): readonly [low: number, high: number, step: number] {
  if (spec.choices) {
    return [0, spec.choices.length - 1, 1];
  }
  return spec.range!; // a param on a control has its range or its choices
}
