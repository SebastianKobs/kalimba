// ---------- libs/base/params/standard-specs: the standard controls' specs every module shares, each naming its own copy ----------
// A desk's strip, an FX module and a synth's block declare these alike; each spreads one under its own name.
import { frozen } from '../util/index.ts';
import type { RangedSpec, ParamSpec } from './spec.ts';

// a fader's gain, a share shown in dB, by the fader law: unity two thirds up, +6 dB at the top
export const FADER_GAIN: RangedSpec = frozen<RangedSpec>({
  name: 'gain',
  range: [-60, 6, 0.1],
  dB: true,
  taper: 'fader',
});
// a pan: left -1 to right 1, centred at 0, in a line
export const PAN: RangedSpec = frozen<RangedSpec>({ name: 'pan', range: [-1, 1, 0.01] });
// a switch: off 0 or on 1
export const SWITCH: RangedSpec = frozen<RangedSpec>({ name: 'switch', range: [0, 1, 1] });

// whether a param is a switch: off 0 or on 1, nothing between, whatever its name
export function isSwitch({ range }: ParamSpec): boolean {
  const [low, high, step] = range ?? [];
  return low === 0 && high === 1 && step === 1;
}
