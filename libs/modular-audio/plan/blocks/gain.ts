// ---------- plan/blocks/gain: a level ----------
// Its gain, a share: 1 as it comes, 2 twice as loud; shown in dB by the fader law, as a fader's.
import { FADER_GAIN } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

export default {
  kind: 'gain',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [{ ...FADER_GAIN, unit: 'dB', default: 1 }],
  settings: [],
} as const satisfies Block;
