// ---------- plan/blocks/limiter: a stage that holds the sound under its ceiling ----------
// As Ableton's: its gain into it, in dB; its ceiling, where it acts, in dBFS; its release.
// How it holds there is each builder's.
import type { ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

// its params, by their names: the synth's limiter and the Limiter insert's too
export const LIMITER_SPECS = {
  gain: { name: 'gain', unit: 'dB', range: [-12, 24, 0.1] },
  ceiling: { name: 'ceiling', unit: 'dBFS', range: [-12, 0, 0.1] },
  release: { name: 'release', unit: 's', range: [0.01, 1, 0.01] },
} as const satisfies ParamSpecs;

export default {
  kind: 'limiter',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [LIMITER_SPECS.gain, LIMITER_SPECS.ceiling, LIMITER_SPECS.release],
  settings: [],
} as const satisfies Block;
