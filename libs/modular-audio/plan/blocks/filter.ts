// ---------- plan/blocks/filter: a filter ----------
// Its frequency, by octaves, wide open to start, and its resonance; its type a setting.
// Three types; another added when a sound asks for it.
// Its slope a setting: 12 dB an octave, or 24.
// Its detune, in cents, moving its cutoff as a pitch moves: a sweep in semitones, a cutoff
// following the keys at an offset.
import { TUNE_DETUNE } from './oscillator.ts';
import type { Block } from './block.ts';

// what a builder that builds a filter from biquads needs of it: its type, its resonance where it has one, its slope
export interface FilterStages {
  readonly type: string;
  readonly resonance?: number | undefined;
  readonly slope: string;
}

// its slope, how steeply it cuts past its cutoff, in dB an octave
export const FILTER_SLOPE = { name: 'slope', unit: 'dB/oct', choices: ['12', '24'], default: '12' } as const;
// its resonance, its Q as a plain ratio, as an EQ shows it: 0.707 flat (Butterworth), more a bump at the cutoff;
// by octaves, as a doubling rings as much more at any Q
export const RESONANCE = { name: 'resonance', range: [0.1, 30, 0.001], taper: 'octaves' } as const;

// a flat resonance, Butterworth's: no bump at the cutoff
const FLAT = Math.SQRT1_2;
// a 4th-order Butterworth's two stages' Qs: flat at 24 dB an octave
const BUTTERWORTH_4 = [1 / (2 * Math.cos(Math.PI / 8)), 1 / (2 * Math.cos((3 * Math.PI) / 8))] as const;

// A filter's stages' Qs, for a builder that builds it from biquads, in series:
//   - at 12 dB an octave, one at its resonance; none where it has none, the builder's own;
//   - at 24, two: a lowpass's or a highpass's a 4th-order Butterworth's, flat at a resonance of
//     0.707, its second moved by the resonance as it rises; a bandpass's both at it.
export function biquadQs({ type, resonance, slope }: FilterStages): (number | undefined)[] {
  if (slope !== '24') {
    return [resonance];
  }
  if (type !== 'lowpass' && type !== 'highpass') {
    return [resonance, resonance];
  }
  const [first, second] = BUTTERWORTH_4;
  return [first, (second * (resonance ?? FLAT)) / FLAT];
}

export default {
  kind: 'filter',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [
    { name: 'frequency', unit: 'Hz', range: [20, 24000, 1], default: 24000, taper: 'octaves' },
    { ...RESONANCE, default: 0.707 },
    TUNE_DETUNE,
  ],
  settings: [{ name: 'type', choices: ['lowpass', 'highpass', 'bandpass'], default: 'lowpass' }, FILTER_SLOPE],
} as const satisfies Block;
